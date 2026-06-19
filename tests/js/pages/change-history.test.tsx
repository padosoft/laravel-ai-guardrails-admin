import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { screen, within, waitFor, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DemoStateProvider } from '../../../resources/js/lib/demoState';
import { ApiEndpointsProvider } from '../../../resources/js/lib/queries';
import { runtimeConfig } from '../../../resources/js/config';
import { renderWithProviders } from '../support/render';
import { server } from '../support/server';
import type { SettingsChangesData } from '../../../resources/js/lib/api/types';
import { ChangeHistoryPage } from '../../../resources/js/pages/ChangeHistoryPage';

// Helper that renders the page inside a router that can detect navigation
function renderWithNavSpy(initialPath = '/settings/audit') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  function LocationDisplay() {
    const location = useLocation();
    return <div data-testid="location-display">{location.pathname}</div>;
  }

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <ApiEndpointsProvider config={runtimeConfig()}>
          <DemoStateProvider>
            <LocationDisplay />
            <Routes>
              <Route path="/settings/audit" element={<ChangeHistoryPage />} />
              <Route path="/settings" element={<div data-testid="settings-page">Settings</div>} />
            </Routes>
          </DemoStateProvider>
        </ApiEndpointsProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ------------------------------------------------------------------ fixtures --

const envelope = (schema: string, data: unknown) => ({
  schema_version: 'ai-guardrails.api.v1',
  schema: `ai-guardrails.api.v1.${schema}`,
  data,
});

const changesFixture: SettingsChangesData = {
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
      old_value: ['org:1'],
      new_value: ['org:1', 'org:2'],
      occurred_at: '2026-06-19T09:00:00Z',
    },
    {
      id: 3,
      actor_id: null,
      key: 'normalization.max_prompt_length',
      old_value: null,
      new_value: 32768,
      occurred_at: '2026-06-19T08:00:00Z',
    },
  ],
};

const emptyFixture: SettingsChangesData = { changes: [] };

// ------------------------------------------------------------------ helpers --

function renderChangeHistory() {
  return renderWithProviders(
    <ApiEndpointsProvider config={runtimeConfig()}>
      <DemoStateProvider>
        <ChangeHistoryPage />
      </DemoStateProvider>
    </ApiEndpointsProvider>,
  );
}

function withMock(data: SettingsChangesData = changesFixture) {
  server.use(
    http.get('*/settings/changes', () =>
      HttpResponse.json(envelope('settings.changes', data)),
    ),
  );
}

// ============================================================ TESTS ============================================================

describe('ChangeHistoryPage', () => {
  // ------------------------------------------------------------------
  // Rows render actor (user)
  // ------------------------------------------------------------------
  it('renders user actor with actor_id text', async () => {
    withMock();
    renderChangeHistory();

    await waitFor(() =>
      expect(screen.getByTestId('agr-change-history')).toHaveAttribute('data-state', 'ready'),
    );

    const rows = screen.getAllByTestId('agr-change-row');
    expect(rows).toHaveLength(3);

    // First row: user actor
    expect(within(rows[0]).getByText('user:alice')).toBeVisible();
  });

  // ------------------------------------------------------------------
  // Rows render actor (system when actor_id is null)
  // ------------------------------------------------------------------
  it('renders system actor when actor_id is null', async () => {
    withMock();
    renderChangeHistory();

    await waitFor(() =>
      expect(screen.getByTestId('agr-change-history')).toHaveAttribute('data-state', 'ready'),
    );

    const rows = screen.getAllByTestId('agr-change-row');
    // Second row: null actor → "system"
    expect(within(rows[1]).getByText('system')).toBeVisible();
  });

  // ------------------------------------------------------------------
  // Key column mono
  // ------------------------------------------------------------------
  it('renders key column in mono', async () => {
    withMock();
    renderChangeHistory();

    await waitFor(() =>
      expect(screen.getByTestId('agr-change-history')).toHaveAttribute('data-state', 'ready'),
    );

    const rows = screen.getAllByTestId('agr-change-row');
    expect(within(rows[0]).getByText('input_screen.enabled')).toBeVisible();
  });

  // ------------------------------------------------------------------
  // old/new diff chips for scalar values
  // ------------------------------------------------------------------
  it('renders old and new value diff chips for scalar values', async () => {
    withMock();
    renderChangeHistory();

    await waitFor(() =>
      expect(screen.getByTestId('agr-change-history')).toHaveAttribute('data-state', 'ready'),
    );

    const rows = screen.getAllByTestId('agr-change-row');
    // Row 0: old=false, new=true
    expect(within(rows[0]).getByTestId('agr-old-value')).toHaveTextContent('false');
    expect(within(rows[0]).getByTestId('agr-new-value')).toHaveTextContent('true');
  });

  // ------------------------------------------------------------------
  // JSON array value stringified
  // ------------------------------------------------------------------
  it('stringifies JSON array values (not raw render)', async () => {
    withMock();
    renderChangeHistory();

    await waitFor(() =>
      expect(screen.getByTestId('agr-change-history')).toHaveAttribute('data-state', 'ready'),
    );

    const rows = screen.getAllByTestId('agr-change-row');
    // Row 1: old_value=["org:1"], new_value=["org:1","org:2"]
    expect(within(rows[1]).getByTestId('agr-old-value')).toHaveTextContent('["org:1"]');
    expect(within(rows[1]).getByTestId('agr-new-value')).toHaveTextContent('["org:1","org:2"]');
  });

  // ------------------------------------------------------------------
  // null old_value → "(unset)"
  // ------------------------------------------------------------------
  it('shows (unset) for null old_value', async () => {
    withMock();
    renderChangeHistory();

    await waitFor(() =>
      expect(screen.getByTestId('agr-change-history')).toHaveAttribute('data-state', 'ready'),
    );

    const rows = screen.getAllByTestId('agr-change-row');
    // Row 2: old_value=null
    expect(within(rows[2]).getByTestId('agr-old-value')).toHaveTextContent('(unset)');
  });

  // ------------------------------------------------------------------
  // "Load more" is shown when there may be more (returned === limit)
  // ------------------------------------------------------------------
  it('shows Load more when returned count equals limit', async () => {
    // Return exactly 50 rows (default limit) → load more visible
    const fiftyChanges: SettingsChangesData = {
      changes: Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        actor_id: null,
        key: `key.${i}`,
        old_value: i,
        new_value: i + 1,
        occurred_at: '2026-06-19T00:00:00Z',
      })),
    };
    withMock(fiftyChanges);
    renderChangeHistory();

    await waitFor(() =>
      expect(screen.getByTestId('agr-change-history')).toHaveAttribute('data-state', 'ready'),
    );

    expect(screen.getByTestId('agr-load-more')).toBeVisible();
  });

  // ------------------------------------------------------------------
  // "Load more" is hidden when fewer rows than limit returned
  // ------------------------------------------------------------------
  it('hides Load more when fewer rows returned than limit (no more data)', async () => {
    withMock(changesFixture); // 3 rows < 50 default limit
    renderChangeHistory();

    await waitFor(() =>
      expect(screen.getByTestId('agr-change-history')).toHaveAttribute('data-state', 'ready'),
    );

    expect(screen.queryByTestId('agr-load-more')).toBeNull();
  });

  // ------------------------------------------------------------------
  // "Load more" REPLACES the list (React Query key includes limit)
  // after clicking, the window is replaced — no appending/duplication
  // ------------------------------------------------------------------
  it('Load more replaces list with the new window (not append)', async () => {
    // secondPage has only 3 rows — the REPLACE window returned at limit>50
    const firstPage: SettingsChangesData = {
      changes: Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        actor_id: 'user:alice',
        key: `key.${i}`,
        old_value: null,
        new_value: i,
        occurred_at: '2026-06-19T00:00:00Z',
      })),
    };
    const secondPage: SettingsChangesData = {
      changes: Array.from({ length: 3 }, (_, i) => ({
        id: i + 51,
        actor_id: 'user:bob',
        key: `new.key.${i}`,
        old_value: null,
        new_value: i,
        occurred_at: '2026-06-19T00:00:00Z',
      })),
    };

    server.use(
      http.get('*/settings/changes', ({ request }) => {
        const url = new URL(request.url);
        const limit = Number(url.searchParams.get('limit') ?? '50');
        if (limit > 50) {
          return HttpResponse.json(envelope('settings.changes', secondPage));
        }
        return HttpResponse.json(envelope('settings.changes', firstPage));
      }),
    );

    renderChangeHistory();
    const user = userEvent.setup();

    await waitFor(() =>
      expect(screen.getByTestId('agr-change-history')).toHaveAttribute('data-state', 'ready'),
    );
    // first window: exactly 50 rows
    expect(screen.getAllByTestId('agr-change-row')).toHaveLength(50);

    // Load more visible
    const loadMoreBtn = screen.getByTestId('agr-load-more');
    await user.click(loadMoreBtn);

    // After refetch: window is REPLACED — exactly 3 rows (secondPage), not 50+3=53
    await waitFor(() => {
      const rows = screen.getAllByTestId('agr-change-row');
      expect(rows).toHaveLength(3);
      const hasBob = rows.some((r) => r.textContent?.includes('user:bob'));
      expect(hasBob).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // "Load more" hides at server max (200)
  // ------------------------------------------------------------------
  it('hides Load more at server max 200', async () => {
    const twoHundredChanges: SettingsChangesData = {
      changes: Array.from({ length: 200 }, (_, i) => ({
        id: i + 1,
        actor_id: null,
        key: `key.${i}`,
        old_value: null,
        new_value: i,
        occurred_at: '2026-06-19T00:00:00Z',
      })),
    };

    server.use(
      http.get('*/settings/changes', ({ request }) => {
        const url = new URL(request.url);
        const limit = Number(url.searchParams.get('limit') ?? '50');
        if (limit >= 200) {
          return HttpResponse.json(envelope('settings.changes', twoHundredChanges));
        }
        // Return 50 rows so load-more shows first
        return HttpResponse.json(
          envelope('settings.changes', {
            changes: twoHundredChanges.changes.slice(0, 50),
          }),
        );
      }),
    );

    renderChangeHistory();
    const user = userEvent.setup();

    await waitFor(() =>
      expect(screen.getByTestId('agr-change-history')).toHaveAttribute('data-state', 'ready'),
    );

    // Click load more 3 times to reach max 200 (50→100→150→200)
    for (let i = 0; i < 3; i++) {
      const btn = screen.queryByTestId('agr-load-more');
      if (!btn) break;
      await user.click(btn);
      await waitFor(() => expect(screen.getByTestId('agr-change-history')).toHaveAttribute('data-state', 'ready'));
    }

    // At 200 rows load more should be hidden
    await waitFor(() => {
      expect(screen.queryByTestId('agr-load-more')).toBeNull();
    });
  });

  // ------------------------------------------------------------------
  // Empty changes → empty-state
  // ------------------------------------------------------------------
  it('shows empty-state when no changes', async () => {
    withMock(emptyFixture);
    renderChangeHistory();

    await waitFor(() =>
      expect(screen.getByTestId('agr-change-history')).toHaveAttribute('data-state', 'empty'),
    );

    expect(screen.getByTestId('agr-change-history-empty')).toHaveTextContent(
      /no configuration changes recorded/i,
    );
    expect(screen.queryAllByTestId('agr-change-row')).toHaveLength(0);
  });

  // ------------------------------------------------------------------
  // "Back to Settings" navigates (must fail if onClick handler is removed)
  // ------------------------------------------------------------------
  it('"Back to Settings" navigates to /settings', async () => {
    withMock();
    renderWithNavSpy();
    const user = userEvent.setup();

    await waitFor(() =>
      expect(screen.getByTestId('agr-change-history')).toHaveAttribute('data-state', 'ready'),
    );

    // Confirm we start at /settings/audit
    expect(screen.getByTestId('location-display')).toHaveTextContent('/settings/audit');

    const backBtn = screen.getByTestId('agr-back-to-settings');
    await user.click(backBtn);

    // After click, MemoryRouter must have navigated to /settings
    await waitFor(() =>
      expect(screen.getByTestId('location-display')).toHaveTextContent('/settings'),
    );
    expect(screen.getByTestId('settings-page')).toBeVisible();
  });

  // ------------------------------------------------------------------
  // XSS-as-text: script/img injection in values renders as text, not DOM
  // ------------------------------------------------------------------
  it('renders XSS payloads as plain text without injecting DOM nodes', async () => {
    const xssFixture: SettingsChangesData = {
      changes: [
        {
          id: 1,
          actor_id: 'user:alice',
          key: 'input_screen.enabled',
          old_value: '<script>alert(1)</script>',
          new_value: '<img src=x onerror="alert(2)">',
          occurred_at: '2026-06-19T10:00:00Z',
        },
      ],
    };
    withMock(xssFixture);
    const { container } = renderChangeHistory();

    await waitFor(() =>
      expect(screen.getByTestId('agr-change-history')).toHaveAttribute('data-state', 'ready'),
    );

    const rows = screen.getAllByTestId('agr-change-row');
    const oldChip = within(rows[0]).getByTestId('agr-old-value');
    const newChip = within(rows[0]).getByTestId('agr-new-value');

    // The literal strings must appear as textContent
    expect(oldChip.textContent).toContain('<script>alert(1)</script>');
    expect(newChip.textContent).toContain('<img src=x onerror="alert(2)">');

    // No actual <script> or <img> elements must be injected
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img[onerror]')).toBeNull();
  });

  // ------------------------------------------------------------------
  // Loading state
  // ------------------------------------------------------------------
  it('shows loading state before data arrives', async () => {
    server.use(
      http.get('*/settings/changes', () => new Promise(() => {})),
    );
    renderChangeHistory();

    expect(screen.getByTestId('agr-change-history')).toHaveAttribute('data-state', 'loading');
  });

  // ------------------------------------------------------------------
  // Error state
  // ------------------------------------------------------------------
  it('shows error state when request fails', async () => {
    server.use(
      http.get('*/settings/changes', () => HttpResponse.error()),
    );
    renderChangeHistory();

    await waitFor(() =>
      expect(screen.getByTestId('agr-change-history')).toHaveAttribute('data-state', 'error'),
    );
  });
});
