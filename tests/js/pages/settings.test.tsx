import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DemoStateProvider } from '../../../resources/js/lib/demoState';
import { ApiEndpointsProvider } from '../../../resources/js/lib/queries';
import { runtimeConfig } from '../../../resources/js/config';
import { renderWithProviders } from '../support/render';
import { server } from '../support/server';
import type { SettingsData } from '../../../resources/js/lib/api/types';
import { SettingsPage } from '../../../resources/js/pages/SettingsPage';

// ------------------------------------------------------------------ fixtures --

const envelope = (schema: string, data: unknown) => ({
  schema_version: 'ai-guardrails.api.v1',
  schema: `ai-guardrails.api.v1.${schema}`,
  data,
});

/** Full overridable settings fixture — mirrors what GET /settings returns */
const settingsFixture: SettingsData = {
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

// ------------------------------------------------------------------ helpers --

function renderSettings() {
  return renderWithProviders(
    <ApiEndpointsProvider config={runtimeConfig()}>
      <DemoStateProvider>
        <SettingsPage />
      </DemoStateProvider>
    </ApiEndpointsProvider>,
  );
}

function withDefaultMocks(overrides: { settings?: SettingsData } = {}) {
  server.use(
    http.get('*/settings', () =>
      HttpResponse.json(envelope('settings', overrides.settings ?? settingsFixture)),
    ),
    http.get('*/overview', () =>
      HttpResponse.json(envelope('overview', overviewFixture)),
    ),
  );
}

// ============================================================ TESTS ============================================================

describe('SettingsPage', () => {
  // ------------------------------------------------------------------
  // READY state: page renders
  // ------------------------------------------------------------------
  it('renders in ready state with expected testId', async () => {
    withDefaultMocks();
    renderSettings();

    await waitFor(() =>
      expect(screen.getByTestId('agr-settings')).toHaveAttribute('data-state', 'ready'),
    );
  });

  // ------------------------------------------------------------------
  // Overridable fields are editable
  // ------------------------------------------------------------------
  it('overridable text field (refusal_message) is editable (not disabled)', async () => {
    withDefaultMocks();
    renderSettings();

    await waitFor(() =>
      expect(screen.getByTestId('agr-settings')).toHaveAttribute('data-state', 'ready'),
    );

    const input = screen.getByTestId('agr-input-refusal-message');
    expect(input).not.toBeDisabled();
    expect(input).toHaveValue('Prompt blocked by safety guardrails.');
  });

  it('overridable number field (max_prompt_length) is editable (not disabled)', async () => {
    withDefaultMocks();
    renderSettings();

    await waitFor(() =>
      expect(screen.getByTestId('agr-settings')).toHaveAttribute('data-state', 'ready'),
    );

    const input = screen.getByTestId('agr-input-max-prompt-length');
    expect(input).not.toBeDisabled();
    expect(input).toHaveValue(32768);
  });

  // ------------------------------------------------------------------
  // Non-overridable infra inputs are DISABLED with "set via config" note
  // ------------------------------------------------------------------
  it('non-overridable audit.store input is disabled with "set via config" note', async () => {
    withDefaultMocks();
    renderSettings();

    await waitFor(() =>
      expect(screen.getByTestId('agr-settings')).toHaveAttribute('data-state', 'ready'),
    );

    const el = screen.getByTestId('agr-readonly-audit.store');
    expect(el).toBeDisabled();

    // The "set via config" note must exist somewhere in the section
    expect(screen.getAllByText(/set via config/i).length).toBeGreaterThan(0);
  });

  it('non-overridable audit.table input is disabled', async () => {
    withDefaultMocks();
    renderSettings();

    await waitFor(() =>
      expect(screen.getByTestId('agr-settings')).toHaveAttribute('data-state', 'ready'),
    );

    const el = screen.getByTestId('agr-readonly-audit.table');
    expect(el).toBeDisabled();
  });

  // ------------------------------------------------------------------
  // C1: Master enabled toggle is read-only (disabled), never marks dirty,
  //     never enters the PATCH
  // ------------------------------------------------------------------
  it('C1: master enabled toggle is disabled (not runtime-editable)', async () => {
    withDefaultMocks();
    renderSettings();

    await waitFor(() =>
      expect(screen.getByTestId('agr-settings')).toHaveAttribute('data-state', 'ready'),
    );

    const toggle = screen.getByTestId('agr-readonly-enabled');
    expect(toggle).toBeDisabled();
  });

  it('C1: clicking master enabled toggle does not mark form dirty', async () => {
    withDefaultMocks();
    renderSettings();

    await waitFor(() =>
      expect(screen.getByTestId('agr-settings')).toHaveAttribute('data-state', 'ready'),
    );

    expect(screen.queryByTestId('agr-save-bar')).toBeNull();

    const user = userEvent.setup();
    // Attempt to click the disabled master toggle — should not dirty the form
    const toggle = screen.getByTestId('agr-readonly-enabled');
    await user.click(toggle);

    expect(screen.queryByTestId('agr-save-bar')).toBeNull();
  });

  it('C1: editing other fields never includes `enabled` in the PATCH', async () => {
    const capturedBodies: unknown[] = [];

    server.use(
      http.get('*/settings', () =>
        HttpResponse.json(envelope('settings', settingsFixture)),
      ),
      http.get('*/overview', () =>
        HttpResponse.json(envelope('overview', overviewFixture)),
      ),
      http.put('*/settings', async ({ request }) => {
        const body = await request.json();
        capturedBodies.push(body);
        return HttpResponse.json(envelope('settings', settingsFixture));
      }),
    );

    renderSettings();
    await waitFor(() =>
      expect(screen.getByTestId('agr-settings')).toHaveAttribute('data-state', 'ready'),
    );

    const user = userEvent.setup();
    // Edit a normal overridable field
    const input = screen.getByTestId('agr-input-refusal-message');
    await user.clear(input);
    await user.type(input, 'Changed');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(capturedBodies).toHaveLength(1));
    const body = capturedBodies[0] as { settings: Record<string, unknown> };
    expect(Object.keys(body.settings)).not.toContain('enabled');
  });

  // ------------------------------------------------------------------
  // Editing an overridable field shows SaveBar
  // ------------------------------------------------------------------
  it('editing refusal_message shows SaveBar', async () => {
    withDefaultMocks();
    renderSettings();

    await waitFor(() =>
      expect(screen.getByTestId('agr-settings')).toHaveAttribute('data-state', 'ready'),
    );

    expect(screen.queryByTestId('agr-save-bar')).toBeNull();

    const user = userEvent.setup();
    const input = screen.getByTestId('agr-input-refusal-message');
    await user.clear(input);
    await user.type(input, 'New refusal message');

    expect(screen.getByTestId('agr-save-bar')).toBeInTheDocument();
  });

  it('changing a mode segmented control shows SaveBar', async () => {
    withDefaultMocks();
    renderSettings();

    await waitFor(() =>
      expect(screen.getByTestId('agr-settings')).toHaveAttribute('data-state', 'ready'),
    );

    expect(screen.queryByTestId('agr-save-bar')).toBeNull();

    const user = userEvent.setup();
    // Switch input_screen mode from 'enforce' to 'monitor'
    const monitorBtn = screen.getByTestId('agr-mode-input_screen-monitor');
    await user.click(monitorBtn);

    expect(screen.getByTestId('agr-save-bar')).toBeInTheDocument();
  });

  // ------------------------------------------------------------------
  // Save PUTs ONLY changed overridable dotted keys
  // ------------------------------------------------------------------
  it('Save sends ONLY the changed overridable dotted keys (not infra keys)', async () => {
    const capturedBodies: unknown[] = [];

    server.use(
      http.get('*/settings', () =>
        HttpResponse.json(envelope('settings', settingsFixture)),
      ),
      http.get('*/overview', () =>
        HttpResponse.json(envelope('overview', overviewFixture)),
      ),
      http.put('*/settings', async ({ request }) => {
        const body = await request.json();
        capturedBodies.push(body);
        return HttpResponse.json(envelope('settings', settingsFixture));
      }),
    );

    renderSettings();

    await waitFor(() =>
      expect(screen.getByTestId('agr-settings')).toHaveAttribute('data-state', 'ready'),
    );

    const user = userEvent.setup();

    // 1. Edit refusal_message
    const input = screen.getByTestId('agr-input-refusal-message');
    await user.clear(input);
    await user.type(input, 'Changed refusal');

    // 2. Change output_handler mode from 'monitor' to 'off'
    await user.click(screen.getByTestId('agr-mode-output_handler-off'));

    // 3. Edit retention.days
    const daysInput = screen.getByTestId('agr-input-retention-days');
    await user.clear(daysInput);
    await user.type(daysInput, '30');

    // Save
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(capturedBodies).toHaveLength(1));

    const body = capturedBodies[0] as { settings: Record<string, unknown> };
    const keys = Object.keys(body.settings);

    // Must contain the 3 changed keys
    expect(body.settings).toHaveProperty('input_screen.refusal_message', 'Changed refusal');
    expect(body.settings).toHaveProperty('modes.output_handler', 'off');
    expect(body.settings).toHaveProperty('retention.days', 30);

    // Must NOT contain any infra (non-overridable) keys
    expect(keys.filter(k => k.startsWith('audit.'))).toHaveLength(0);
    expect(keys.filter(k => k.startsWith('firewall_log.'))).toHaveLength(0);
    expect(keys.filter(k => k.startsWith('settings_audit.'))).toHaveLength(0);
    // Must NOT include unchanged overridable keys
    expect(keys).not.toContain('normalization.max_prompt_length');
    expect(keys).not.toContain('hitl.fallback');
    // Should be exactly 3 keys
    expect(keys).toHaveLength(3);
  });

  // ------------------------------------------------------------------
  // Invalid regex in patterns shows field error AND disables Save
  // ------------------------------------------------------------------
  it('an invalid PCRE pattern shows the field error and disables Save button', async () => {
    withDefaultMocks();
    renderSettings();

    await waitFor(() =>
      expect(screen.getByTestId('agr-settings')).toHaveAttribute('data-state', 'ready'),
    );

    const user = userEvent.setup();

    // Find the pattern input for ignore_previous
    const patternInput = screen.getByTestId('agr-pattern-input-ignore_previous');
    // Use fireEvent.change to avoid userEvent keyboard parser choking on '[' character
    fireEvent.change(patternInput, { target: { value: '[invalid regex' } });

    // Field error should appear
    await waitFor(() => {
      expect(screen.getByTestId('agr-pattern-error-ignore_previous')).toBeInTheDocument();
    });

    // Save button should be disabled (Save is BLOCKED when any pattern invalid)
    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    expect(saveBtn).toBeDisabled();
  });

  // ------------------------------------------------------------------
  // 422 maps a server field error to the patterns field
  // ------------------------------------------------------------------
  it('422 with pattern field error is surfaced in SaveBar + edits preserved', async () => {
    server.use(
      http.get('*/settings', () =>
        HttpResponse.json(envelope('settings', settingsFixture)),
      ),
      http.get('*/overview', () =>
        HttpResponse.json(envelope('overview', overviewFixture)),
      ),
      http.put('*/settings', () =>
        HttpResponse.json(
          {
            message: 'Validation failed',
            errors: { 'input_screen.patterns': ['Invalid PCRE pattern on key: ignore_previous'] },
          },
          { status: 422 },
        ),
      ),
    );

    renderSettings();

    await waitFor(() =>
      expect(screen.getByTestId('agr-settings')).toHaveAttribute('data-state', 'ready'),
    );

    const user = userEvent.setup();

    // Make a change to trigger dirty
    const input = screen.getByTestId('agr-input-refusal-message');
    await user.clear(input);
    await user.type(input, 'New message');

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    // SaveBar still present after failed save (edits not nulled)
    await waitFor(() => {
      expect(screen.getByTestId('agr-save-bar')).toBeInTheDocument();
      expect(screen.getByTestId('agr-save-error')).toBeInTheDocument();
    });

    // I6: per-pattern inline badge must appear for ALL currently-edited patterns
    // (server error key was `input_screen.patterns` — applies to all edited rids)
    await waitFor(() => {
      expect(screen.getByTestId('agr-pattern-error-ignore_previous')).toBeInTheDocument();
      expect(screen.getByTestId('agr-pattern-error-reveal_system_prompt')).toBeInTheDocument();
    });

    // Edits are preserved (SaveBar still dirty, form not reset)
    expect(screen.getByTestId('agr-input-refusal-message')).toHaveValue('New message');
  });

  // ------------------------------------------------------------------
  // Edit-back-to-original clears dirty (toggle round-trip)
  // ------------------------------------------------------------------
  it('editing back to original value clears dirty (toggle round-trip)', async () => {
    withDefaultMocks();
    renderSettings();

    await waitFor(() =>
      expect(screen.getByTestId('agr-settings')).toHaveAttribute('data-state', 'ready'),
    );

    const user = userEvent.setup();

    // Change mode from 'enforce' to 'monitor'
    await user.click(screen.getByTestId('agr-mode-tool_firewall-monitor'));
    expect(screen.getByTestId('agr-save-bar')).toBeInTheDocument();

    // Change back to 'enforce'
    await user.click(screen.getByTestId('agr-mode-tool_firewall-enforce'));

    // Should no longer be dirty
    expect(screen.queryByTestId('agr-save-bar')).toBeNull();
  });

  // ------------------------------------------------------------------
  // ruleset_version renders read-only from overview
  // ------------------------------------------------------------------
  it('renders ruleset_version as read-only chip sourced from overview', async () => {
    withDefaultMocks();
    renderSettings();

    await waitFor(() =>
      expect(screen.getByTestId('agr-settings')).toHaveAttribute('data-state', 'ready'),
    );

    const chip = screen.getByTestId('agr-ruleset-version');
    expect(chip).toHaveTextContent('v1.2.0');
    // It should not be an editable input
    expect(chip.tagName.toLowerCase()).not.toBe('input');
  });

  // ------------------------------------------------------------------
  // Error state
  // ------------------------------------------------------------------
  it('shows data-state=error when settings API fails', async () => {
    server.use(
      http.get('*/settings', () =>
        HttpResponse.json({ message: 'Server error' }, { status: 500 }),
      ),
      http.get('*/overview', () =>
        HttpResponse.json(envelope('overview', overviewFixture)),
      ),
    );

    renderSettings();

    await waitFor(() =>
      expect(screen.getByTestId('agr-settings')).toHaveAttribute('data-state', 'error'),
    );
  });

  // ------------------------------------------------------------------
  // Discard reverts and hides SaveBar
  // ------------------------------------------------------------------
  it('Discard reverts and hides SaveBar', async () => {
    withDefaultMocks();
    renderSettings();

    await waitFor(() =>
      expect(screen.getByTestId('agr-settings')).toHaveAttribute('data-state', 'ready'),
    );

    const user = userEvent.setup();
    const input = screen.getByTestId('agr-input-refusal-message');
    const original = input.getAttribute('value') ?? '';

    await user.clear(input);
    await user.type(input, 'Temporary message');

    expect(screen.getByTestId('agr-save-bar')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /discard/i }));

    expect(screen.queryByTestId('agr-save-bar')).toBeNull();
    expect(screen.getByTestId('agr-input-refusal-message')).toHaveValue(original || 'Prompt blocked by safety guardrails.');
  });

  // ------------------------------------------------------------------
  // Order-insensitive dirty for destructive_tools array
  // ------------------------------------------------------------------
  it('removing then re-adding a destructive_tools chip (same set) clears dirty', async () => {
    withDefaultMocks();
    renderSettings();

    await waitFor(() =>
      expect(screen.getByTestId('agr-settings')).toHaveAttribute('data-state', 'ready'),
    );

    const user = userEvent.setup();

    // Remove delete_file chip
    await user.click(screen.getByRole('button', { name: /remove delete_file/i }));
    expect(screen.getByTestId('agr-save-bar')).toBeInTheDocument();

    // Re-add it
    const addBtn = screen.getByRole('button', { name: /add destructive tool/i });
    await user.click(addBtn);
    const input = screen.getByTestId('agr-chip-input');
    await user.type(input, 'delete_file');
    await user.keyboard('{Enter}');

    // Now both chips exist: delete_file and drop_table (same set as server)
    expect(screen.queryByTestId('agr-save-bar')).toBeNull();
  });

  // ------------------------------------------------------------------
  // "Change history" button navigates to /settings/audit
  // ------------------------------------------------------------------
  it('Change history button is present', async () => {
    withDefaultMocks();
    renderSettings();

    await waitFor(() =>
      expect(screen.getByTestId('agr-settings')).toHaveAttribute('data-state', 'ready'),
    );

    expect(screen.getByTestId('agr-change-history-btn')).toBeInTheDocument();
  });
});
