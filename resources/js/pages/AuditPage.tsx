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
// A prompt is "raw/highlightable" only when it is NOT a redaction marker, NOT a
// hash-like token, and NOT shorter than the stored prompt_length (truncated).
//
// Hash pattern: hex strings (e.g. md5/sha256) or base64-ish fixed-length tokens
// that look nothing like human text.  We consider a string hash-like when it
// matches an all-hex pattern OR when it is a base64 token of fixed length (≥ 32
// chars, only base64url chars, no spaces).
//
// Redaction markers: strings that are entirely wrapped in brackets or angle
// brackets — e.g. "[REDACTED]", "<REDACTED>", "[HASH]", etc.

const HASH_HEX_RE = /^[0-9a-f]{32,}$/i;
const HASH_B64_RE = /^[A-Za-z0-9+/=_-]{32,}$/;
const REDACT_MARKER_RE = /^\[.+]$|^<.+>$/;

function isHashOrRedacted(prompt: string): boolean {
  const t = prompt.trim();
  return HASH_HEX_RE.test(t) || HASH_B64_RE.test(t) || REDACT_MARKER_RE.test(t);
}

function isRawPrompt(prompt: string, promptLength: number): boolean {
  // Shorter than stored length → truncated/redacted/hashed representation
  if (prompt.length < promptLength) return false;
  // Looks like a hash or redaction marker → not highlightable raw text
  if (isHashOrRedacted(prompt)) return false;
  return true;
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
// PHP stores match_start/match_end as UTF-8 BYTE offsets.  JS strings are
// UTF-16; for any multibyte character the indices misalign if we use .slice()
// directly.  We convert via TextEncoder/TextDecoder to stay byte-accurate.
//
// Safety guarantees:
//   • start/end are clamped to [0, byteLength].
//   • start is clamped to be ≤ end.
//   • On any invalid/out-of-range span we render without a highlight.

function PromptExcerpt({ text, span }: { text: string; span: [number, number] | null }) {
  if (!span) {
    return <div className="code-block prompt-excerpt">{text}</div>;
  }

  const bytes = new TextEncoder().encode(text);
  const byteLen = bytes.length;

  // Clamp and validate
  const rawStart = Math.max(0, Math.min(span[0], byteLen));
  const rawEnd = Math.max(rawStart, Math.min(span[1], byteLen));

  if (rawStart === rawEnd || rawStart >= byteLen) {
    // Degenerate or out-of-range span — render plain
    return <div className="code-block prompt-excerpt">{text}</div>;
  }

  const decoder = new TextDecoder();
  const pre = decoder.decode(bytes.slice(0, rawStart));
  const mark = decoder.decode(bytes.slice(rawStart, rawEnd));
  const post = decoder.decode(bytes.slice(rawEnd));

  return (
    <div className="code-block prompt-excerpt">
      {pre}
      <mark role="mark">{mark}</mark>
      {post}
    </div>
  );
}

// ── PromptHygiene ────────────────────────────────────────────────────────────

function PromptHygiene({ prompt, promptLength }: { prompt: string; promptLength: number }) {
  const isHash = HASH_HEX_RE.test(prompt.trim());
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
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Helper to reset pagination whenever filter values change.  Calling these
  // resets in the same event-handler flush as the filter setter is the
  // StrictMode-safe way to guarantee no stale-cursor request is ever fired.
  function resetPagination() {
    setCursor(undefined);
    setAllEntries([]);
  }

  const filters: AuditFilters = {
    q: q || undefined,
    blocked: verdictFilterToApiParam(verdictFilter),
    rule_id: ruleFilter || undefined,
    principal_id: principalFilter || undefined,
    cursor,
  };

  const { data, isLoading, isError, error } = useAuditList(filters);

  // Defensive: a malformed/empty envelope may omit `entries` — never assume it is an array.
  const pageEntries = data?.entries ?? [];

  const state = useScreenState({
    isLoading: isLoading && allEntries.length === 0,
    isError,
    isEmpty: !isLoading && !isError && allEntries.length === 0 && pageEntries.length === 0,
  });

  // Merge new page entries into the accumulated list, de-duplicating by id.
  const displayEntries = (() => {
    if (!data) return allEntries;
    const ids = new Set(allEntries.map((e) => e.id));
    const merged = [...allEntries, ...pageEntries.filter((e) => !ids.has(e.id))];
    return merged;
  })();

  const handleLoadMore = () => {
    // Snapshot current merged entries before advancing the cursor
    setAllEntries(displayEntries);
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
      // The list-entry shape has no principal_id; it is only available in the
      // detail (drawer).  Rendering prompt text here as identity was misleading
      // — show an em-dash placeholder instead.  The real value appears in the drawer.
      key: 'principal_id',
      header: 'Principal',
      width: 84,
      render: () => <span className="subtle">—</span>,
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
                resetPagination();
              }}
            />
          </div>

          <select
            className="select"
            value={verdictFilter}
            onChange={(e) => {
              setVerdictFilter(e.target.value as VerdictFilter);
              resetPagination();
            }}
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
            onChange={(e) => {
              setRuleFilter(e.target.value);
              resetPagination();
            }}
            placeholder="rule_id"
            aria-label="Rule filter"
          />

          <input
            className="input mono"
            style={{ width: 110 }}
            value={principalFilter}
            onChange={(e) => {
              setPrincipalFilter(e.target.value);
              resetPagination();
            }}
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
