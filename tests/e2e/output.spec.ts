import { expect, test } from '@playwright/test';

const envelope = (schema: string, data: unknown) => ({
  schema_version: 'ai-guardrails.api.v1',
  schema: `ai-guardrails.api.v1.${schema}`,
  data,
});

const outputStatsFixture = {
  from: '2026-06-12T00:00:00+00:00',
  to: '2026-06-19T00:00:00+00:00',
  counts: {
    html_stripped: 42,
    markdown_sanitized: 17,
    structured_validation_failure: 3,
    pii_redaction: 8,
    pii: {
      by_detector: {
        email: 3,
        phone: 2,
        iban: 1,
      },
    },
  },
  total: 120,
};

const settingsFixture = {
  settings: {
    output_handler: {
      enabled: true,
      sanitize_html: true,
      neutralize_markdown: true,
      redact_pii: true,
      html_mode: 'escape',
    },
    modes: {
      output_handler: 'enforce',
    },
  },
};

test.beforeEach(async ({ page }) => {
  // Mock shell-level calls
  await page.route('**/ai-guardrails/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/approvals')) {
      return route.fulfill({ json: envelope('approvals', { pending: [] }) });
    }
    if (url.includes('/overview')) {
      return route.fulfill({
        json: envelope('overview', {
          controls: [],
          totals: { attempts_24h: 0, blocked_24h: 0, observed_24h: 0, pending_approvals: 0, sampled: false },
          ruleset_version: 'v1',
        }),
      });
    }
    return route.fulfill({ json: envelope('generic', {}) });
  });

  // Mock output/stats
  await page.route(/\/ai-guardrails\/api\/output\/stats(\?|$)/, async (route) => {
    return route.fulfill({ json: envelope('output.stats', outputStatsFixture) });
  });

  // Mock settings GET
  await page.route(/\/ai-guardrails\/api\/settings(\?|$)/, async (route, request) => {
    if (request.method() === 'GET') {
      return route.fulfill({ json: envelope('settings', settingsFixture) });
    }
    return route.continue();
  });
});

// ── Test 1: Page loads with stat cards ───────────────────────────────────────
test('output page loads with stat cards and ENFORCE badge', async ({ page }) => {
  await page.goto('/admin/ai-guardrails/output');

  await expect(page.getByTestId('agr-output')).toHaveAttribute('data-state', 'ready');

  // Status badge
  await expect(page.getByTestId('agr-status-badge')).toContainText(/enforce/i);

  // Stat cards
  await expect(page.getByTestId('agr-stat-html')).toContainText('42');
  await expect(page.getByTestId('agr-stat-markdown')).toContainText('17');
  await expect(page.getByTestId('agr-stat-structured')).toContainText('3');
  await expect(page.getByTestId('agr-stat-pii')).toContainText('8');

  // PII by-detector bars
  await expect(page.getByTestId('agr-bar-email')).toContainText('3');
  await expect(page.getByTestId('agr-bar-phone')).toContainText('2');
  await expect(page.getByTestId('agr-bar-iban')).toContainText('1');
});

// ── Test 2: flip html_mode → SaveBar → Save → clears ─────────────────────────
test('flip html_mode → SaveBar appears → Save → SaveBar clears', async ({ page }) => {
  let capturedBody: unknown = null;

  // Override settings PUT
  await page.route(/\/ai-guardrails\/api\/settings(\?|$)/, async (route, request) => {
    if (request.method() === 'PUT') {
      capturedBody = JSON.parse(request.postData() ?? '{}');
      return route.fulfill({ json: envelope('settings', settingsFixture) });
    }
    return route.fulfill({ json: envelope('settings', settingsFixture) });
  });

  await page.goto('/admin/ai-guardrails/output');

  await expect(page.getByTestId('agr-output')).toHaveAttribute('data-state', 'ready');

  // SaveBar not visible initially
  await expect(page.getByTestId('agr-save-bar')).not.toBeVisible();

  // Click the "Allowlist" button in the html_mode segmented control
  await page.getByRole('button', { name: /allowlist/i }).click();

  // SaveBar appears
  await expect(page.getByTestId('agr-save-bar')).toBeVisible();

  // Click Save
  await page.getByRole('button', { name: /save changes/i }).click();

  // SaveBar disappears after successful save
  await expect(page.getByTestId('agr-save-bar')).not.toBeVisible();

  // Verify PUT sent the changed html_mode key
  expect(capturedBody).not.toBeNull();
  const body = capturedBody as { settings: Record<string, unknown> };
  expect(body.settings['output_handler.html_mode']).toBe('allowlist');
  // Only html_mode changed
  expect(Object.keys(body.settings)).not.toContain('output_handler.sanitize_html');
  expect(Object.keys(body.settings)).not.toContain('output_handler.neutralize_markdown');
  expect(Object.keys(body.settings)).not.toContain('output_handler.redact_pii');
});

// ── Test 3: toggle redact_pii (via testId) → SaveBar → Discard → reverts ─────
test('toggle redact_pii → SaveBar appears → Discard reverts', async ({ page }) => {
  // Set viewport large enough so all config rows are visible
  await page.setViewportSize({ width: 1280, height: 1024 });
  await page.goto('/admin/ai-guardrails/output');

  await expect(page.getByTestId('agr-output')).toHaveAttribute('data-state', 'ready');

  // SaveBar not visible initially
  await expect(page.getByTestId('agr-save-bar')).not.toBeVisible();

  // Target the Redact PII toggle button by testId, scroll it into view and click
  const toggle = page.getByTestId('agr-toggle-redact-pii');
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await toggle.scrollIntoViewIfNeeded();
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');

  // SaveBar appears
  await expect(page.getByTestId('agr-save-bar')).toBeVisible();

  // Discard
  await page.getByRole('button', { name: /discard/i }).click();

  // SaveBar gone, toggle reverted
  await expect(page.getByTestId('agr-save-bar')).not.toBeVisible();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
});

// ── Test 4: empty by_detector shows empty-state ───────────────────────────────
test('empty by_detector shows empty-state message, not a broken chart', async ({ page }) => {
  // Override output/stats with empty by_detector
  await page.route(/\/ai-guardrails\/api\/output\/stats(\?|$)/, async (route) => {
    return route.fulfill({
      json: envelope('output.stats', {
        from: '2026-06-12T00:00:00+00:00',
        to: '2026-06-19T00:00:00+00:00',
        counts: {
          html_stripped: 5,
          markdown_sanitized: 2,
          structured_validation_failure: 0,
          pii_redaction: 0,
          pii: { by_detector: {} },
        },
        total: 7,
      }),
    });
  });

  await page.goto('/admin/ai-guardrails/output');

  await expect(page.getByTestId('agr-output')).toHaveAttribute('data-state', 'ready');

  // Empty state message shown instead of bars
  await expect(page.getByTestId('agr-bar-empty')).toBeVisible();

  // No detector bars
  await expect(page.locator('[data-testid^="agr-bar-"]:not([data-testid="agr-bar-empty"])')).toHaveCount(0);
});
