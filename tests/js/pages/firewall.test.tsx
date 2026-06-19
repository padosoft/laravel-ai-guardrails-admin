import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DemoStateProvider } from '../../../resources/js/lib/demoState';
import { ApiEndpointsProvider } from '../../../resources/js/lib/queries';
import { runtimeConfig } from '../../../resources/js/config';
import { renderWithProviders } from '../support/render';
import { server } from '../support/server';
import type { FirewallListData, SettingsData } from '../../../resources/js/lib/api/types';
import { FirewallPage } from '../../../resources/js/pages/FirewallPage';

// ------------------------------------------------------------------ fixtures --

const envelope = (schema: string, data: unknown) => ({
  schema_version: 'ai-guardrails.api.v1',
  schema: `ai-guardrails.api.v1.${schema}`,
  data,
});

const firewallFixture: FirewallListData = {
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

const settingsFixture: SettingsData = {
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

// ------------------------------------------------------------------ helpers --

function renderFirewall() {
  return renderWithProviders(
    <ApiEndpointsProvider config={runtimeConfig()}>
      <DemoStateProvider>
        <FirewallPage />
      </DemoStateProvider>
    </ApiEndpointsProvider>,
  );
}

function withDefaultMocks(overrides: { settings?: SettingsData; firewall?: FirewallListData } = {}) {
  server.use(
    http.get('*/firewall', () =>
      HttpResponse.json(envelope('firewall.list', overrides.firewall ?? firewallFixture)),
    ),
    http.get('*/settings', () =>
      HttpResponse.json(envelope('settings', overrides.settings ?? settingsFixture)),
    ),
  );
}

// ============================================================ TESTS ============================================================

describe('FirewallPage', () => {
  // ------------------------------------------------------------------
  // READY state: rejection rows render from fixture
  // ------------------------------------------------------------------
  it('renders rejection rows from fixture', async () => {
    withDefaultMocks();
    renderFirewall();

    await waitFor(() =>
      expect(screen.getByTestId('agr-firewall')).toHaveAttribute('data-state', 'ready'),
    );

    const rows = screen.getAllByTestId('agr-firewall-row');
    expect(rows).toHaveLength(2);

    // First row: send_email tool
    expect(within(rows[0]).getByText('send_email')).toBeDefined();
    // Second row: delete_file tool
    expect(within(rows[1]).getByText('delete_file')).toBeDefined();
  });

  // ------------------------------------------------------------------
  // Status badge: ENGAGED when enabled=true
  // ------------------------------------------------------------------
  it('shows ENGAGED badge when firewall is enabled', async () => {
    withDefaultMocks();
    renderFirewall();

    await waitFor(() =>
      expect(screen.getByTestId('agr-firewall')).toHaveAttribute('data-state', 'ready'),
    );

    expect(screen.getByTestId('agr-status-badge')).toHaveTextContent(/engaged/i);
  });

  // ------------------------------------------------------------------
  // Status badge: DISABLED when enabled=false
  // ------------------------------------------------------------------
  it('shows DISABLED badge when firewall is disabled', async () => {
    withDefaultMocks({
      settings: {
        settings: {
          ...settingsFixture.settings,
          tool_firewall: {
            ...(settingsFixture.settings.tool_firewall as Record<string, unknown>),
            enabled: false,
          },
        },
      },
    });
    renderFirewall();

    await waitFor(() =>
      expect(screen.getByTestId('agr-firewall')).toHaveAttribute('data-state', 'ready'),
    );

    expect(screen.getByTestId('agr-status-badge')).toHaveTextContent(/disabled/i);
  });

  // ------------------------------------------------------------------
  // Editing toggle makes SaveBar appear
  // ------------------------------------------------------------------
  it('toggling "Firewall enabled" makes SaveBar appear', async () => {
    withDefaultMocks();
    renderFirewall();

    await waitFor(() =>
      expect(screen.getByTestId('agr-firewall')).toHaveAttribute('data-state', 'ready'),
    );

    // SaveBar not visible initially
    expect(screen.queryByTestId('agr-save-bar')).toBeNull();

    const user = userEvent.setup();
    // Click the "Firewall enabled" toggle
    const toggle = screen.getByRole('switch', { name: /firewall enabled/i });
    await user.click(toggle);

    expect(screen.getByTestId('agr-save-bar')).toBeDefined();
  });

  // ------------------------------------------------------------------
  // Editing "Reject unknown arguments" toggle makes SaveBar appear
  // ------------------------------------------------------------------
  it('toggling "Reject unknown arguments" makes SaveBar appear', async () => {
    withDefaultMocks();
    renderFirewall();

    await waitFor(() =>
      expect(screen.getByTestId('agr-firewall')).toHaveAttribute('data-state', 'ready'),
    );

    expect(screen.queryByTestId('agr-save-bar')).toBeNull();

    const user = userEvent.setup();
    const toggle = screen.getByRole('switch', { name: /reject unknown arguments/i });
    await user.click(toggle);

    expect(screen.getByTestId('agr-save-bar')).toBeDefined();
  });

  // ------------------------------------------------------------------
  // Adding an owner-key chip makes SaveBar appear
  // ------------------------------------------------------------------
  it('adding an owner-key chip makes SaveBar appear', async () => {
    withDefaultMocks();
    renderFirewall();

    await waitFor(() =>
      expect(screen.getByTestId('agr-firewall')).toHaveAttribute('data-state', 'ready'),
    );

    expect(screen.queryByTestId('agr-save-bar')).toBeNull();

    const user = userEvent.setup();
    const addBtn = screen.getByRole('button', { name: /add owner key/i });
    await user.click(addBtn);

    // Fill in the input that appears
    const input = screen.getByTestId('agr-chip-input');
    await user.type(input, 'new_key');
    await user.keyboard('{Enter}');

    expect(screen.getByTestId('agr-save-bar')).toBeDefined();
    // The new chip should appear
    expect(screen.getByText('new_key')).toBeDefined();
  });

  // ------------------------------------------------------------------
  // Removing an owner-key chip makes SaveBar appear
  // ------------------------------------------------------------------
  it('removing an owner-key chip makes SaveBar appear', async () => {
    withDefaultMocks();
    renderFirewall();

    await waitFor(() =>
      expect(screen.getByTestId('agr-firewall')).toHaveAttribute('data-state', 'ready'),
    );

    expect(screen.queryByTestId('agr-save-bar')).toBeNull();

    const user = userEvent.setup();
    // Remove "owner_id" chip
    const removeBtn = screen.getByRole('button', { name: /remove owner_id/i });
    await user.click(removeBtn);

    expect(screen.getByTestId('agr-save-bar')).toBeDefined();
  });

  // ------------------------------------------------------------------
  // Save calls PUT /settings with ONLY changed firewall keys
  // ------------------------------------------------------------------
  it('Save calls PUT /settings with only changed firewall keys (not tool_authorization)', async () => {
    const capturedBodies: unknown[] = [];

    server.use(
      http.get('*/firewall', () =>
        HttpResponse.json(envelope('firewall.list', firewallFixture)),
      ),
      http.get('*/settings', () =>
        HttpResponse.json(envelope('settings', settingsFixture)),
      ),
      http.put('*/settings', async ({ request }) => {
        const body = await request.json();
        capturedBodies.push(body);
        return HttpResponse.json(envelope('settings', settingsFixture));
      }),
    );

    renderFirewall();

    await waitFor(() =>
      expect(screen.getByTestId('agr-firewall')).toHaveAttribute('data-state', 'ready'),
    );

    const user = userEvent.setup();
    // Toggle "Reject unknown arguments" (was false, now true)
    const toggle = screen.getByRole('switch', { name: /reject unknown arguments/i });
    await user.click(toggle);

    // Click Save
    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(capturedBodies).toHaveLength(1);
    });

    const body = capturedBodies[0] as { settings: Record<string, unknown> };
    // Must contain the changed firewall key
    expect(body.settings).toHaveProperty('tool_firewall.reject_unknown_arguments', true);
    // Must NOT contain tool_authorization keys
    expect(Object.keys(body.settings).filter(k => k.startsWith('tool_authorization'))).toHaveLength(0);
    // Must NOT contain mode keys
    expect(Object.keys(body.settings).filter(k => k.startsWith('modes'))).toHaveLength(0);
  });

  // ------------------------------------------------------------------
  // Save sends ONLY changed keys (not unchanged ones)
  // ------------------------------------------------------------------
  it('Save sends only the actually changed keys, not all firewall keys', async () => {
    const capturedBodies: unknown[] = [];

    server.use(
      http.get('*/firewall', () =>
        HttpResponse.json(envelope('firewall.list', firewallFixture)),
      ),
      http.get('*/settings', () =>
        HttpResponse.json(envelope('settings', settingsFixture)),
      ),
      http.put('*/settings', async ({ request }) => {
        const body = await request.json();
        capturedBodies.push(body);
        return HttpResponse.json(envelope('settings', settingsFixture));
      }),
    );

    renderFirewall();

    await waitFor(() =>
      expect(screen.getByTestId('agr-firewall')).toHaveAttribute('data-state', 'ready'),
    );

    const user = userEvent.setup();
    // Only toggle enabled (was true, now false)
    const toggle = screen.getByRole('switch', { name: /firewall enabled/i });
    await user.click(toggle);

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(capturedBodies).toHaveLength(1);
    });

    const body = capturedBodies[0] as { settings: Record<string, unknown> };
    // Only enabled changed
    expect(body.settings).toHaveProperty('tool_firewall.enabled', false);
    // owner_keys and reject_unknown_arguments unchanged — must NOT be included
    expect(Object.keys(body.settings)).not.toContain('tool_firewall.owner_keys');
    expect(Object.keys(body.settings)).not.toContain('tool_firewall.reject_unknown_arguments');
  });

  // ------------------------------------------------------------------
  // Discard reverts and hides SaveBar
  // ------------------------------------------------------------------
  it('Discard reverts local state and hides SaveBar', async () => {
    withDefaultMocks();
    renderFirewall();

    await waitFor(() =>
      expect(screen.getByTestId('agr-firewall')).toHaveAttribute('data-state', 'ready'),
    );

    const user = userEvent.setup();
    const toggle = screen.getByRole('switch', { name: /firewall enabled/i });
    // Toggle it to make dirty
    await user.click(toggle);

    expect(screen.getByTestId('agr-save-bar')).toBeDefined();

    // Discard
    await user.click(screen.getByRole('button', { name: /discard/i }));

    // SaveBar gone
    expect(screen.queryByTestId('agr-save-bar')).toBeNull();

    // Toggle should be back to its original value (enabled=true → aria-checked=true)
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  // ------------------------------------------------------------------
  // 422 on Save surfaces field error
  // ------------------------------------------------------------------
  it('422 on Save surfaces an error message', async () => {
    server.use(
      http.get('*/firewall', () =>
        HttpResponse.json(envelope('firewall.list', firewallFixture)),
      ),
      http.get('*/settings', () =>
        HttpResponse.json(envelope('settings', settingsFixture)),
      ),
      http.put('*/settings', () =>
        HttpResponse.json(
          { message: 'Validation failed', errors: { 'tool_firewall.owner_keys': ['Invalid key format'] } },
          { status: 422 },
        ),
      ),
    );

    renderFirewall();

    await waitFor(() =>
      expect(screen.getByTestId('agr-firewall')).toHaveAttribute('data-state', 'ready'),
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('switch', { name: /firewall enabled/i }));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByTestId('agr-save-error')).toBeDefined();
    });
  });

  // ------------------------------------------------------------------
  // Tool-authorization section is read-only (no inputs)
  // ------------------------------------------------------------------
  it('tool-authorization section is read-only (no editable inputs)', async () => {
    withDefaultMocks();
    renderFirewall();

    await waitFor(() =>
      expect(screen.getByTestId('agr-firewall')).toHaveAttribute('data-state', 'ready'),
    );

    const authSection = screen.getByTestId('agr-tool-authorization');
    // No text inputs in this section
    expect(within(authSection).queryAllByRole('textbox')).toHaveLength(0);
    // No checkboxes or switches
    expect(within(authSection).queryAllByRole('switch')).toHaveLength(0);
    expect(within(authSection).queryAllByRole('checkbox')).toHaveLength(0);
    // Values are present as text
    expect(within(authSection).getByText('2')).toBeDefined();
    expect(within(authSection).getByText('prefix:delete_')).toBeDefined();
  });

  // ------------------------------------------------------------------
  // Empty rejections → empty state
  // ------------------------------------------------------------------
  it('shows empty state when no rejections', async () => {
    withDefaultMocks({ firewall: { entries: [], next_cursor: null } });
    renderFirewall();

    await waitFor(() =>
      expect(screen.getByTestId('agr-firewall')).toHaveAttribute('data-state', 'ready'),
    );

    expect(screen.queryAllByTestId('agr-firewall-row')).toHaveLength(0);
    expect(screen.getByTestId('agr-rejections-empty')).toBeDefined();
  });

  // ------------------------------------------------------------------
  // Error state when API fails
  // ------------------------------------------------------------------
  it('shows data-state=error when settings API fails', async () => {
    server.use(
      http.get('*/firewall', () =>
        HttpResponse.json(envelope('firewall.list', firewallFixture)),
      ),
      http.get('*/settings', () =>
        HttpResponse.json({ message: 'Server error' }, { status: 500 }),
      ),
    );

    renderFirewall();

    await waitFor(() =>
      expect(screen.getByTestId('agr-firewall')).toHaveAttribute('data-state', 'error'),
    );
  });

  // ------------------------------------------------------------------
  // Row click opens rejection drawer
  // ------------------------------------------------------------------
  it('clicking a rejection row opens the drawer', async () => {
    withDefaultMocks();
    renderFirewall();

    await waitFor(() =>
      expect(screen.getByTestId('agr-firewall')).toHaveAttribute('data-state', 'ready'),
    );

    const user = userEvent.setup();
    await user.click(screen.getAllByTestId('agr-firewall-row')[0]);

    await waitFor(() => {
      expect(screen.getByTestId('agr-drawer')).toBeVisible();
    });

    // Drawer shows the tool name
    expect(screen.getByTestId('agr-drawer')).toHaveTextContent('send_email');
  });

  // ------------------------------------------------------------------
  // Drawer can be closed
  // ------------------------------------------------------------------
  it('rejection drawer can be closed', async () => {
    withDefaultMocks();
    renderFirewall();

    await waitFor(() =>
      expect(screen.getByTestId('agr-firewall')).toHaveAttribute('data-state', 'ready'),
    );

    const user = userEvent.setup();
    await user.click(screen.getAllByTestId('agr-firewall-row')[0]);

    await waitFor(() => {
      expect(screen.getByTestId('agr-drawer')).toBeVisible();
    });

    await user.click(within(screen.getByTestId('agr-drawer')).getByRole('button', { name: /close/i }));

    await waitFor(() => {
      expect(screen.queryByTestId('agr-drawer')).toBeNull();
    });
  });

  // ------------------------------------------------------------------
  // SaveBar hides after successful save (re-fetch clears dirty)
  // ------------------------------------------------------------------
  it('SaveBar hides after successful save', async () => {
    let putCount = 0;
    server.use(
      http.get('*/firewall', () =>
        HttpResponse.json(envelope('firewall.list', firewallFixture)),
      ),
      http.get('*/settings', () =>
        HttpResponse.json(envelope('settings', settingsFixture)),
      ),
      http.put('*/settings', async () => {
        putCount++;
        return HttpResponse.json(envelope('settings', settingsFixture));
      }),
    );

    renderFirewall();

    await waitFor(() =>
      expect(screen.getByTestId('agr-firewall')).toHaveAttribute('data-state', 'ready'),
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('switch', { name: /firewall enabled/i }));
    expect(screen.getByTestId('agr-save-bar')).toBeDefined();

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(putCount).toBe(1);
      expect(screen.queryByTestId('agr-save-bar')).toBeNull();
    });
  });
});
