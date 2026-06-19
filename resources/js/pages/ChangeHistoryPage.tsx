import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Settings, Bolt, User, ChevronRight } from 'lucide-react';
import { DataTable, type Column } from '../components/DataTable';
import { ScreenState, useScreenState } from '../components/ScreenState';
import { useSettingsChanges } from '../lib/queries';
import type { SettingsChangeRow } from '../lib/api/types';

const SERVER_MAX = 200;
const PAGE_SIZE = 50;

function displayValue(v: unknown): string {
  if (v === null || v === undefined) return '(unset)';
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

// ── Relative time (fixed 'en' locale for determinism) ─────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ActorCell({ actorId }: { actorId: string | null }) {
  const isSystem = !actorId;
  return (
    <span className="flex items-center gap-8">
      {isSystem ? <Bolt size={13} /> : <User size={13} />}
      <span style={{ fontSize: 12.5 }}>{isSystem ? 'system' : actorId}</span>
    </span>
  );
}

function DiffCell({ oldValue, newValue }: { oldValue: unknown; newValue: unknown }) {
  const oldNull = oldValue === null || oldValue === undefined;
  const oldText = oldNull ? '(unset)' : displayValue(oldValue);
  const newText = displayValue(newValue);

  return (
    <span className="flex items-center gap-8 wrap">
      <span
        data-testid="agr-old-value"
        className="chip mono"
        style={{
          background: 'color-mix(in srgb, var(--color-block, #dc2626) 12%, transparent)',
          borderColor: 'transparent',
          color: 'var(--color-block, #dc2626)',
        }}
      >
        {oldText}
      </span>
      <ChevronRight size={13} />
      <span
        data-testid="agr-new-value"
        className="chip mono"
        style={{
          background: 'color-mix(in srgb, var(--color-allow, #16a34a) 14%, transparent)',
          borderColor: 'transparent',
          color: 'var(--color-allow, #16a34a)',
        }}
      >
        {newText}
      </span>
    </span>
  );
}

const columns: Column<SettingsChangeRow>[] = [
  {
    key: 'actor',
    header: 'Actor',
    width: 220,
    render: (r) => <ActorCell actorId={r.actor_id} />,
  },
  {
    key: 'key',
    header: 'Key',
    width: 220,
    render: (r) => <span className="cell-mono">{r.key}</span>,
  },
  {
    key: 'diff',
    header: 'Change',
    render: (r) => <DiffCell oldValue={r.old_value} newValue={r.new_value} />,
  },
  {
    key: 'when',
    header: 'When',
    width: 90,
    render: (r) => (
      <span className="cell-when" title={r.occurred_at}>
        {relativeTime(r.occurred_at)}
      </span>
    ),
  },
];

export function ChangeHistoryPage() {
  const navigate = useNavigate();
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data, isLoading, isError, error } = useSettingsChanges(limit);
  const changes: SettingsChangeRow[] = data?.changes ?? [];

  const hasMore = changes.length >= limit && limit < SERVER_MAX;

  const state = useScreenState({
    isLoading: isLoading && !data,
    isError,
    isEmpty: !isLoading && !isError && changes.length === 0,
  });

  return (
    <div className="page" data-screen-label="Settings Change History">
      <div className="page-head">
        <div className="ph-text">
          <h1 className="screen-title">
            <History size={19} />
            Settings Change History
          </h1>
          <p className="screen-subtitle">
            Append-only record of every configuration mutation — who changed which guardrail
            setting, from what to what, and when. Closes the &ldquo;who silently disabled a
            control&rdquo; loop.
          </p>
        </div>
        <div className="ph-actions">
          <button
            type="button"
            className="btn btn-sm"
            data-testid="agr-back-to-settings"
            onClick={() => navigate('/settings')}
          >
            <Settings size={14} /> Back to Settings
          </button>
        </div>
      </div>

      <ScreenState
        testId="agr-change-history"
        state={state}
        error={error}
        empty="No configuration changes recorded"
      >
        <div className="panel">
          <DataTable columns={columns} rows={changes} rowTestId="agr-change-row" />
          {hasMore && (
            <div
              style={{
                padding: 14,
                textAlign: 'center',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <button
                type="button"
                className="btn btn-sm"
                data-testid="agr-load-more"
                onClick={() => setLimit((l) => Math.min(l + PAGE_SIZE, SERVER_MAX))}
              >
                Load more
              </button>
            </div>
          )}
        </div>
      </ScreenState>
    </div>
  );
}
