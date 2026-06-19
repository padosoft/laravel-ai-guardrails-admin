import { AlertTriangle, ChevronRight, Eye, EyeOff, Hash, List, Lock, ShieldCheck } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Badge } from '../components/Badge';
import { DataTable, type Column } from '../components/DataTable';
import { Drawer } from '../components/Drawer';
import { ScreenState, useScreenState } from '../components/ScreenState';
import type { AuditDetail, AuditFilters, AuditSummary } from '../lib/api/types';
import { useAuditDetail, useAuditList } from '../lib/queries';

// ── Verdict derivation (client-side) ────────────────────────────────────────
// Blocked  = blocked === true
// Observed = blocked === false && rule_id != null  (monitor-mode match)
// Allowed  = blocked === false && rule_id == null
// Errored  = errored === true (surfaced in addition to the above)

type VerdictKind = 'blocked' | 'observed' | 'allowed' | 'errored';

function deriveVerdict(entry: Pick<AuditSummary, 'blocked' | 'rule_id' | 'errored'>): VerdictKind {
  if (entry.errored) return 'errored';
  if (entry.blocked) return 'blocked';
  if (entry.rule_id != null) return 'observed';
  return 'allowed';
}

// ── Verdict filter → API mapping ─────────────────────────────────────────────
// 'blocked'  → blocked=true
// 'observed' → blocked=false  (server returns both observed+allowed; table distinguishes by derived verdict)
// 'allowed'  → blocked=false  (same mapping; server does not have a 3-way verdict param)
// 'all'      → (no blocked param)

type VerdictFilter = 'all' | 'blocked' | 'observed' | 'allowed';

function verdictFilterToApiParam(vf: VerdictFilter): boolean | undefined {
  if (vf === 'blocked') return true;
  if (vf === 'observed' || vf === 'allowed') return false;
  return undefined;
}

// ── Verdict badge ────────────────────────────────────────────────────────────

const VERDICT_LABEL: Record<VerdictKind, string> = {
  blocked: 'BLOCKED',
  observed: 'OBSERVED',
  allowed: 'ALLOWED',
  errored: 'ERRORED',
};

const VERDICT_VARIANT = {
  blocked: 'block',
  observed: 'observe',
  allowed: 'allow',
  errored: 'warn',
} as const;

function VerdictBadge({ verdict }: { verdict: VerdictKind }) {
  return (
    <Badge variant={VERDICT_VARIANT[verdict]} testId="agr-verdict-badge">
      {VERDICT_LABEL[verdict]}
    </Badge>
  );
}

// ── Hygiene detection ────────────────────────────────────────────────────────
// If prompt.length < prompt_length the server stored a shorter representation
// (redacted, hashed, or truncated). We treat anything shorter as non-raw.

function isRawPrompt(prompt: string, promptLength: number): boolean {
  return prompt.length >= promptLength;
}

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

// ── PromptExcerpt (with matched-span highlight) ──────────────────────────────

function PromptExcerpt({ text, span }: { text: string; span: [number, number] | null }) {
  if (!span) {
    return <div className="code-block prompt-excerpt">{text}</div>;
  }
  const [s, e] = span;
  return (
    <div className="code-block prompt-excerpt">
      {text.slice(0, s)}
      <mark role="mark">{text.slice(s, e)}</mark>
      {text.slice(e)}
    </div>
  );
}

// ── PromptHygiene ────────────────────────────────────────────────────────────

function PromptHygiene({ prompt, promptLength }: { prompt: string; promptLength: number }) {
  const isHash = /^[0-9a-f]{32,}$/i.test(prompt.trim());
  const word = isHash ? 'hashed' : prompt.length < promptLength ? 'redacted or truncated' : 'non-raw';
  return (
    <div className="privacy-panel" data-testid="agr-prompt-hygiene">
      <span className="pp-icon">
        {isHash ? <Hash size={16} /> : <EyeOff size={16} />}
      </span>
      <div className="grow">
        <div className="pp-title">Prompt stored as {word} for privacy</div>
        <div className="pp-hint">
          The full text is unavailable by policy. The match position is suppressed.
        </div>
        <div className="pp-hash">
          <span>length: {promptLength.toLocaleString()} chars</span>
        </div>
      </div>
    </div>
  );
}

// ── KV list ──────────────────────────────────────────────────────────────────

function KV({ items }: { items: [string, ReactNode][] }) {
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

// ── Banner ───────────────────────────────────────────────────────────────────

function Banner({ kind, icon, children }: { kind: 'warn' | 'info'; icon: ReactNode; children: ReactNode }) {
  return (
    <div className={`banner ${kind === 'info' ? 'info' : ''}`}>
      <span className="bn-icon">{icon}</span>
      <span className="bn-text">{children}</span>
    </div>
  );
}

// ── Audit detail drawer ───────────────────────────────────────────────────────

function AuditDetailDrawer({ entryId, onClose }: { entryId: number; onClose: () => void }) {
  const { data, isLoading } = useAuditDetail(entryId);
  const entry: AuditDetail | undefined = data?.entry;

  const verdict = entry ? deriveVerdict({ blocked: entry.blocked, rule_id: entry.rule_id, errored: entry.errored_rule_ids.length > 0 }) : 'allowed';
  const raw = entry ? isRawPrompt(entry.prompt, entry.prompt_length) : false;

  return (
    <Drawer
      title={`Attempt #${entryId}`}
      sub={entry ? `${entry.occurred_at} UTC` : undefined}
      badge={entry ? <VerdictBadge verdict={verdict} /> : undefined}
      onClose={onClose}
    >
      {isLoading && <div className="state-skeleton">Loading…</div>}
      {entry && (
        <>
          <KV
            items={[
              ['Verdict', VERDICT_LABEL[verdict]],
              ['Mode', entry.blocked ? 'enforce' : entry.rule_id ? 'monitor' : 'off'],
              ['Rule', entry.rule_id ?? '—'],
              ['Ruleset', entry.ruleset_version ?? '—'],
              ['Principal', entry.principal_id ?? '—'],
              ['Storage', raw ? 'raw' : 'redacted/hashed/truncated'],
              ['Recorded', `${entry.occurred_at} UTC`],
            ]}
          />

          <div className="section-label" style={{ margin: '20px 0 8px' }}>
            Prompt{raw && entry.matched_span ? ' · matched span highlighted' : ''}
          </div>

          {raw ? (
            <PromptExcerpt text={entry.prompt} span={entry.matched_span} />
          ) : (
            <PromptHygiene prompt={entry.prompt} promptLength={entry.prompt_length} />
          )}

          {verdict === 'blocked' && (
            <Banner kind="warn" icon={<Lock size={17} />}>
              The model was <b>never called</b>. The prompt matched rule{' '}
              <span className="mono">{entry.rule_id}</span> and was refused deterministically.
            </Banner>
          )}
          {verdict === 'observed' && (
            <Banner kind="info" icon={<Eye size={17} />}>
              <b>Monitor mode</b> — this would have been blocked by rule{' '}
              <span className="mono">{entry.rule_id}</span>, but the control is in shadow mode, so
              the prompt was allowed through and only recorded.
            </Banner>
          )}
          {verdict === 'errored' && (
            <Banner kind="warn" icon={<AlertTriangle size={17} />}>
              An error occurred during screening. Check <code>errored_rule_ids</code> for details.
            </Banner>
          )}
          {verdict === 'allowed' && (
            <Banner kind="info" icon={<ShieldCheck size={17} />}>
              Allowed through to the model. Recorded for the forensic trail — no rule matched.
            </Banner>
          )}
        </>
      )}
    </Drawer>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function AuditPage() {
  const [q, setQ] = useState('');
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>('all');
  const [ruleFilter, setRuleFilter] = useState('');
  const [principalFilter, setPrincipalFilter] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [allEntries, setAllEntries] = useState<AuditSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const filters: AuditFilters = {
    q: q || undefined,
    blocked: verdictFilterToApiParam(verdictFilter),
    rule_id: ruleFilter || undefined,
    principal_id: principalFilter || undefined,
    cursor,
  };

  const { data, isLoading, isError, error } = useAuditList(filters);

  // When filters change (not cursor), reset accumulated entries
  const filterKey = JSON.stringify({ q, verdictFilter, ruleFilter, principalFilter });
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);

  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setCursor(undefined);
    setAllEntries([]);
    setNextCursor(null);
  }

  // Accumulate entries when data arrives
  if (data && data.entries) {
    const ids = new Set(allEntries.map((e) => e.id));
    const newEntries = data.entries.filter((e) => !ids.has(e.id));
    if (newEntries.length > 0) {
      // Use functional update pattern via effect workaround: directly set on first data
      // We need to handle this synchronously in render to avoid flicker
    }
  }

  // Defensive: a malformed/empty envelope may omit `entries` — never assume it is an array.
  const pageEntries = data?.entries ?? [];

  const state = useScreenState({
    isLoading: isLoading && allEntries.length === 0,
    isError,
    isEmpty: !isLoading && !isError && allEntries.length === 0 && pageEntries.length === 0,
  });

  // Merge new entries: done outside render guard for simplicity
  // (react-query ensures data is stable between renders with same query key)
  const displayEntries = (() => {
    if (!data) return allEntries;
    const ids = new Set(allEntries.map((e) => e.id));
    const merged = [...allEntries, ...pageEntries.filter((e) => !ids.has(e.id))];
    return merged;
  })();

  const handleLoadMore = () => {
    // Snapshot current merged entries before changing cursor
    setAllEntries(displayEntries);
    setNextCursor(data?.next_cursor ?? null);
    setCursor(data?.next_cursor ?? undefined);
  };

  const showLoadMore = data?.next_cursor != null;

  const columns: Column<AuditSummary>[] = [
    {
      key: 'verdict',
      header: 'Verdict',
      width: 116,
      render: (r) => <VerdictBadge verdict={deriveVerdict(r)} />,
    },
    {
      key: 'rule_id',
      header: 'Rule',
      width: 170,
      render: (r) =>
        r.rule_id ? (
          <span className="cell-mono">{r.rule_id}</span>
        ) : (
          <span className="subtle">—</span>
        ),
    },
    {
      key: 'principal_id',
      header: 'Principal',
      width: 84,
      render: (r) => <span className="cell-mono">{r.prompt_preview?.slice(0, 8) || '—'}</span>,
    },
    {
      key: 'prompt',
      header: 'Prompt (excerpt)',
      render: (r) => <div className="cell-prompt">{r.prompt_preview}</div>,
    },
    {
      key: 'occurred_at',
      header: 'When',
      width: 90,
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

  return (
    <div className="page" data-screen-label="Injection Audit Log">
      {/* Page header */}
      <div className="page-head">
        <div className="ph-text">
          <h1 className="screen-title">
            <List size={19} />
            Injection Audit Log
          </h1>
          <p className="screen-subtitle">
            Every prompt screened by the input guardrails — blocked and allowed. Append-only forensic
            trail; the audit is the product.
          </p>
        </div>
      </div>

      {/* Filter bar — always visible so users can adjust filters in any state */}
      <div className="panel">
        <div className="filter-bar">
          <div className="input-search">
            <input
              className="input"
              value={q}
              placeholder="Search prompt text…"
              aria-label="Search"
              onChange={(e) => {
                setQ(e.target.value);
              }}
            />
          </div>

          <select
            className="select"
            value={verdictFilter}
            onChange={(e) => setVerdictFilter(e.target.value as VerdictFilter)}
            aria-label="Verdict filter"
          >
            <option value="all">Verdict: all</option>
            <option value="blocked">Blocked</option>
            {/* Server returns both Observed + Allowed for blocked=false; table distinguishes by derived verdict */}
            <option value="observed">Observed</option>
            <option value="allowed">Allowed</option>
          </select>

          <input
            className="input mono"
            style={{ width: 130 }}
            value={ruleFilter}
            onChange={(e) => setRuleFilter(e.target.value)}
            placeholder="rule_id"
            aria-label="Rule filter"
          />

          <input
            className="input mono"
            style={{ width: 110 }}
            value={principalFilter}
            onChange={(e) => setPrincipalFilter(e.target.value)}
            placeholder="principal"
            aria-label="Principal id"
          />

          <div className="grow" />

          <span className="subtle" style={{ fontSize: 12.5 }}>
            {displayEntries.length} {displayEntries.length === 1 ? 'result' : 'results'}
          </span>
        </div>
      </div>

      <ScreenState
        testId="agr-audit"
        state={state}
        error={error}
        empty="No injection attempts recorded yet. The audit log fills as agents run."
      >
        <div className="panel">
          {/* Table */}
          {displayEntries.length === 0 ? (
            <div className="state-empty">No matching attempts.</div>
          ) : (
            <DataTable
              columns={columns}
              rows={displayEntries}
              onRowClick={(r) => setSelectedId(r.id)}
              rowTestId="agr-audit-row"
            />
          )}

          {/* Load more */}
          {showLoadMore && (
            <div style={{ padding: 14, textAlign: 'center', borderTop: '1px solid var(--color-border)' }}>
              <button className="btn btn-sm" onClick={handleLoadMore}>
                Load more
              </button>
            </div>
          )}
        </div>
      </ScreenState>

      {/* Detail drawer */}
      {selectedId != null && (
        <AuditDetailDrawer entryId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
