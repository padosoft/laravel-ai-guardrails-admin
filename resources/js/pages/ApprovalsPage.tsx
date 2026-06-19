// SECURITY NOTE: This page deliberately diverges from the prototype's "Token" KV row.
// Approval tokens are hashed in the DB and never returned by the API. The operator
// receives the plaintext token out-of-band via the DestructiveToolRouted event.
// To approve/reject, the operator must paste their token into the confirm drawer.
// This is a deliberate second factor: a compromised admin panel cannot auto-approve
// without the token the operator holds. See docs/approvals-token-security.md.

import { AlertTriangle, Check, Gavel, X } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Banner } from '../components/Banner';
import { DataTable, type Column } from '../components/DataTable';
import { Drawer } from '../components/Drawer';
import { ScreenState, useScreenState } from '../components/ScreenState';
import type { ApprovalItem } from '../lib/api/types';
import { queryKeys, useApprovals, useApprove, useReject } from '../lib/queries';

// ── Arg preview ────────────────────────────────────────────────────────────────

function argPreview(args: Record<string, unknown>): string {
  const s = JSON.stringify(args);
  return s.length > 48 ? s.slice(0, 47) + '…}' : s;
}

// ── KV list ───────────────────────────────────────────────────────────────────

function KV({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="kv">
      {items.map(([k, v], i) => (
        <div key={i}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────

interface DetailDrawerProps {
  item: ApprovalItem;
  onClose: () => void;
  onApprove: (item: ApprovalItem) => void;
  onReject: (item: ApprovalItem) => void;
}

function DetailDrawer({ item, onClose, onApprove, onReject }: DetailDrawerProps) {
  return (
    <Drawer
      title={`Approve · ${item.tool}`}
      sub={`requested ${item.requested_ago} · expires ${item.expires_in}`}
      onClose={onClose}
      footer={
        <>
          <button
            className="btn btn-allow grow"
            onClick={() => onApprove(item)}
            aria-label={`Approve ${item.tool}`}
          >
            <Check size={15} /> Approve
          </button>
          <button
            className="btn btn-block grow"
            onClick={() => onReject(item)}
            aria-label={`Reject ${item.tool}`}
          >
            <X size={15} /> Reject
          </button>
        </>
      }
    >
      <KV
        items={[
          ['Tool', <span className="cell-mono">{item.tool}</span>],
          // Token is NOT shown here — it is never returned by the API (hashed in DB).
          // The operator supplies the token at confirm time from their out-of-band notification.
          ['Token', <span className="subtle">supplied at confirm time</span>],
          ['Run ID', <span className="cell-mono">{item.run_id}</span>],
          ['Requested', item.created_at ? `${item.created_at} UTC` : item.requested_ago],
          ['Expires', item.expires_at ? `${item.expires_at} UTC` : (item.expires_in ?? '—')],
        ]}
      />
      <div className="section-label" style={{ margin: '20px 0 8px' }}>
        Scoped arguments
      </div>
      <pre className="code-block" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {JSON.stringify(item.arguments, null, 2)}
      </pre>
      <Banner kind="warn">
        This is a <b>destructive</b> action. Approving resumes the parked flow run and executes
        the tool with exactly these arguments.
      </Banner>
    </Drawer>
  );
}

// ── Confirm Drawer ────────────────────────────────────────────────────────────

type ConfirmAction = 'approve' | 'reject';

interface ConfirmState {
  item: ApprovalItem;
  action: ConfirmAction;
}

interface ConfirmDrawerProps {
  confirm: ConfirmState;
  onClose: () => void;
  onSuccess: () => void;
  onHitlUnavailable: () => void;
}

function ConfirmDrawer({ confirm, onClose, onSuccess, onHitlUnavailable }: ConfirmDrawerProps) {
  const [token, setToken] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const approveMutation = useApprove();
  const rejectMutation = useReject();

  const { item, action } = confirm;

  async function handleSubmit() {
    if (!token.trim()) {
      setTokenError('Please enter the approval token from your notification.');
      return;
    }
    setSubmitting(true);
    setTokenError(null);

    try {
      const result =
        action === 'approve'
          ? await approveMutation.mutateAsync(token.trim())
          : await rejectMutation.mutateAsync(token.trim());

      if (result.decision === 'approved' || result.decision === 'rejected') {
        onSuccess();
      } else if (result.decision === 'unavailable') {
        onHitlUnavailable();
        onClose();
      } else {
        // decision === 'failed' — invalid/expired/consumed token
        setTokenError('Invalid or expired token. Please check your notification and try again.');
        setSubmitting(false);
      }
    } catch (err: unknown) {
      // Axios throws on 409 (hitl_unavailable) and 422 (decision_failed) — inspect status.
      const status = (err as { status?: number })?.status ?? null;
      if (status === 409) {
        // HITL bridge unavailable
        onHitlUnavailable();
        onClose();
      } else if (status === 422) {
        // Invalid / expired / already-consumed token
        setTokenError('Invalid or expired token. Please check your notification and try again.');
        setSubmitting(false);
      } else {
        setTokenError('Request failed. Please check the token and try again.');
        setSubmitting(false);
      }
    }
  }

  return (
    <div data-testid="agr-confirm-drawer">
      <Drawer
        title={action === 'approve' ? 'Confirm approval' : 'Confirm rejection'}
        sub={item.tool}
        onClose={onClose}
        footer={
          <>
            <button className="btn btn-ghost grow" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              data-testid={action === 'approve' ? 'agr-confirm-approve' : 'agr-confirm-reject'}
              className={`btn grow ${action === 'approve' ? 'btn-allow' : 'btn-block'}`}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {action === 'approve' ? 'Yes, approve & run' : 'Yes, reject & halt'}
            </button>
          </>
        }
      >
        <p style={{ fontSize: 14, lineHeight: 1.6 }}>
          {action === 'approve'
            ? 'The flow run will resume and the tool will execute with its scoped arguments. This cannot be undone.'
            : 'The flow run will be halted and the destructive action will not run. The rejection is recorded in the audit trail.'}
        </p>

        <div style={{ marginTop: 16 }}>
          <label
            htmlFor="agr-token-field"
            style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}
          >
            Approval token
          </label>
          <p style={{ fontSize: 12.5, color: 'var(--color-fg-subtle)', marginBottom: 8 }}>
            Paste the approval token from your notification to act on this request.
          </p>
          <input
            id="agr-token-field"
            data-testid="agr-token-input"
            className="input mono"
            style={{ width: '100%' }}
            type="text"
            placeholder="paste token here…"
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              if (tokenError) setTokenError(null);
            }}
            autoComplete="off"
            spellCheck={false}
          />
          {tokenError && (
            <div
              data-testid="agr-token-error"
              style={{
                marginTop: 6,
                fontSize: 12.5,
                color: 'var(--color-danger, #dc2626)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <AlertTriangle size={13} />
              {tokenError}
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ApprovalsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useApprovals();
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [hitlUnavailable, setHitlUnavailable] = useState(false);

  // DataTable requires `id: number | string` — map approval_id to id.
  const pending = (data?.pending ?? []).map((item) => ({ ...item, id: item.approval_id }));

  const state = useScreenState({
    isLoading,
    isError,
    isEmpty: !isLoading && !isError && pending.length === 0,
  });

  function openApprove(item: ApprovalItem) {
    setSelectedItem(null);
    setConfirm({ item, action: 'approve' });
  }

  function openReject(item: ApprovalItem) {
    setSelectedItem(null);
    setConfirm({ item, action: 'reject' });
  }

  function handleConfirmSuccess() {
    setConfirm(null);
    setSelectedItem(null);
    queryClient.invalidateQueries({ queryKey: queryKeys.approvals() });
  }

  function handleHitlUnavailable() {
    setHitlUnavailable(true);
  }

  type PendingRow = ApprovalItem & { id: string };
  const columns: Column<PendingRow>[] = [
    {
      key: 'tool',
      header: 'Tool',
      width: 140,
      render: (r) => <span className="cell-mono">{r.tool}</span>,
    },
    {
      key: 'arguments',
      header: 'Arguments (scoped)',
      render: (r) => (
        <span className="cell-prompt" style={{ maxWidth: 260 }}>
          {argPreview(r.arguments)}
        </span>
      ),
    },
    {
      key: 'requested_ago',
      header: 'Requested',
      width: 110,
      render: (r) => <span className="cell-when">{r.requested_ago}</span>,
    },
    {
      key: 'expires_in',
      header: 'Expires',
      width: 100,
      render: (r) => <span className="cell-when">{r.expires_in ?? '—'}</span>,
    },
    {
      key: 'action',
      header: 'Action',
      width: 110,
      render: (r) => (
        <div
          className="flex gap-6"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <button
            className="btn btn-sm btn-allow"
            onClick={() => openApprove(r)}
            aria-label={`Approve ${r.tool}`}
          >
            <Check size={14} />
          </button>
          <button
            className="btn btn-sm btn-block"
            onClick={() => openReject(r)}
            aria-label={`Reject ${r.tool}`}
          >
            <X size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page" data-screen-label="Approvals">
      <div className="page-head">
        <div className="ph-text">
          <h1 className="screen-title">
            <Gavel size={19} />
            Approvals · HITL Bridge
          </h1>
          <p className="screen-subtitle">
            Destructive tool calls parked by laravel-flow, awaiting a human decision before they run.
          </p>
        </div>
      </div>

      {hitlUnavailable && (
        <div style={{ marginBottom: 16 }}>
          <Banner kind="warn" testId="agr-hitl-unavailable-banner">
            <b>HITL bridge inactive</b> — laravel-flow is not installed or the bridge is disabled.
            Destructive calls cannot be approved via this panel while the bridge is unavailable.
          </Banner>
        </div>
      )}

      <ScreenState
        testId="agr-approvals"
        state={state}
        error={error}
        empty="The queue is clear. Destructive tool calls will appear here for review."
      >
        <div className="panel">
          <DataTable
            columns={columns}
            rows={pending}
            onRowClick={(r) => setSelectedItem({ ...r })}
            rowTestId="agr-approval-row"
          />
        </div>
      </ScreenState>

      {/* Detail drawer */}
      {selectedItem != null && confirm == null && (
        <DetailDrawer
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onApprove={openApprove}
          onReject={openReject}
        />
      )}

      {/* Confirm drawer (token-gated) */}
      {confirm != null && (
        <ConfirmDrawer
          confirm={confirm}
          onClose={() => setConfirm(null)}
          onSuccess={handleConfirmSuccess}
          onHitlUnavailable={handleHitlUnavailable}
        />
      )}
    </div>
  );
}
