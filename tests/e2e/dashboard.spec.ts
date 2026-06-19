import { expect, test } from '@playwright/test';

// ---- API mock envelope helper ----
const envelope = (schema: string, data: unknown) => ({
  schema_version: 'ai-guardrails.api.v1',
  schema: `ai-guardrails.api.v1.${schema}`,
  data,
});

const overviewMock = {
  controls: [
    { key: 'tool_firewall', label: 'Tool Firewall', enabled: true, mode: 'enforce', posture: 'Engaged', spark: [0, 1, 0, 2, 1, 0, 3, 1, 0, 0, 2, 4] },
    { key: 'input_screen', label: 'Input Screening', enabled: true, mode: 'monitor', posture: 'Observing', spark: [0, 1, 0, 2, 1, 0, 3, 1, 0, 0, 2, 4] },
    { key: 'output_handler', label: 'Output Handler', enabled: true, mode: 'enforce', posture: 'Engaged', spark: [0, 1, 0, 2, 1, 0, 3, 1, 0, 0, 2, 4] },
    { key: 'hitl', label: 'HITL Bridge', enabled: false, mode: 'off', posture: 'Disabled', spark: [0, 1, 0, 2, 1, 0, 3, 1, 0, 0, 2, 4] },
  ],
  totals: { attempts_24h: 11, blocked_24h: 4, observed_24h: 2, pending_approvals: 1, sampled: false },
  ruleset_version: 'v1',
};

const trendMock = {
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

test.beforeEach(async ({ page }) => {
  // Mock every core API call
  await page.route('**/ai-guardrails/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/overview')) {
      return route.fulfill({ json: envelope('overview', overviewMock) });
    }
    if (url.includes('/audit/trend')) {
      return route.fulfill({ json: envelope('trend', trendMock) });
    }
    if (url.includes('/approvals')) {
      return route.fulfill({ json: envelope('approvals', { pending: [] }) });
    }
    return route.fulfill({ json: envelope('generic', {}) });
  });
});

// ── Test 1: Dashboard loads, 4 cards visible, data-state=ready ───────────────
test('dashboard loads with 4 control cards visible and data-state=ready', async ({ page }) => {
  await page.goto('/admin/ai-guardrails');

  // Shell should be present
  await expect(page.getByTestId('agr-shell')).toBeVisible();

  // Dashboard root reaches ready state
  await expect(page.getByTestId('agr-dashboard')).toHaveAttribute('data-state', 'ready');

  // 4 control cards visible
  const cards = page.locator('[data-testid="agr-control-card"]');
  await expect(cards).toHaveCount(4);

  // Mode badges visible
  await expect(page.getByTestId('agr-control-card-tool_firewall').getByTestId('agr-mode-badge')).toContainText('ENFORCE');
  await expect(page.getByTestId('agr-control-card-input_screen').getByTestId('agr-mode-badge')).toContainText('MONITOR');
  await expect(page.getByTestId('agr-control-card-hitl').getByTestId('agr-mode-badge')).toContainText('OFF');
});

// ── Test 2: Area chart is rendered ──────────────────────────────────────────
test('dashboard renders the stacked area chart with 3 series', async ({ page }) => {
  await page.goto('/admin/ai-guardrails');

  await expect(page.getByTestId('agr-dashboard')).toHaveAttribute('data-state', 'ready');

  const chart = page.getByTestId('agr-area-chart');
  await expect(chart).toBeVisible();

  // 3 series paths
  const series = chart.locator('[data-testid="agr-chart-series"]');
  await expect(series).toHaveCount(3);
});

// ── Test 3: Switch time range → trend endpoint re-fetched ────────────────────
test('switching time range causes trend endpoint to re-fetch', async ({ page }) => {
  const trendRequests: string[] = [];

  // Override with tracking
  await page.route('**/ai-guardrails/api/audit/trend**', async (route) => {
    trendRequests.push(route.request().url());
    return route.fulfill({ json: envelope('trend', trendMock) });
  });

  await page.goto('/admin/ai-guardrails');
  await expect(page.getByTestId('agr-dashboard')).toHaveAttribute('data-state', 'ready');

  const initialCount = trendRequests.length;

  // Switch range to 24h
  await page.getByLabel('Time range').selectOption('24h');

  // Wait for a new trend request with a different date range
  await page.waitForFunction(
    (initial) => window._trendRequestCount > initial,
    initialCount,
    { timeout: 5000 },
  ).catch(async () => {
    // If window function not available, just check requests array was extended
    await page.waitForTimeout(500);
  });

  // Verify the trend endpoint was called more than once
  expect(trendRequests.length).toBeGreaterThan(initialCount);
});

// ── Test 4: Demo-state Empty toggles data-state ──────────────────────────────
test('demo-state Empty toggle changes dashboard to data-state=empty', async ({ page }) => {
  await page.goto('/admin/ai-guardrails');

  await expect(page.getByTestId('agr-dashboard')).toHaveAttribute('data-state', 'ready');

  // Click the "Empty" demo state button in the topbar
  const demoStateGroup = page.getByTestId('agr-demo-state');
  await demoStateGroup.getByRole('button', { name: 'Empty' }).click();

  await expect(page.getByTestId('agr-dashboard')).toHaveAttribute('data-state', 'empty');
});

// ── Test 5: Demo-state Error toggles data-state ──────────────────────────────
test('demo-state Error toggle changes dashboard to data-state=error', async ({ page }) => {
  await page.goto('/admin/ai-guardrails');

  await expect(page.getByTestId('agr-dashboard')).toHaveAttribute('data-state', 'ready');

  // Click the "Error" demo state button in the topbar
  const demoStateGroup = page.getByTestId('agr-demo-state');
  await demoStateGroup.getByRole('button', { name: 'Error' }).click();

  await expect(page.getByTestId('agr-dashboard')).toHaveAttribute('data-state', 'error');
});
