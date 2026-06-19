import { expect, test } from '@playwright/test';

const envelope = (schema: string, data: unknown) => ({
  schema_version: 'ai-guardrails.api.v1',
  schema: `ai-guardrails.api.v1.${schema}`,
  data,
});

const overviewFixture = {
  controls: [],
  totals: { attempts_24h: 0, blocked_24h: 0, observed_24h: 0, pending_approvals: 0, sampled: false },
  ruleset_version: 'v1',
};

function makeChanges(count: number, actorId: string | null = null) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    actor_id: actorId,
    key: `key.${i}`,
    old_value: i === 0 ? null : i,
    new_value: i + 1,
    occurred_at: '2026-06-19T10:00:00Z',
  }));
}

test.beforeEach(async ({ page }) => {
  // Catch-all for any unmatched API calls (e.g. Shell calls /approvals)
  await page.route('**/ai-guardrails/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/overview')) {
      return route.fulfill({ json: envelope('overview', overviewFixture) });
    }
    if (url.includes('/approvals')) {
      return route.fulfill({ json: envelope('approvals', { pending: [] }) });
    }
    return route.fulfill({ json: envelope('generic', {}) });
  });
});

// ── Test 1: Page loads with rows ──────────────────────────────────────────────
test('change history page loads with rows and correct actor display', async ({ page }) => {
  await page.route(/\/ai-guardrails\/api\/settings\/changes(\?|$)/, async (route) => {
    return route.fulfill({
      json: envelope('settings.changes', {
        changes: [
          {
            id: 1,
            actor_id: 'user:alice',
            key: 'input_screen.enabled',
            old_value: false,
            new_value: true,
            occurred_at: '2026-06-19T10:00:00Z',
          },
          {
            id: 2,
            actor_id: null,
            key: 'tool_firewall.owner_keys',
            old_value: null,
            new_value: ['org:1'],
            occurred_at: '2026-06-19T09:00:00Z',
          },
        ],
      }),
    });
  });

  await page.goto('/admin/ai-guardrails/settings/audit');

  await expect(page.getByTestId('agr-change-history')).toHaveAttribute('data-state', 'ready');

  const rows = page.locator('[data-testid="agr-change-row"]');
  await expect(rows).toHaveCount(2);

  // First row: user:alice
  await expect(rows.nth(0)).toContainText('user:alice');
  await expect(rows.nth(0)).toContainText('input_screen.enabled');

  // Second row: system actor (null actor_id)
  await expect(rows.nth(1)).toContainText('system');
  await expect(rows.nth(1)).toContainText('(unset)');
});

// ── Test 2: Empty state ───────────────────────────────────────────────────────
test('change history shows empty-state when no changes', async ({ page }) => {
  await page.route(/\/ai-guardrails\/api\/settings\/changes(\?|$)/, async (route) => {
    return route.fulfill({ json: envelope('settings.changes', { changes: [] }) });
  });

  await page.goto('/admin/ai-guardrails/settings/audit');

  await expect(page.getByTestId('agr-change-history')).toHaveAttribute('data-state', 'empty');
  await expect(page.getByTestId('agr-change-history-empty')).toContainText(
    /no configuration changes recorded/i,
  );
});

// ── Test 3: Load more REPLACES the list (not append) ─────────────────────────
test('load more replaces list with new window — not append', async ({ page }) => {
  const firstBatch = makeChanges(50, 'user:alice');
  // secondBatch has different ids (51–53) to avoid confusion with firstBatch ids 1–50
  const secondBatch = Array.from({ length: 3 }, (_, i) => ({
    id: i + 51,
    actor_id: 'user:bob',
    key: `key.${i}`,
    old_value: i === 0 ? null : i,
    new_value: i + 1,
    occurred_at: '2026-06-19T10:00:00Z',
  }));

  await page.route(/\/ai-guardrails\/api\/settings\/changes(\?|$)/, async (route) => {
    const url = new URL(route.request().url());
    const limit = Number(url.searchParams.get('limit') ?? '50');
    if (limit > 50) {
      return route.fulfill({ json: envelope('settings.changes', { changes: secondBatch }) });
    }
    return route.fulfill({ json: envelope('settings.changes', { changes: firstBatch }) });
  });

  await page.goto('/admin/ai-guardrails/settings/audit');
  await expect(page.getByTestId('agr-change-history')).toHaveAttribute('data-state', 'ready');

  // First window: exactly 50 rows
  await expect(page.locator('[data-testid="agr-change-row"]')).toHaveCount(50);

  // Load more button visible (50 rows = limit)
  await expect(page.getByTestId('agr-load-more')).toBeVisible();

  // Click load more
  await page.getByTestId('agr-load-more').click();

  // After replace: exactly 3 rows from secondBatch, NOT 53 (append regression guard)
  await expect(page.locator('[data-testid="agr-change-row"]')).toHaveCount(3);
  await expect(page.locator('[data-testid="agr-change-row"]').filter({ hasText: 'user:bob' })).toHaveCount(3);
});

// ── Test 4: Back to Settings navigation ──────────────────────────────────────
test('back to settings button navigates to /settings', async ({ page }) => {
  await page.route(/\/ai-guardrails\/api\/settings\/changes(\?|$)/, async (route) => {
    return route.fulfill({ json: envelope('settings.changes', { changes: [] }) });
  });
  await page.route(/\/ai-guardrails\/api\/settings(\?|$)/, async (route) => {
    return route.fulfill({ json: envelope('settings', { settings: {} }) });
  });

  await page.goto('/admin/ai-guardrails/settings/audit');
  await expect(page.getByTestId('agr-change-history')).toHaveAttribute('data-state', 'empty');

  await page.getByTestId('agr-back-to-settings').click();

  // Should navigate to settings page
  await expect(page).toHaveURL(/\/settings$/);
});

// ── Test 5: Load more hidden when fewer rows than limit ───────────────────────
test('load more hidden when fewer rows than limit returned', async ({ page }) => {
  await page.route(/\/ai-guardrails\/api\/settings\/changes(\?|$)/, async (route) => {
    return route.fulfill({
      json: envelope('settings.changes', { changes: makeChanges(3) }),
    });
  });

  await page.goto('/admin/ai-guardrails/settings/audit');
  await expect(page.getByTestId('agr-change-history')).toHaveAttribute('data-state', 'ready');

  // 3 rows < 50 limit → load more NOT shown
  await expect(page.getByTestId('agr-load-more')).not.toBeVisible();
});
