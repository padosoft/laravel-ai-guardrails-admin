import { expect, test } from '@playwright/test';

const envelope = (schema: string, data: unknown) => ({
  schema_version: 'ai-guardrails.api.v1',
  schema: `ai-guardrails.api.v1.${schema}`,
  data,
});

const settingsFixture = {
  settings: {
    enabled: true,
    tool_firewall: {
      enabled: true,
      owner_keys: ['owner_id', 'user_id'],
      reject_unknown_arguments: false,
    },
    input_screen: {
      enabled: true,
      refusal_message: 'Prompt blocked by safety guardrails.',
      patterns: {
        ignore_previous: '/\\bignore\\s+(all\\s+)?previous\\s+instructions?\\b/iu',
        reveal_system_prompt: '/\\b(reveal|show|print|repeat)\\b/iu',
      },
    },
    output_handler: {
      enabled: true,
      sanitize_html: true,
      neutralize_markdown: true,
      redact_pii: false,
      html_mode: 'escape',
    },
    hitl: {
      enabled: true,
      fallback: 'deny',
      destructive_tools: ['delete_file', 'drop_table'],
    },
    modes: {
      tool_firewall: 'enforce',
      input_screen: 'enforce',
      output_handler: 'monitor',
      hitl: 'enforce',
    },
    normalization: {
      enabled: true,
      nfkc: true,
      strip_zero_width: true,
      casefold: true,
      decode_base64_blobs: false,
      fold_confusables: false,
      max_prompt_length: 32768,
    },
    pattern_safety: {
      on_match_error: 'closed',
      ruleset_version: 'v1.2.0',
    },
    tool_authorization: {
      enabled: true,
      owner_key_depth: 'top_level',
      destructive_match: 'exact',
    },
    audit_hygiene: {
      prompt_storage: 'redact',
    },
    retention: {
      days: 90,
      strategy: 'purge',
    },
  },
};

const overviewFixture = {
  controls: [],
  totals: { attempts_24h: 0, blocked_24h: 0, observed_24h: 0, pending_approvals: 0, sampled: false },
  ruleset_version: 'v1.2.0',
};

test.beforeEach(async ({ page }) => {
  // Mock all shell-level calls
  await page.route('**/ai-guardrails/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/approvals')) {
      return route.fulfill({ json: envelope('approvals', { pending: [] }) });
    }
    return route.fulfill({ json: envelope('generic', {}) });
  });

  // Mock overview
  await page.route(/\/ai-guardrails\/api\/overview(\?|$)/, async (route) => {
    return route.fulfill({ json: envelope('overview', overviewFixture) });
  });

  // Mock settings GET (default: fixture)
  await page.route(/\/ai-guardrails\/api\/settings(\?|$)/, async (route, request) => {
    if (request.method() === 'GET') {
      return route.fulfill({ json: envelope('settings', settingsFixture) });
    }
    return route.continue();
  });
});

// ── Test 1: Settings page loads in ready state ────────────────────────────────
test('settings page loads in ready state', async ({ page }) => {
  await page.goto('/admin/ai-guardrails/settings');

  await expect(page.getByTestId('agr-settings')).toHaveAttribute('data-state', 'ready');

  // Key overridable fields visible
  await expect(page.getByTestId('agr-input-refusal-message')).toBeVisible();
  await expect(page.getByTestId('agr-input-max-prompt-length')).toBeVisible();

  // Read-only infra fields visible but disabled
  await expect(page.getByTestId('agr-readonly-audit.store')).toBeVisible();
  await expect(page.getByTestId('agr-readonly-audit.store')).toBeDisabled();

  // ruleset_version from overview
  await expect(page.getByTestId('agr-ruleset-version')).toContainText('v1.2.0');
});

// ── Test 2: Edit refusal_message + change a mode → Save → SaveBar clears ─────
test('edit refusal_message + change a mode → Save → SaveBar clears', async ({ page }) => {
  let capturedBody: unknown = null;

  // Override settings PUT
  await page.route(/\/ai-guardrails\/api\/settings(\?|$)/, async (route, request) => {
    if (request.method() === 'PUT') {
      capturedBody = JSON.parse(request.postData() ?? '{}');
      return route.fulfill({ json: envelope('settings', settingsFixture) });
    }
    return route.fulfill({ json: envelope('settings', settingsFixture) });
  });

  await page.goto('/admin/ai-guardrails/settings');
  await expect(page.getByTestId('agr-settings')).toHaveAttribute('data-state', 'ready');

  // SaveBar not visible initially
  await expect(page.getByTestId('agr-save-bar')).not.toBeVisible();

  // Edit refusal_message
  const refusalInput = page.getByTestId('agr-input-refusal-message');
  await refusalInput.clear();
  await refusalInput.fill('Updated refusal message');

  // SaveBar appears
  await expect(page.getByTestId('agr-save-bar')).toBeVisible();

  // Change output_handler mode to 'off' using the hidden proxy button
  await page.getByTestId('agr-mode-output_handler-off').click();

  // Click Save
  await page.getByRole('button', { name: /save changes/i }).click();

  // SaveBar disappears after save
  await expect(page.getByTestId('agr-save-bar')).not.toBeVisible();

  // Verify PUT body contained exactly the changed keys
  expect(capturedBody).not.toBeNull();
  const body = capturedBody as { settings: Record<string, unknown> };
  expect(body.settings['input_screen.refusal_message']).toBe('Updated refusal message');
  expect(body.settings['modes.output_handler']).toBe('off');
  // Must NOT contain infra keys
  expect(Object.keys(body.settings).filter((k) => k.startsWith('audit.'))).toHaveLength(0);
});

// ── Test 3: Invalid regex → Save is disabled / blocked ───────────────────────
test('attempt invalid regex → Save button disabled and blocked', async ({ page }) => {
  await page.goto('/admin/ai-guardrails/settings');
  await expect(page.getByTestId('agr-settings')).toHaveAttribute('data-state', 'ready');

  // Enter an invalid pattern (not fully delimited PCRE)
  const patternInput = page.getByTestId('agr-pattern-input-ignore_previous');
  await patternInput.clear();
  await patternInput.fill('not-valid-without-delimiters');

  // Field error badge appears
  await expect(page.getByTestId('agr-pattern-error-ignore_previous')).toBeVisible();

  // SaveBar is visible (dirty) but Save button is disabled
  await expect(page.getByTestId('agr-save-bar')).toBeVisible();
  await expect(page.getByRole('button', { name: /save changes/i })).toBeDisabled();
});

// ── Test 4: Discard reverts changes ──────────────────────────────────────────
test('discard reverts edits and hides SaveBar', async ({ page }) => {
  await page.goto('/admin/ai-guardrails/settings');
  await expect(page.getByTestId('agr-settings')).toHaveAttribute('data-state', 'ready');

  // Make an edit
  const refusalInput = page.getByTestId('agr-input-refusal-message');
  await refusalInput.clear();
  await refusalInput.fill('Temporary change');

  await expect(page.getByTestId('agr-save-bar')).toBeVisible();

  // Discard
  await page.getByRole('button', { name: /discard/i }).click();

  // SaveBar gone
  await expect(page.getByTestId('agr-save-bar')).not.toBeVisible();

  // Value reverted
  await expect(refusalInput).toHaveValue('Prompt blocked by safety guardrails.');
});
