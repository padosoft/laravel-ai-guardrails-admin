import { Eye, Gavel, ScanLine, Shield } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart } from '../components/AreaChart';
import { Badge, modeBadgeLabel, modeBadgeVariant } from '../components/Badge';
import { ScreenState, useScreenState } from '../components/ScreenState';
import { Sparkline } from '../components/Sparkline';
import { StatCard } from '../components/StatCard';
import type { Control, ControlKey, TrendRange } from '../lib/api/types';
import { useAuditTrend, useOverview } from '../lib/queries';

// ── helpers ─────────────────────────────────────────────────────────────────

const CONTROL_ORDER: ControlKey[] = ['tool_firewall', 'input_screen', 'output_handler', 'hitl'];
const CONTROL_LETTER: Record<ControlKey, string> = {
  tool_firewall: 'A',
  input_screen: 'B',
  output_handler: 'C',
  hitl: 'D',
};
const CONTROL_ROUTE: Record<ControlKey, string> = {
  tool_firewall: '/firewall',
  input_screen: '/audit',
  output_handler: '/output',
  hitl: '/approvals',
};

/**
 * Derive sparkline colour from control mode + key.
 * Mirrors prototype logic:
 *   degraded → warn (not applicable here, simplified to off check)
 *   monitor  → observe
 *   input_screen (control B) → block (injection-defence colour)
 *   else     → accent
 */
function sparklineColor(control: Control): string {
  if (control.mode === 'off') return 'var(--color-fg-subtle)';
  if (control.mode === 'monitor') return 'var(--color-observe)';
  if (control.key === 'input_screen') return 'var(--color-block)';
  return 'var(--color-accent)';
}

type TimeRange = '24h' | '7d' | '30d';

/** Format a UTC timestamp (ms) as a YYYY-MM-DD string in UTC. */
function utcDateString(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Compute UTC-stable from/to boundaries for the given range.
 *
 * We work entirely in UTC milliseconds so that host-timezone midnight
 * boundaries never bleed the window by ±1 day.
 *
 * @param range  - The selected time range ('24h' | '7d' | '30d').
 * @param nowMs  - Epoch ms for "now" (defaults to Date.now(); injectable for
 *                 tests so we can mock the clock without global patching).
 */
export function rangeToQueryParams(range: TimeRange, nowMs: number = Date.now()): TrendRange {
  const days = range === '24h' ? 1 : range === '7d' ? 7 : 30;
  const toMs = nowMs;
  const fromMs = toMs - days * 86_400_000;
  return {
    from: utcDateString(fromMs),
    to: utcDateString(toMs),
  };
}

// ── Live pill ────────────────────────────────────────────────────────────────

function LivePill() {
  return (
    <span className="live-pill">
      <span className="live-dot" />
      Live
    </span>
  );
}

// ── Control card ─────────────────────────────────────────────────────────────

function ControlCard({ control, onClick }: { control: Control; onClick?: () => void }) {
  const letter = CONTROL_LETTER[control.key];
  const color = sparklineColor(control);
  const badgeLabel = modeBadgeLabel(control.mode);
  const badgeVariant = modeBadgeVariant(control.mode);

  return (
    <div
      data-testid="agr-control-card"
      data-control-key={control.key}
    >
      <button
        type="button"
        className={`panel control-card s-${control.mode}`}
        data-testid={`agr-control-card-${control.key}`}
        onClick={onClick}
      >
        <div className="cc-top">
          <div>
            <div className="cc-letter">CONTROL {letter}</div>
            <div className="cc-name">{control.label}</div>
          </div>
        </div>

        <div className={`cc-status ${control.mode}`}>
          <Badge variant={badgeVariant} testId="agr-mode-badge">
            {badgeLabel}
          </Badge>
        </div>

        <div className="cc-posture" data-testid="agr-posture">
          {control.posture}
        </div>

        <div className="cc-spark">
          <Sparkline data={control.spark} color={color} />
        </div>
      </button>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const [range, setRange] = useState<TimeRange>('7d');
  const navigate = useNavigate();

  const trendRange = rangeToQueryParams(range);
  const overview = useOverview();
  const trend = useAuditTrend(trendRange);

  const isEmpty =
    !overview.isLoading &&
    !overview.isError &&
    (overview.data?.controls?.length ?? 0) === 0;

  const state = useScreenState({
    isLoading: overview.isLoading,
    isError: overview.isError,
    isEmpty,
  });

  const controls = overview.data?.controls ?? [];
  const totals = overview.data?.totals;
  const trendPoints = trend.data?.points ?? [];

  // Reorder controls to canonical A–D order
  const orderedControls = CONTROL_ORDER
    .map((key) => controls.find((c) => c.key === key))
    .filter((c): c is Control => c !== undefined);

  return (
    <div className="page" data-screen-label="Dashboard">
      {/* Page header */}
      <div className="page-head">
        <div className="ph-text">
          <h1 className="screen-title">
            <Shield size={19} />
            Guardrail Health
          </h1>
          <p className="screen-subtitle">
            Posture of the four guardrail controls protecting your AI agents. Live status, recent
            activity, and 24h threat throughput.
          </p>
        </div>
        <div className="page-head-actions">
          <select
            className="select"
            value={range}
            onChange={(e) => setRange(e.target.value as TimeRange)}
            aria-label="Time range"
          >
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <LivePill />
        </div>
      </div>

      {/* Main content — wrapped in ScreenState for data-state attribute */}
      <ScreenState
        testId="agr-dashboard"
        state={state}
        error={overview.error}
        empty="No activity yet. The dashboard fills as your agents start running through the guardrails."
      >
        {/* Control cards grid */}
        <div className="controls-grid">
          {orderedControls.map((control) => (
            <ControlCard
              key={control.key}
              control={control}
              onClick={() => navigate(CONTROL_ROUTE[control.key])}
            />
          ))}
        </div>

        {/* Throughput chart */}
        <div className="section-label-row">
          <span className="section-label">Injection throughput · {range === '24h' ? '24 hours' : range === '7d' ? '7 days' : '30 days'}</span>
          <div className="legend">
            <span className="lg">
              <span className="sw" style={{ background: 'var(--color-allow)' }} />
              Allowed
            </span>
            <span className="lg">
              <span className="sw" style={{ background: 'var(--color-observe)' }} />
              Observed
            </span>
            <span className="lg">
              <span className="sw" style={{ background: 'var(--color-block)' }} />
              Blocked
            </span>
          </div>
        </div>
        <div className="panel pad">
          <AreaChart points={trendPoints} />
        </div>

        {/* Totals row */}
        <div className="section-label">Totals · last 24h</div>
        <div className="grid cols-4 gap-14">
          <StatCard
            label="Prompts screened"
            icon={ScanLine}
            value={totals ? totals.attempts_24h.toLocaleString() : '—'}
            sub="across all agents"
            testId="agr-stat-attempts_24h"
          />
          <StatCard
            label="Observed"
            icon={Eye}
            value={totals?.observed_24h ?? '—'}
            sub="monitor-mode would-block"
            testId="agr-stat-observed_24h"
          />
          <StatCard
            label="Blocked"
            icon={Shield}
            value={totals?.blocked_24h ?? '—'}
            delta="injection attempts refused"
            deltaDir="up"
            testId="agr-stat-blocked_24h"
          />
          <StatCard
            label="Pending approvals"
            icon={Gavel}
            value={totals?.pending_approvals ?? '—'}
            delta="awaiting human review"
            deltaDir="flat"
            testId="agr-stat-pending_approvals"
          />
        </div>
      </ScreenState>
    </div>
  );
}
