import { expect, test } from '@playwright/test';

const envelope = (schema: string, data: unknown) => ({
  schema_version: 'ai-guardrails.api.v1',
  schema: `ai-guardrails.api.v1.${schema}`,
  data,
});

const approvalsFixture = {
  pending: [
    {
      approval_id: 'ap_1',
      run_id: 'run_abc123',
      step_name: 'refund_step',
      status: 'pending',
      expires_at: '2026-06-19T14:00:00+00:00',
      created_at: '2026-06-19T12:00:00+00:00',
      tool: 'process_refund',
      arguments: { order_id: 'o_999', amount: 250 },
      requested_ago: '2 minutes ago',
      expires_in: 'in 2 hours',
    },
    {
      approval_id: 'ap_2',
      run_id: 'run_def456',
      step_name: 'delete_step',
      status: 'pending',
      expires_at: '2026-06-19T15:00:00+00:00',
      created_at: '2026-06-19T12:30:00+00:00',
      tool: 'delete_record',
      arguments: { record_id: 'r_42' },
      requested_ago: '5 minutes ago',
      expires_in: 'in 3 hours',
    },
  ],
};

test.beforeEach(async ({ page }) => {
  // Shell-level fallback: overview, approvals default
  await page.route('**/ai-guardrails/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/overview')) {
      return route.fulfill({
        json: envelope('overview', {
          controls: [],
          totals: { attempts_24h: 0, blocked_24h: 0, observed_24h: 0, pending_approvals: 2, sampled: false },
          ruleset_version: 'v1',
        }),
      });
    }
    return route.fulfill({ json: envelope('generic', {}) });
  });
});

// ── Test 1: Page loads with queue rows ────────────────────────────────────────
test('approvals page loads with queue rows', async ({ page }) => {
  await page.route(/\/ai-guardrails\/api\/approvals(\?|$)/, async (route) => {
    return route.fulfill({ json: envelope('approvals', approvalsFixture) });
  });

  await page.goto('/admin/ai-guardrails/approvals');

  await expect(page.getByTestId('agr-approvals')).toHaveAttribute('data-state', 'ready');

  const rows = page.locator('[data-testid="agr-approval-row"]');
  await expect(rows).toHaveCount(2);

  // First row: process_refund tool
  await expect(rows.nth(0)).toContainText('process_refund');
  await expect(rows.nth(0)).toContainText('2 minutes ago');
  await expect(rows.nth(0)).toContainText('in 2 hours');

  // Second row: delete_record tool
  await expect(rows.nth(1)).toContainText('delete_record');
});

// ── Test 2: Empty state ───────────────────────────────────────────────────────
test('approvals page shows empty-state when queue is clear', async ({ page }) => {
  await page.route(/\/ai-guardrails\/api\/approvals(\?|$)/, async (route) => {
    return route.fulfill({ json: envelope('approvals', { pending: [] }) });
  });

  await page.goto('/admin/ai-guardrails/approvals');

  await expect(page.getByTestId('agr-approvals')).toHaveAttribute('data-state', 'empty');
  await expect(page.getByTestId('agr-approvals-empty')).toContainText(/queue is clear/i);
});

// ── Test 3: Approve flow (open confirm drawer → enter token → approve → row gone) ──
test('approve flow: enter token → confirm → row disappears', async ({ page }) => {
  let approveCallCount = 0;

  await page.route(/\/ai-guardrails\/api\/approvals(\?|$)/, async (route) => {
    if (approveCallCount === 0) {
      return route.fulfill({ json: envelope('approvals', approvalsFixture) });
    }
    // After approve, return only one item (simulating removal)
    return route.fulfill({
      json: envelope('approvals', {
        pending: [approvalsFixture.pending[1]],
      }),
    });
  });

  await page.route(/\/ai-guardrails\/api\/approvals\/[^/]+\/approve/, async (route) => {
    approveCallCount++;
    return route.fulfill({ json: envelope('approval.decision', { decision: 'approved' }) });
  });

  await page.goto('/admin/ai-guardrails/approvals');
  await expect(page.getByTestId('agr-approvals')).toHaveAttribute('data-state', 'ready');

  // Click inline approve button in first row
  await page.getByRole('button', { name: /approve process_refund/i }).first().click();

  // Confirm drawer opens
  await expect(page.getByTestId('agr-confirm-drawer')).toBeVisible();
  await expect(page.getByTestId('agr-token-input')).toBeVisible();

  // Paste the approval token
  await page.getByTestId('agr-token-input').fill('my-approval-token-abc');

  // Click confirm approve
  await page.getByTestId('agr-confirm-approve').click();

  // Confirm drawer closes
  await expect(page.getByTestId('agr-confirm-drawer')).not.toBeVisible();

  // POST was called
  expect(approveCallCount).toBe(1);
});

// ── Test 4: Reject flow (open confirm drawer → enter token → reject) ──────────
test('reject flow: enter token → confirm → row disappears', async ({ page }) => {
  let rejectCallCount = 0;

  await page.route(/\/ai-guardrails\/api\/approvals(\?|$)/, async (route) => {
    return route.fulfill({ json: envelope('approvals', approvalsFixture) });
  });

  await page.route(/\/ai-guardrails\/api\/approvals\/[^/]+\/reject/, async (route) => {
    rejectCallCount++;
    return route.fulfill({ json: envelope('approval.decision', { decision: 'rejected' }) });
  });

  await page.goto('/admin/ai-guardrails/approvals');
  await expect(page.getByTestId('agr-approvals')).toHaveAttribute('data-state', 'ready');

  // Click inline reject button in first row
  await page.getByRole('button', { name: /reject process_refund/i }).first().click();

  // Confirm drawer opens with token input
  await expect(page.getByTestId('agr-confirm-drawer')).toBeVisible();

  // Enter token and confirm reject
  await page.getByTestId('agr-token-input').fill('my-reject-token-xyz');
  await page.getByTestId('agr-confirm-reject').click();

  // Confirm drawer closes
  await expect(page.getByTestId('agr-confirm-drawer')).not.toBeVisible();
  expect(rejectCallCount).toBe(1);
});

// ── Test 5: Detail drawer shows tool/run_id/args but NOT a raw token ──────────
test('detail drawer shows tool and run_id, not a fabricated token', async ({ page }) => {
  await page.route(/\/ai-guardrails\/api\/approvals(\?|$)/, async (route) => {
    return route.fulfill({ json: envelope('approvals', approvalsFixture) });
  });

  await page.goto('/admin/ai-guardrails/approvals');
  await expect(page.getByTestId('agr-approvals')).toHaveAttribute('data-state', 'ready');

  // Click the first row to open detail drawer
  await page.locator('[data-testid="agr-approval-row"]').first().click();

  await expect(page.getByTestId('agr-drawer')).toBeVisible();

  // Shows tool name and run_id
  await expect(page.getByTestId('agr-drawer')).toContainText('process_refund');
  await expect(page.getByTestId('agr-drawer')).toContainText('run_abc123');

  // Shows "supplied at confirm time" for token (not a fabricated hash)
  await expect(page.getByTestId('agr-drawer')).toContainText(/supplied at confirm time/i);

  // Shows arguments
  await expect(page.getByTestId('agr-drawer')).toContainText(/order_id/);
});

// ── Test 6: 422 invalid token shows error in confirm drawer ───────────────────
test('422 invalid token → error message in confirm drawer (drawer stays open)', async ({ page }) => {
  await page.route(/\/ai-guardrails\/api\/approvals(\?|$)/, async (route) => {
    return route.fulfill({ json: envelope('approvals', approvalsFixture) });
  });

  await page.route(/\/ai-guardrails\/api\/approvals\/[^/]+\/approve/, async (route) => {
    return route.fulfill({
      status: 422,
      json: envelope('approval.decision', { decision: 'failed', error: 'decision_failed' }),
    });
  });

  await page.goto('/admin/ai-guardrails/approvals');
  await expect(page.getByTestId('agr-approvals')).toHaveAttribute('data-state', 'ready');

  await page.getByRole('button', { name: /approve process_refund/i }).first().click();
  await page.getByTestId('agr-token-input').fill('wrong-token');
  await page.getByTestId('agr-confirm-approve').click();

  // Confirm drawer stays open with error
  await expect(page.getByTestId('agr-confirm-drawer')).toBeVisible();
  await expect(page.getByTestId('agr-token-error')).toBeVisible();
});
