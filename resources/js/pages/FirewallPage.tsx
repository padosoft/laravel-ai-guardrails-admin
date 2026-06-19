import { ChevronRight, Shield, ShieldOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Badge } from '../components/Badge';
import { Chips } from '../components/Chips';
import { DataTable, type Column } from '../components/DataTable';
import { Drawer } from '../components/Drawer';
import { SaveBar } from '../components/SaveBar';
import { ScreenState, useScreenState } from '../components/ScreenState';
import { Toggle } from '../components/Toggle';
import type { FirewallRejection } from '../lib/api/types';
import { useFirewall, useSettings, useUpdateSettings } from '../lib/queries';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queries';

// ── Reason badge ─────────────────────────────────────────────────────────────
// Derive reason kind from the violation keys/values.
// "authorization" = key-rescoping (owner key overwritten)
// "schema" = unknown/invalid argument

function deriveReasonKind(violations: Record<string, string>): 'authorization' | 'schema' {
  const vals = Object.values(violations).join(' ').toLowerCase();
  if (vals.includes('overwrite') || vals.includes('principal') || vals.includes('owner')) {
    return 'authorization';
  }
  return 'schema';
}

// ── Relative time ─────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Firewall settings shape ───────────────────────────────────────────────────

interface FirewallPosture {
  enabled: boolean;
  owner_keys: string[];
  reject_unknown_arguments: boolean;
}

interface ToolAuthorizationReadout {
  enabled: boolean;
  owner_key_depth: number | string;
  destructive_match: string;
}

function extractFirewallPosture(settings: Record<string, unknown>): FirewallPosture {
  const tf = (settings.tool_firewall ?? {}) as Record<string, unknown>;
  return {
    enabled: Boolean(tf.enabled),
    owner_keys: Array.isArray(tf.owner_keys) ? (tf.owner_keys as string[]) : [],
    reject_unknown_arguments: Boolean(tf.reject_unknown_arguments),
  };
}

function extractToolAuthorization(settings: Record<string, unknown>): ToolAuthorizationReadout {
  const ta = (settings.tool_authorization ?? {}) as Record<string, unknown>;
  return {
    enabled: Boolean(ta.enabled),
    owner_key_depth: (ta.owner_key_depth as number | string) ?? '—',
    destructive_match: (ta.destructive_match as string) ?? '—',
  };
}

// ── KV list ──────────────────────────────────────────────────────────────────

function KV({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="kv">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

// ── Rejection drawer ──────────────────────────────────────────────────────────

function RejectionDrawer({ entry, onClose }: { entry: FirewallRejection; onClose: () => void }) {
  const kind = deriveReasonKind(entry.violations);
  return (
    <Drawer
      title={`Rejection · ${entry.tool}`}
      sub={`${entry.occurred_at} UTC · principal ${entry.principal_id ?? '—'}`}
      badge={
        <Badge variant={kind === 'authorization' ? 'warn' : 'observe'}>
          {kind}
        </Badge>
      }
      onClose={onClose}
    >
      <div className="section-label" style={{ margin: '0 0 8px' }}>Violations</div>
      <div className="code-block">
        {Object.entries(entry.violations).map(([k, v]) => (
          <div key={k}>
            <span style={{ color: 'var(--color-block)' }}>{k}</span>: {v}
          </div>
        ))}
      </div>
    </Drawer>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function FirewallPage() {
  const queryClient = useQueryClient();

  const { data: firewallData, isLoading: fwLoading, isError: fwError } = useFirewall();
  const { data: settingsData, isLoading: stLoading, isError: stError } = useSettings();
  const { mutateAsync: updateSettings } = useUpdateSettings();

  // ── Local edit state seeded from server ──────────────────────────────────
  const [localPosture, setLocalPosture] = useState<FirewallPosture | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<FirewallRejection | null>(null);

  const serverPosture = settingsData
    ? extractFirewallPosture(settingsData.settings)
    : null;

  // Seed local state from server on initial load only.
  // After the first seed, local state is authoritative until the user Discards or Save
  // completes — we never clobber in-flight edits from a background refetch.
  useEffect(() => {
    if (serverPosture && localPosture === null) {
      setLocalPosture({ ...serverPosture });
    }
    // localPosture intentionally excluded: we only want to react to the server data arriving.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsData]);

  // ── Dirty check ──────────────────────────────────────────────────────────
  // Compare local state vs server state field by field
  function computeDirty(local: FirewallPosture, server: FirewallPosture): boolean {
    if (local.enabled !== server.enabled) return true;
    if (local.reject_unknown_arguments !== server.reject_unknown_arguments) return true;
    if (local.owner_keys.length !== server.owner_keys.length) return true;
    // Order-insensitive comparison (multiset equality): remove-then-re-add the same set
    // of keys in a different order must not leave dirty=true.
    // (We still SEND the array in the user's chosen order on Save.)
    const localSorted = [...local.owner_keys].sort();
    const serverSorted = [...server.owner_keys].sort();
    if (localSorted.some((k, i) => k !== serverSorted[i])) return true;
    return false;
  }

  const dirty =
    localPosture != null && serverPosture != null
      ? computeDirty(localPosture, serverPosture)
      : false;

  // ── Compute only-changed keys for PUT ────────────────────────────────────
  function changedKeys(local: FirewallPosture, server: FirewallPosture): Record<string, unknown> {
    const patch: Record<string, unknown> = {};
    if (local.enabled !== server.enabled) {
      patch['tool_firewall.enabled'] = local.enabled;
    }
    if (local.reject_unknown_arguments !== server.reject_unknown_arguments) {
      patch['tool_firewall.reject_unknown_arguments'] = local.reject_unknown_arguments;
    }
    const localSorted = [...local.owner_keys].sort();
    const serverSorted = [...server.owner_keys].sort();
    const keysChanged =
      local.owner_keys.length !== server.owner_keys.length ||
      localSorted.some((k, i) => k !== serverSorted[i]);
    if (keysChanged) {
      patch['tool_firewall.owner_keys'] = local.owner_keys;
    }
    return patch;
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  // Race-free seed-on-save: we seed local state directly from the server-confirmed
  // response (the PUT /settings response returns the full updated {settings:{...}}).
  // We do NOT null localPosture and rely on a re-seed effect, because an edit made
  // between PUT-resolve and refetch would be clobbered.
  async function handleSave() {
    if (!localPosture || !serverPosture) return;
    setSaving(true);
    setSaveError(null);
    try {
      const patch = changedKeys(localPosture, serverPosture);
      const confirmed = await updateSettings({ settings: patch });
      // Seed local edit state from the SERVER-CONFIRMED response so no race is possible.
      // Background-invalidate the cache so other data consumers stay fresh.
      if (confirmed?.settings) {
        setLocalPosture(extractFirewallPosture(confirmed.settings));
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings() });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const msg =
        e?.response?.data?.errors
          ? Object.values(e.response.data.errors).flat().join('; ')
          : e?.response?.data?.message ?? 'Save failed.';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }

  // ── Discard ──────────────────────────────────────────────────────────────
  function handleDiscard() {
    if (serverPosture) {
      setLocalPosture({ ...serverPosture });
    }
    setSaveError(null);
  }

  // ── Screen state ─────────────────────────────────────────────────────────
  const entries = firewallData?.entries ?? [];
  const state = useScreenState({
    isLoading: (fwLoading || stLoading) && entries.length === 0 && !settingsData,
    isError: stError || fwError,
    isEmpty: false,
  });

  // ── Columns ──────────────────────────────────────────────────────────────
  const columns: Column<FirewallRejection>[] = [
    {
      key: 'tool',
      header: 'Tool',
      width: 140,
      render: (r) => <span className="cell-mono">{r.tool}</span>,
    },
    {
      key: 'reason',
      header: 'Reason',
      width: 124,
      render: (r) => {
        const kind = deriveReasonKind(r.violations);
        return (
          <Badge variant={kind === 'authorization' ? 'warn' : 'observe'}>
            {kind}
          </Badge>
        );
      },
    },
    {
      key: 'violations',
      header: 'Violations',
      render: (r) => (
        <span className="cell-muted" style={{ fontSize: 12.5 }}>
          {Object.values(r.violations)[0]}
        </span>
      ),
    },
    {
      key: 'principal_id',
      header: 'Principal',
      width: 84,
      render: (r) => <span className="cell-mono">{r.principal_id ?? '—'}</span>,
    },
    {
      key: 'occurred_at',
      header: 'When',
      width: 86,
      render: (r) => <span className="cell-when">{relativeTime(r.occurred_at)}</span>,
    },
    {
      key: 'arrow',
      header: '',
      width: 28,
      render: () => (
        <span className="row-arrow">
          <ChevronRight size={15} />
        </span>
      ),
    },
  ];

  const toolAuth = settingsData
    ? extractToolAuthorization(settingsData.settings)
    : null;

  const firewallEnabled = localPosture?.enabled ?? false;

  return (
    <div className="page" data-screen-label="Tool Firewall">
      {/* Page header */}
      <div className="page-head">
        <div className="ph-text">
          <h1 className="screen-title">
            {firewallEnabled ? <Shield size={19} /> : <ShieldOff size={19} />}
            Tool Firewall
          </h1>
          <p className="screen-subtitle">
            Re-scopes model-chosen tool arguments to the authenticated user and validates them
            against each tool's schema. Closes confused-deputy / IDOR vectors server-side.
          </p>
        </div>
        <div className="ph-actions">
          <Badge
            variant={firewallEnabled ? 'allow' : 'neutral'}
            testId="agr-status-badge"
          >
            {firewallEnabled ? 'ENGAGED' : 'DISABLED'}
          </Badge>
        </div>
      </div>

      <ScreenState
        testId="agr-firewall"
        state={state}
        error={null}
        empty="No data yet."
      >
        <>
          {/* Posture panel */}
          <div className="section-label" style={{ margin: '22px 0 11px' }}>Posture</div>
          <div className="panel panel-pad">
            <div className="flex col gap-20">
              {localPosture && (
                <>
                  <Toggle
                    name="Firewall enabled"
                    hint="Master switch for argument re-scoping + schema validation."
                    on={localPosture.enabled}
                    onChange={(v) =>
                      setLocalPosture((p) => p ? { ...p, enabled: v } : p)
                    }
                  />
                  <div style={{ borderTop: '1px solid var(--color-border)' }} />
                  <div>
                    <div className="toggle-label" style={{ marginBottom: 14 }}>
                      <div className="tl-name">Owner keys</div>
                      <div className="tl-hint">
                        Argument keys the model may never choose — overwritten with the
                        authenticated principal id.
                      </div>
                    </div>
                    <Chips
                      values={localPosture.owner_keys}
                      addLabel="Add owner key"
                      onRemove={(k) =>
                        setLocalPosture((p) =>
                          p ? { ...p, owner_keys: p.owner_keys.filter((x) => x !== k) } : p,
                        )
                      }
                      onAdd={(k) =>
                        setLocalPosture((p) =>
                          p
                            ? { ...p, owner_keys: [...new Set([...p.owner_keys, k])] }
                            : p,
                        )
                      }
                    />
                  </div>
                  <div style={{ borderTop: '1px solid var(--color-border)' }} />
                  <Toggle
                    name="Reject unknown arguments"
                    hint="Refuse any argument not declared in the tool's JSON schema (untrusted-input posture)."
                    on={localPosture.reject_unknown_arguments}
                    onChange={(v) =>
                      setLocalPosture((p) => p ? { ...p, reject_unknown_arguments: v } : p)
                    }
                  />
                </>
              )}
            </div>
          </div>

          {/* Tool authorization (read-only) */}
          <div className="section-label" style={{ margin: '22px 0 11px' }}>Tool authorization</div>
          <div className="panel panel-pad" data-testid="agr-tool-authorization">
            <div className="flex items-center justify-between gap-16 wrap">
              <div className="toggle-label">
                <div className="tl-name flex items-center gap-8">
                  Authorization layer
                  {toolAuth && (
                    <Badge variant={toolAuth.enabled ? 'allow' : 'neutral'}>
                      {toolAuth.enabled ? 'ON' : 'OFF'}
                    </Badge>
                  )}
                </div>
                <div className="tl-hint">Read-only here — edited on Settings · Tool authorization.</div>
              </div>
              {toolAuth && (
                <KV
                  items={[
                    ['owner_key_depth', String(toolAuth.owner_key_depth)],
                    ['destructive_match', toolAuth.destructive_match],
                  ]}
                />
              )}
            </div>
          </div>

          {/* Rejections table */}
          <div className="section-label" style={{ margin: '22px 0 11px' }}>
            Rejections · {entries.length} shown
          </div>
          <div className="panel">
            {entries.length === 0 ? (
              <div
                className="state-empty"
                data-testid="agr-rejections-empty"
                style={{ padding: 24, textAlign: 'center' }}
              >
                No tool-argument rejections — every tool call passed schema validation and was
                correctly scoped to its principal.
              </div>
            ) : (
              <DataTable
                columns={columns}
                rows={entries}
                onRowClick={(r) => setSelectedEntry(r)}
                rowTestId="agr-firewall-row"
              />
            )}
          </div>
        </>
      </ScreenState>

      {/* Sticky save bar */}
      <SaveBar
        dirty={dirty}
        saving={saving}
        error={saveError}
        onSave={handleSave}
        onDiscard={handleDiscard}
        message="You have unsaved firewall changes."
      />

      {/* Rejection detail drawer */}
      {selectedEntry && (
        <RejectionDrawer entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}
    </div>
  );
}
