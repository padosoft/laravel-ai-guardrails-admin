import { ChevronRight, FileWarning, ShieldOff } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../components/Badge';
import { DataTable, type Column } from '../components/DataTable';
import { Drawer } from '../components/Drawer';
import { ScreenState, useScreenState } from '../components/ScreenState';
import type { GatedToolCall, ProvenanceTier } from '../lib/api/types';
import { useOverview, useProvenance } from '../lib/queries';

// ── Relative time ────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TIER_LABEL: Record<ProvenanceTier, string> = {
  trusted_internal: 'internal',
  untrusted_external: 'external',
  machine_generated: 'machine',
};

// ── Filter ───────────────────────────────────────────────────────────────────

type Scope = 'all' | 'refused' | 'observed';

// `undefined` is deliberately different from `false` here: it means "no
// filter", where false means "only the ones that RAN". Collapsing the two
// would make the Observed tab silently show everything.
const SCOPE_TO_BLOCKED: Record<Scope, boolean | undefined> = {
  all: undefined,
  refused: true,
  observed: false,
};

// ── Detail drawer ────────────────────────────────────────────────────────────

function GatedCallDrawer({ entry, onClose }: { entry: GatedToolCall; onClose: () => void }) {
  return (
    <Drawer
      title={`${entry.blocked ? 'Refused' : 'Observed'} · ${entry.tool}`}
      sub={`${entry.occurred_at} UTC · principal ${entry.principal_id ?? '—'}`}
      badge={<Badge variant={entry.blocked ? 'block' : 'observe'}>{entry.blocked ? 'refused' : 'ran'}</Badge>}
      onClose={onClose}
    >
      <div className="section-label" style={{ margin: '0 0 8px' }}>Grounding provenance</div>
      <div className="code-block">
        {entry.tiers.map((tier) => (
          <div key={tier}>{tier}</div>
        ))}
      </div>
      <p className="screen-subtitle" style={{ marginTop: 14 }}>
        {entry.blocked
          ? 'The model decided to call this tool while reading material authored outside your organisation, and the gate refused it.'
          : 'Monitor mode: the call RAN. Under enforcement it would have been refused.'}
      </p>
      {/* No arguments here, and not because they were not fetched: the API
          does not carry them. They are the model's — which is to say
          possibly the attacker's — and this panel is not where they belong. */}
      <p className="screen-subtitle" style={{ marginTop: 10 }}>
        Tool arguments are deliberately not recorded.
      </p>
    </Drawer>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function ProvenancePage() {
  const [scope, setScope] = useState<Scope>('all');
  const [selected, setSelected] = useState<GatedToolCall | null>(null);

  const { data, isLoading, isError } = useProvenance({ blocked: SCOPE_TO_BLOCKED[scope] });
  const { data: overview } = useOverview();

  const control = overview?.controls.find((c) => c.key === 'provenance');
  const entries = data?.entries ?? [];

  const state = useScreenState({
    isLoading: isLoading && entries.length === 0,
    isError,
    isEmpty: entries.length === 0,
  });

  const columns: Column<GatedToolCall>[] = [
    {
      key: 'tool',
      header: 'Tool',
      width: 160,
      render: (r) => <span className="cell-mono">{r.tool}</span>,
    },
    {
      key: 'blocked',
      header: 'Outcome',
      width: 110,
      render: (r) => (
        <Badge variant={r.blocked ? 'block' : 'observe'}>{r.blocked ? 'refused' : 'ran'}</Badge>
      ),
    },
    {
      key: 'tiers',
      header: 'Grounding',
      render: (r) => (
        <span className="cell-muted" style={{ fontSize: 12.5 }}>
          {r.tiers.map((t) => TIER_LABEL[t] ?? t).join(', ')}
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

  const enabled = control?.enabled ?? false;

  return (
    <div className="page" data-screen-label="Provenance Gate">
      <div className="page-head">
        <div className="ph-text">
          <h1 className="screen-title">
            {enabled ? <FileWarning size={19} /> : <ShieldOff size={19} />}
            Provenance Gate
          </h1>
          <p className="screen-subtitle">
            The HITL bridge asks <em>which tool</em>. This asks <em>what the model was reading
            when it decided to call one</em> — a call grounded in material nobody here wrote is
            refused, whatever the tool.
          </p>
        </div>
        <div className="ph-actions">
          <Badge variant={enabled ? 'allow' : 'neutral'} testId="agr-status-badge">
            {control?.posture?.toUpperCase() ?? 'DISABLED'}
          </Badge>
        </div>
      </div>

      {/* The monitor-rollout affordance, and the reason this page exists.
          An operator turns the gate on in `monitor`, watches Observed for a
          week, and only then enforces. */}
      <div className="section-label" style={{ margin: '22px 0 11px' }}>Scope</div>
      <div className="tabs" role="tablist" data-testid="agr-provenance-scope">
        {(['all', 'refused', 'observed'] as Scope[]).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={scope === s}
            className={scope === s ? 'tab tab-active' : 'tab'}
            onClick={() => setScope(s)}
            data-testid={`agr-provenance-scope-${s}`}
          >
            {s === 'observed' ? 'Would have been refused' : s === 'refused' ? 'Refused' : 'All'}
          </button>
        ))}
      </div>

      <ScreenState
        testId="agr-provenance"
        state={state}
        error={null}
        empty={
          enabled
            ? 'No gated calls recorded. Either nothing was grounded in external content, or the decision log is off (provenance_log.store).'
            : 'Control P is disabled. Enable it in monitor mode first to see what it would refuse.'
        }
      >
        <>
          <div className="section-label" style={{ margin: '22px 0 11px' }}>Decisions</div>
          <DataTable
            columns={columns}
            rows={entries}
            onRowClick={setSelected}
            rowTestId="agr-provenance-row"
          />
        </>
      </ScreenState>

      {selected && <GatedCallDrawer entry={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
