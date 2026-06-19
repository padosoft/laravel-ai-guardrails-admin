import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DemoStateProvider, useDemoState } from '../../../resources/js/lib/demoState';
import { ApiEndpointsProvider } from '../../../resources/js/lib/queries';
import { runtimeConfig } from '../../../resources/js/config';
import { renderWithProviders } from '../support/render';
import { server } from '../support/server';
import { overviewFixture } from '../support/fixtures';
import type { AuditTrendData } from '../../../resources/js/lib/api/types';
import { DashboardPage, rangeToQueryParams } from '../../../resources/js/pages/DashboardPage';

// ------------------------------------------------------------------ fixtures --

const trendFixture: AuditTrendData = {
  from: '2026-06-12',
  to: '2026-06-18',
  points: [
    { date: '2026-06-12', total: 20, blocked: 4, allowed: 16, observed: 3 },
    { date: '2026-06-13', total: 30, blocked: 8, allowed: 22, observed: 5 },
    { date: '2026-06-14', total: 15, blocked: 2, allowed: 13, observed: 1 },
    { date: '2026-06-15', total: 25, blocked: 5, allowed: 20, observed: 4 },
    { date: '2026-06-16', total: 10, blocked: 1, allowed: 9,  observed: 2 },
    { date: '2026-06-17', total: 40, blocked: 10, allowed: 30, observed: 7 },
    { date: '2026-06-18', total: 18, blocked: 3, allowed: 15, observed: 2 },
  ],
};

const envelope = (schema: string, data: unknown) => ({
  schema_version: 'ai-guardrails.api.v1',
  schema: `ai-guardrails.api.v1.${schema}`,
  data,
});

function withMocks() {
  server.use(
    http.get('*/overview', () => HttpResponse.json(envelope('overview', overviewFixture))),
    http.get('*/audit/trend', () => HttpResponse.json(envelope('trend', trendFixture))),
    http.get('*/approvals', () => HttpResponse.json(envelope('approvals', { pending: [] }))),
  );
}

// ------------------------------------------------------------------ helpers --

function DemoForcer({ state }: { state: 'data' | 'loading' | 'empty' | 'error' }) {
  const { setDemo } = useDemoState();
  return (
    <button data-testid={`set-demo-${state}`} onClick={() => setDemo(state)}>
      Set {state}
    </button>
  );
}

function renderDashboard(withDemoForcer?: 'empty' | 'error') {
  return renderWithProviders(
    <ApiEndpointsProvider config={runtimeConfig()}>
      <DemoStateProvider>
        {withDemoForcer ? <DemoForcer state={withDemoForcer} /> : null}
        <DashboardPage />
      </DemoStateProvider>
    </ApiEndpointsProvider>,
  );
}

// ============================================================ TESTS ============================================================

describe('DashboardPage', () => {
  // ------------------------------------------------------------------
  // READY state: 4 control cards
  // ------------------------------------------------------------------
  it('renders 4 control cards with mode badges and posture from fixture', async () => {
    withMocks();
    renderDashboard();

    // Wait for ready state
    await waitFor(() =>
      expect(screen.getByTestId('agr-dashboard')).toHaveAttribute('data-state', 'ready'),
    );

    const dashboard = screen.getByTestId('agr-dashboard');

    // 4 cards must exist (by testid)
    expect(within(dashboard).getAllByTestId('agr-control-card')).toHaveLength(4);

    // Control A: Tool Firewall — enforce → badge shows ENFORCE
    const cardA = within(dashboard).getByTestId('agr-control-card-tool_firewall');
    expect(within(cardA).getByTestId('agr-mode-badge')).toHaveTextContent('ENFORCE');
    expect(within(cardA).getByTestId('agr-posture')).toHaveTextContent('Engaged');

    // Control B: Input Screening — monitor → badge shows MONITOR
    const cardB = within(dashboard).getByTestId('agr-control-card-input_screen');
    expect(within(cardB).getByTestId('agr-mode-badge')).toHaveTextContent('MONITOR');
    expect(within(cardB).getByTestId('agr-posture')).toHaveTextContent('Observing');

    // Control C: Output Handler — enforce → badge shows ENFORCE
    const cardC = within(dashboard).getByTestId('agr-control-card-output_handler');
    expect(within(cardC).getByTestId('agr-mode-badge')).toHaveTextContent('ENFORCE');

    // Control D: HITL Bridge — off → badge shows OFF
    const cardD = within(dashboard).getByTestId('agr-control-card-hitl');
    expect(within(cardD).getByTestId('agr-mode-badge')).toHaveTextContent('OFF');
    expect(within(cardD).getByTestId('agr-posture')).toHaveTextContent('Disabled');
  });

  // ------------------------------------------------------------------
  // READY state: 4 totals stat cards
  // ------------------------------------------------------------------
  it('renders 4 totals stat cards with correct values from fixture', async () => {
    withMocks();
    renderDashboard();

    await waitFor(() =>
      expect(screen.getByTestId('agr-dashboard')).toHaveAttribute('data-state', 'ready'),
    );

    // attempts_24h = 11
    expect(screen.getByTestId('agr-stat-attempts_24h')).toHaveTextContent('11');
    // observed_24h = 2
    expect(screen.getByTestId('agr-stat-observed_24h')).toHaveTextContent('2');
    // blocked_24h = 4
    expect(screen.getByTestId('agr-stat-blocked_24h')).toHaveTextContent('4');
    // pending_approvals = 1
    expect(screen.getByTestId('agr-stat-pending_approvals')).toHaveTextContent('1');
  });

  // ------------------------------------------------------------------
  // READY state: area chart with 3 series
  // ------------------------------------------------------------------
  it('renders the area chart SVG with 3 data series (blocked, observed, clean)', async () => {
    withMocks();
    renderDashboard();

    await waitFor(() =>
      expect(screen.getByTestId('agr-dashboard')).toHaveAttribute('data-state', 'ready'),
    );

    const chart = screen.getByTestId('agr-area-chart');
    // Three <path> series paths must be present
    const seriesPaths = within(chart).getAllByTestId('agr-chart-series');
    expect(seriesPaths).toHaveLength(3);

    // Series identities
    const seriesIds = seriesPaths.map((p) => p.getAttribute('data-series'));
    expect(seriesIds).toContain('clean');
    expect(seriesIds).toContain('observed');
    expect(seriesIds).toContain('blocked');
  });

  // ------------------------------------------------------------------
  // clean = allowed − observed for a known fixture point
  // ------------------------------------------------------------------
  it('computes clean band = allowed − observed for each fixture point', async () => {
    withMocks();
    renderDashboard();

    await waitFor(() =>
      expect(screen.getByTestId('agr-dashboard')).toHaveAttribute('data-state', 'ready'),
    );

    const chart = screen.getByTestId('agr-area-chart');
    // The chart exposes computed clean-sum via data-clean-sum attribute for test verification
    const cleanSum = parseInt(chart.getAttribute('data-clean-sum') ?? '0', 10);
    // Sum of (allowed - observed) across fixture points:
    // (16-3)+(22-5)+(13-1)+(20-4)+(9-2)+(30-7)+(15-2) = 13+17+12+16+7+23+13 = 101
    expect(cleanSum).toBe(101);
  });

  // ------------------------------------------------------------------
  // EMPTY state: zero controls
  // ------------------------------------------------------------------
  it('shows data-state=empty when overview has zero controls', async () => {
    server.use(
      http.get('*/overview', () =>
        HttpResponse.json(envelope('overview', {
          controls: [],
          totals: { attempts_24h: 0, blocked_24h: 0, observed_24h: 0, pending_approvals: 0, sampled: false },
          ruleset_version: 'v1',
        })),
      ),
      http.get('*/audit/trend', () => HttpResponse.json(envelope('trend', { from: '2026-06-12', to: '2026-06-18', points: [] }))),
      http.get('*/approvals', () => HttpResponse.json(envelope('approvals', { pending: [] }))),
    );
    renderDashboard();

    await waitFor(() =>
      expect(screen.getByTestId('agr-dashboard')).toHaveAttribute('data-state', 'empty'),
    );
  });

  // ------------------------------------------------------------------
  // ERROR state: API failure
  // ------------------------------------------------------------------
  it('shows data-state=error when overview API fails', async () => {
    server.use(
      http.get('*/overview', () => HttpResponse.json({ message: 'Server error' }, { status: 500 })),
      http.get('*/audit/trend', () => HttpResponse.json(envelope('trend', trendFixture))),
      http.get('*/approvals', () => HttpResponse.json(envelope('approvals', { pending: [] }))),
    );
    renderDashboard();

    await waitFor(() =>
      expect(screen.getByTestId('agr-dashboard')).toHaveAttribute('data-state', 'error'),
    );
  });

  // ------------------------------------------------------------------
  // Time-range control: switching re-queries with different params
  // ------------------------------------------------------------------
  it('time-range control changes the trend query parameters', async () => {
    const calledUrls: string[] = [];
    server.use(
      http.get('*/overview', () => HttpResponse.json(envelope('overview', overviewFixture))),
      http.get('*/audit/trend', ({ request }) => {
        calledUrls.push(request.url);
        return HttpResponse.json(envelope('trend', trendFixture));
      }),
      http.get('*/approvals', () => HttpResponse.json(envelope('approvals', { pending: [] }))),
    );

    renderDashboard();

    await waitFor(() =>
      expect(screen.getByTestId('agr-dashboard')).toHaveAttribute('data-state', 'ready'),
    );

    const user = userEvent.setup();
    const select = screen.getByLabelText('Time range');

    // Switch to 24h
    await user.selectOptions(select, '24h');

    await waitFor(() => {
      // At least a second call was made after the range switch
      expect(calledUrls.length).toBeGreaterThan(1);
    });
  });

  // ------------------------------------------------------------------
  // Demo-state override: Empty → data-state=empty
  // ------------------------------------------------------------------
  it('demo-state Empty override shows data-state=empty regardless of API data', async () => {
    withMocks();
    renderDashboard('empty');

    await waitFor(() =>
      expect(screen.getByTestId('agr-dashboard')).toHaveAttribute('data-state', 'ready'),
    );

    await userEvent.click(screen.getByTestId('set-demo-empty'));

    await waitFor(() =>
      expect(screen.getByTestId('agr-dashboard')).toHaveAttribute('data-state', 'empty'),
    );
  });

  // ------------------------------------------------------------------
  // Demo-state override: Error → data-state=error
  // ------------------------------------------------------------------
  it('demo-state Error override shows data-state=error regardless of API data', async () => {
    withMocks();
    renderDashboard('error');

    await waitFor(() =>
      expect(screen.getByTestId('agr-dashboard')).toHaveAttribute('data-state', 'ready'),
    );

    await userEvent.click(screen.getByTestId('set-demo-error'));

    await waitFor(() =>
      expect(screen.getByTestId('agr-dashboard')).toHaveAttribute('data-state', 'error'),
    );
  });

  // ------------------------------------------------------------------
  // C3 — UTC-safe time range: 7d window is exactly 7×86400 s wide
  // ------------------------------------------------------------------
  it('rangeToQueryParams 7d produces from exactly 7 UTC days before to (clock-injected)', () => {
    // Fixed "now": 2026-06-19T15:30:00Z  (mid-afternoon UTC, well inside a UTC day)
    // Local timezone drift cannot affect this because we compute in UTC ms.
    const nowMs = Date.UTC(2026, 5, 19, 15, 30, 0); // months are 0-indexed

    const result = rangeToQueryParams('7d', nowMs);

    // "to" must be 2026-06-19 (UTC date of nowMs)
    expect(result.to).toBe('2026-06-19');

    // "from" must be exactly 7 days earlier in UTC: 2026-06-12
    expect(result.from).toBe('2026-06-12');

    // Sanity: the difference between parsed dates is exactly 7 days (604800000 ms)
    const fromMs = new Date(result.from + 'T00:00:00Z').getTime();
    const toMs   = new Date(result.to   + 'T00:00:00Z').getTime();
    expect(toMs - fromMs).toBe(7 * 86_400_000);
  });
});
