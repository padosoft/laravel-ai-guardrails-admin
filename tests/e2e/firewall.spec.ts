import { expect, test } from '@playwright/test';

const envelope = (schema: string, data: unknown) => ({
  schema_version: 'ai-guardrails.api.v1',
  schema: `ai-guardrails.api.v1.${schema}`,
  data,
});

const firewallFixture = {
  entries: [
    {
      id: 1,
      tool: 'send_email',
      principal_id: 'user_42',
      violations: { owner_id: 'argument owner_id is overwritten by principal' },
      violation_count: 1,
      occurred_at: '2026-06-18T10:00:00+00:00',
    },
    {
      id: 2,
      tool: 'delete_file',
      principal_id: 'user_99',
      violations: { unknown_arg: 'argument not in schema' },
      violation_count: 1,
      occurred_at: '2026-06-18T09:30:00+00:00',
    },
  ],
  next_cursor: null,
};

const settingsFixture = {
  settings: {
    tool_firewall: {
      enabled: true,
      owner_keys: ['owner_id', 'user_id'],
      reject_unknown_arguments: false,
    },
    modes: {
      tool_firewall: 'enforce',
    },
    tool_authorization: {
      enabled: true,
      owner_key_depth: 2,
      destructive_match: 'prefix:delete_',
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

  // Mock firewall list
  await page.route(/\/ai-guardrails\/api\/firewall(\?|$)/, async (route) => {
    return route.fulfill({ json: envelope('firewall.list', firewallFixture) });
  });

  // Mock settings GET
  await page.route(/\/ai-guardrails\/api\/settings(\?|$)/, async (route, request) => {
    if (request.method() === 'GET') {
      return route.fulfill({ json: envelope('settings', settingsFixture) });
    }
    return route.continue();
  });
});

// ── Test 1: Page loads with rejection rows ────────────────────────────────────
test('firewall page loads with rejection rows and ENGAGED badge', async ({ page }) => {
  await page.goto('/admin/ai-guardrails/firewall');

  await expect(page.getByTestId('agr-firewall')).toHaveAttribute('data-state', 'ready');

  const rows = page.locator('[data-testid="agr-firewall-row"]');
  await expect(rows).toHaveCount(2);

  // First row has send_email tool
  await expect(rows.nth(0)).toContainText('send_email');
  // Second row has delete_file tool
  await expect(rows.nth(1)).toContainText('delete_file');

  // Status badge shows ENGAGED (enabled=true)
  await expect(page.getByTestId('agr-status-badge')).toContainText(/engaged/i);
});

// ── Test 2: Add owner-key chip → SaveBar appears → Save → SaveBar clears ─────
test('add owner-key chip → SaveBar appears → Save → SaveBar clears', async ({ page }) => {
  let capturedBody: unknown = null;

  // Override settings PUT
  await page.route(/\/ai-guardrails\/api\/settings(\?|$)/, async (route, request) => {
    if (request.method() === 'PUT') {
      capturedBody = JSON.parse(request.postData() ?? '{}');
      return route.fulfill({ json: envelope('settings', settingsFixture) });
    }
    return route.fulfill({ json: envelope('settings', settingsFixture) });
  });

  await page.goto('/admin/ai-guardrails/firewall');

  await expect(page.getByTestId('agr-firewall')).toHaveAttribute('data-state', 'ready');

  // SaveBar not visible initially
  await expect(page.getByTestId('agr-save-bar')).not.toBeVisible();

  // Click "Add owner key"
  await page.getByRole('button', { name: /add owner key/i }).click();

  // Type new key in the input
  const input = page.getByTestId('agr-chip-input');
  await input.fill('account_id');
  await input.press('Enter');

  // SaveBar should now be visible
  await expect(page.getByTestId('agr-save-bar')).toBeVisible();

  // New chip should appear
  await expect(page.getByText('account_id')).toBeVisible();

  // Click Save
  await page.getByRole('button', { name: /save changes/i }).click();

  // SaveBar should disappear after save
  await expect(page.getByTestId('agr-save-bar')).not.toBeVisible();

  // Verify the PUT was called with the new owner_keys
  expect(capturedBody).not.toBeNull();
  const body = capturedBody as { settings: Record<string, unknown> };
  expect(body.settings['tool_firewall.owner_keys']).toContain('account_id');
});

// ── Test 3: Open a rejection drawer ──────────────────────────────────────────
test('clicking a rejection row opens the drawer', async ({ page }) => {
  await page.goto('/admin/ai-guardrails/firewall');

  await expect(page.getByTestId('agr-firewall')).toHaveAttribute('data-state', 'ready');

  // Click first row
  await page.locator('[data-testid="agr-firewall-row"]').first().click();

  // Drawer appears with tool name
  await expect(page.getByTestId('agr-drawer')).toBeVisible();
  await expect(page.getByTestId('agr-drawer')).toContainText('send_email');

  // Close the drawer
  await page.getByTestId('agr-drawer').getByRole('button', { name: /close/i }).click();
  await expect(page.getByTestId('agr-drawer')).not.toBeVisible();
});

// ── Test 4: Discard reverts chip changes ──────────────────────────────────────
test('discard reverts chip changes and hides SaveBar', async ({ page }) => {
  await page.goto('/admin/ai-guardrails/firewall');

  await expect(page.getByTestId('agr-firewall')).toHaveAttribute('data-state', 'ready');

  // Add a chip to make dirty
  await page.getByRole('button', { name: /add owner key/i }).click();
  await page.getByTestId('agr-chip-input').fill('temp_key');
  await page.getByTestId('agr-chip-input').press('Enter');

  await expect(page.getByTestId('agr-save-bar')).toBeVisible();
  await expect(page.getByText('temp_key')).toBeVisible();

  // Discard
  await page.getByRole('button', { name: /discard/i }).click();

  // SaveBar gone
  await expect(page.getByTestId('agr-save-bar')).not.toBeVisible();
  // temp_key chip gone
  await expect(page.getByText('temp_key')).not.toBeVisible();
});
