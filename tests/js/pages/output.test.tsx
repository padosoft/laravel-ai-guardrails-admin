import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DemoStateProvider } from '../../../resources/js/lib/demoState';
import { ApiEndpointsProvider } from '../../../resources/js/lib/queries';
import { runtimeConfig } from '../../../resources/js/config';
import { renderWithProviders } from '../support/render';
import { server } from '../support/server';
import type { OutputStatsData, SettingsData } from '../../../resources/js/lib/api/types';
import { OutputPage } from '../../../resources/js/pages/OutputPage';

// ------------------------------------------------------------------ fixtures --

const envelope = (schema: string, data: unknown) => ({
  schema_version: 'ai-guardrails.api.v1',
  schema: `ai-guardrails.api.v1.${schema}`,
  data,
});

const outputStatsFixture: OutputStatsData = {
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

const outputStatsEmptyDetectors: OutputStatsData = {
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
};

const settingsFixture: SettingsData = {
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

const settingsMonitor: SettingsData = {
  settings: {
    output_handler: {
      enabled: true,
      sanitize_html: true,
      neutralize_markdown: true,
      redact_pii: false,
      html_mode: 'escape',
    },
    modes: {
      output_handler: 'monitor',
    },
  },
};

// ------------------------------------------------------------------ helpers --

function renderOutput() {
  return renderWithProviders(
    <ApiEndpointsProvider config={runtimeConfig()}>
      <DemoStateProvider>
        <OutputPage />
      </DemoStateProvider>
    </ApiEndpointsProvider>,
  );
}

function withDefaultMocks(overrides: { stats?: OutputStatsData; settings?: SettingsData } = {}) {
  server.use(
    http.get('*/output/stats', () =>
      HttpResponse.json(envelope('output.stats', overrides.stats ?? outputStatsFixture)),
    ),
    http.get('*/settings', () =>
      HttpResponse.json(envelope('settings', overrides.settings ?? settingsFixture)),
    ),
  );
}

// ============================================================ TESTS ============================================================

describe('OutputPage', () => {
  // ------------------------------------------------------------------
  // 4 stat cards render from fixture counts
  // ------------------------------------------------------------------
  it('renders 4 stat cards with counts from fixture', async () => {
    withDefaultMocks();
    renderOutput();

    await waitFor(() =>
      expect(screen.getByTestId('agr-output')).toHaveAttribute('data-state', 'ready'),
    );

    // html_stripped = 42
    expect(screen.getByTestId('agr-stat-html')).toHaveTextContent('42');
    // markdown_sanitized = 17
    expect(screen.getByTestId('agr-stat-markdown')).toHaveTextContent('17');
    // structured_validation_failure = 3
    expect(screen.getByTestId('agr-stat-structured')).toHaveTextContent('3');
    // pii_redaction = 8
    expect(screen.getByTestId('agr-stat-pii')).toHaveTextContent('8');
  });

  // ------------------------------------------------------------------
  // PII by-detector bars render for non-empty by_detector
  // ------------------------------------------------------------------
  it('renders PII by-detector bars for {email:3, phone:2, iban:1}', async () => {
    withDefaultMocks();
    renderOutput();

    await waitFor(() =>
      expect(screen.getByTestId('agr-output')).toHaveAttribute('data-state', 'ready'),
    );

    // Bars are rendered for each detector
    expect(screen.getByTestId('agr-bar-email')).toBeDefined();
    expect(screen.getByTestId('agr-bar-phone')).toBeDefined();
    expect(screen.getByTestId('agr-bar-iban')).toBeDefined();

    // Values are present
    expect(screen.getByTestId('agr-bar-email')).toHaveTextContent('3');
    expect(screen.getByTestId('agr-bar-phone')).toHaveTextContent('2');
    expect(screen.getByTestId('agr-bar-iban')).toHaveTextContent('1');
  });

  // ------------------------------------------------------------------
  // Empty by_detector → empty state message (not a broken chart)
  // ------------------------------------------------------------------
  it('shows empty-state when by_detector is {}', async () => {
    withDefaultMocks({ stats: outputStatsEmptyDetectors });
    renderOutput();

    await waitFor(() =>
      expect(screen.getByTestId('agr-output')).toHaveAttribute('data-state', 'ready'),
    );

    expect(screen.getByTestId('agr-bar-empty')).toBeDefined();
    // No bars rendered
    expect(screen.queryAllByTestId(/^agr-bar-/)).toHaveLength(1); // only the empty state testid
  });

  // ------------------------------------------------------------------
  // Status badge: ENFORCE when modes.output_handler = 'enforce'
  // ------------------------------------------------------------------
  it('shows ENFORCE badge when mode is enforce', async () => {
    withDefaultMocks();
    renderOutput();

    await waitFor(() =>
      expect(screen.getByTestId('agr-output')).toHaveAttribute('data-state', 'ready'),
    );

    expect(screen.getByTestId('agr-status-badge')).toHaveTextContent(/enforce/i);
  });

  // ------------------------------------------------------------------
  // Status badge: MONITOR when modes.output_handler = 'monitor'
  // ------------------------------------------------------------------
  it('shows MONITOR badge when mode is monitor', async () => {
    withDefaultMocks({ settings: settingsMonitor });
    renderOutput();

    await waitFor(() =>
      expect(screen.getByTestId('agr-output')).toHaveAttribute('data-state', 'ready'),
    );

    expect(screen.getByTestId('agr-status-badge')).toHaveTextContent(/monitor/i);
  });

  // ------------------------------------------------------------------
  // Toggling a config toggle shows SaveBar
  // ------------------------------------------------------------------
  it('toggling "Sanitize HTML" shows SaveBar', async () => {
    withDefaultMocks();
    renderOutput();

    await waitFor(() =>
      expect(screen.getByTestId('agr-output')).toHaveAttribute('data-state', 'ready'),
    );

    expect(screen.queryByTestId('agr-save-bar')).toBeNull();

    const user = userEvent.setup();
    const toggle = screen.getByRole('switch', { name: /sanitize html/i });
    await user.click(toggle);

    expect(screen.getByTestId('agr-save-bar')).toBeDefined();
  });

  // ------------------------------------------------------------------
  // Toggling "Neutralize markdown" shows SaveBar
  // ------------------------------------------------------------------
  it('toggling "Neutralize markdown" shows SaveBar', async () => {
    withDefaultMocks();
    renderOutput();

    await waitFor(() =>
      expect(screen.getByTestId('agr-output')).toHaveAttribute('data-state', 'ready'),
    );

    const user = userEvent.setup();
    const toggle = screen.getByRole('switch', { name: /neutralize markdown/i });
    await user.click(toggle);

    expect(screen.getByTestId('agr-save-bar')).toBeDefined();
  });

  // ------------------------------------------------------------------
  // Toggling "Redact PII" shows SaveBar
  // ------------------------------------------------------------------
  it('toggling "Redact PII" shows SaveBar', async () => {
    withDefaultMocks();
    renderOutput();

    await waitFor(() =>
      expect(screen.getByTestId('agr-output')).toHaveAttribute('data-state', 'ready'),
    );

    const user = userEvent.setup();
    const toggle = screen.getByRole('switch', { name: /redact pii/i });
    await user.click(toggle);

    expect(screen.getByTestId('agr-save-bar')).toBeDefined();
  });

  // ------------------------------------------------------------------
  // Changing html_mode shows SaveBar
  // ------------------------------------------------------------------
  it('changing html_mode to "allowlist" shows SaveBar', async () => {
    withDefaultMocks();
    renderOutput();

    await waitFor(() =>
      expect(screen.getByTestId('agr-output')).toHaveAttribute('data-state', 'ready'),
    );

    expect(screen.queryByTestId('agr-save-bar')).toBeNull();

    const user = userEvent.setup();
    const allowlistBtn = screen.getByRole('button', { name: /allowlist/i });
    await user.click(allowlistBtn);

    expect(screen.getByTestId('agr-save-bar')).toBeDefined();
  });

  // ------------------------------------------------------------------
  // Save PUTs ONLY the changed output_handler key(s)
  // ------------------------------------------------------------------
  it('Save PUTs only the changed output_handler key (sanitize_html)', async () => {
    const capturedBodies: unknown[] = [];

    server.use(
      http.get('*/output/stats', () =>
        HttpResponse.json(envelope('output.stats', outputStatsFixture)),
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

    renderOutput();

    await waitFor(() =>
      expect(screen.getByTestId('agr-output')).toHaveAttribute('data-state', 'ready'),
    );

    const user = userEvent.setup();
    // Toggle sanitize_html (was true, now false)
    await user.click(screen.getByRole('switch', { name: /sanitize html/i }));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(capturedBodies).toHaveLength(1);
    });

    const body = capturedBodies[0] as { settings: Record<string, unknown> };
    // Must contain the changed key
    expect(body.settings).toHaveProperty('output_handler.sanitize_html', false);
    // Must NOT contain unchanged keys
    expect(Object.keys(body.settings)).not.toContain('output_handler.neutralize_markdown');
    expect(Object.keys(body.settings)).not.toContain('output_handler.redact_pii');
    expect(Object.keys(body.settings)).not.toContain('output_handler.html_mode');
    // Must NOT contain modes keys
    expect(Object.keys(body.settings).filter(k => k.startsWith('modes'))).toHaveLength(0);
  });

  // ------------------------------------------------------------------
  // Save PUTs only the changed html_mode key
  // ------------------------------------------------------------------
  it('Save PUTs only the changed html_mode key when mode changes', async () => {
    const capturedBodies: unknown[] = [];

    server.use(
      http.get('*/output/stats', () =>
        HttpResponse.json(envelope('output.stats', outputStatsFixture)),
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

    renderOutput();

    await waitFor(() =>
      expect(screen.getByTestId('agr-output')).toHaveAttribute('data-state', 'ready'),
    );

    const user = userEvent.setup();
    // Change html_mode from escape to allowlist
    await user.click(screen.getByRole('button', { name: /allowlist/i }));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(capturedBodies).toHaveLength(1);
    });

    const body = capturedBodies[0] as { settings: Record<string, unknown> };
    expect(body.settings).toHaveProperty('output_handler.html_mode', 'allowlist');
    // Only html_mode changed — others must not be in the patch
    expect(Object.keys(body.settings)).not.toContain('output_handler.sanitize_html');
    expect(Object.keys(body.settings)).not.toContain('output_handler.neutralize_markdown');
    expect(Object.keys(body.settings)).not.toContain('output_handler.redact_pii');
  });

  // ------------------------------------------------------------------
  // Discard reverts and hides SaveBar
  // ------------------------------------------------------------------
  it('Discard reverts local state and hides SaveBar', async () => {
    withDefaultMocks();
    renderOutput();

    await waitFor(() =>
      expect(screen.getByTestId('agr-output')).toHaveAttribute('data-state', 'ready'),
    );

    const user = userEvent.setup();
    const toggle = screen.getByRole('switch', { name: /sanitize html/i });
    // Toggle to make dirty
    await user.click(toggle);

    expect(screen.getByTestId('agr-save-bar')).toBeDefined();

    // Discard
    await user.click(screen.getByRole('button', { name: /discard/i }));

    // SaveBar gone
    expect(screen.queryByTestId('agr-save-bar')).toBeNull();

    // Toggle reverted to original value (sanitize_html=true → aria-checked=true)
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  // ------------------------------------------------------------------
  // Edit back to original value clears dirty (toggle round-trip)
  // ------------------------------------------------------------------
  it('toggling sanitize_html off then back on clears dirty', async () => {
    withDefaultMocks();
    renderOutput();

    await waitFor(() =>
      expect(screen.getByTestId('agr-output')).toHaveAttribute('data-state', 'ready'),
    );

    const user = userEvent.setup();
    const toggle = screen.getByRole('switch', { name: /sanitize html/i });

    // Toggle off → dirty
    await user.click(toggle);
    expect(screen.getByTestId('agr-save-bar')).toBeDefined();

    // Toggle back on → matches server → not dirty
    await user.click(toggle);
    expect(screen.queryByTestId('agr-save-bar')).toBeNull();
  });

  // ------------------------------------------------------------------
  // html_mode round-trip: change to allowlist then back to escape → no dirty
  // ------------------------------------------------------------------
  it('changing html_mode to allowlist then back to escape clears dirty', async () => {
    withDefaultMocks();
    renderOutput();

    await waitFor(() =>
      expect(screen.getByTestId('agr-output')).toHaveAttribute('data-state', 'ready'),
    );

    const user = userEvent.setup();

    // Switch to allowlist → dirty
    await user.click(screen.getByRole('button', { name: /allowlist/i }));
    expect(screen.getByTestId('agr-save-bar')).toBeDefined();

    // Switch back to escape → not dirty
    await user.click(screen.getByRole('button', { name: /escape/i }));
    expect(screen.queryByTestId('agr-save-bar')).toBeNull();
  });

  // ------------------------------------------------------------------
  // 422 keeps edits + shows error + SaveBar still present
  // ------------------------------------------------------------------
  it('422 on Save surfaces error and SaveBar remains visible', async () => {
    server.use(
      http.get('*/output/stats', () =>
        HttpResponse.json(envelope('output.stats', outputStatsFixture)),
      ),
      http.get('*/settings', () =>
        HttpResponse.json(envelope('settings', settingsFixture)),
      ),
      http.put('*/settings', () =>
        HttpResponse.json(
          { message: 'Validation failed', errors: { 'output_handler.html_mode': ['Invalid value'] } },
          { status: 422 },
        ),
      ),
    );

    renderOutput();

    await waitFor(() =>
      expect(screen.getByTestId('agr-output')).toHaveAttribute('data-state', 'ready'),
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('switch', { name: /sanitize html/i }));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByTestId('agr-save-error')).toBeDefined();
    });
    // SaveBar still present after failed save
    expect(screen.getByTestId('agr-save-bar')).toBeDefined();
    // Toggle still shows the edited value (not reverted)
    expect(screen.getByRole('switch', { name: /sanitize html/i })).toHaveAttribute('aria-checked', 'false');
  });

  // ------------------------------------------------------------------
  // data-state=error when stats API fails
  // ------------------------------------------------------------------
  it('shows data-state=error when output/stats API fails', async () => {
    server.use(
      http.get('*/output/stats', () =>
        HttpResponse.json({ message: 'Server error' }, { status: 500 }),
      ),
      http.get('*/settings', () =>
        HttpResponse.json(envelope('settings', settingsFixture)),
      ),
    );

    renderOutput();

    await waitFor(() =>
      expect(screen.getByTestId('agr-output')).toHaveAttribute('data-state', 'error'),
    );
  });

  // ------------------------------------------------------------------
  // data-state=error when settings API fails
  // ------------------------------------------------------------------
  it('shows data-state=error when settings API fails', async () => {
    server.use(
      http.get('*/output/stats', () =>
        HttpResponse.json(envelope('output.stats', outputStatsFixture)),
      ),
      http.get('*/settings', () =>
        HttpResponse.json({ message: 'Server error' }, { status: 500 }),
      ),
    );

    renderOutput();

    await waitFor(() =>
      expect(screen.getByTestId('agr-output')).toHaveAttribute('data-state', 'error'),
    );
  });

  // ------------------------------------------------------------------
  // SaveBar hides after successful save
  // ------------------------------------------------------------------
  it('SaveBar hides after successful save', async () => {
    let putCount = 0;

    server.use(
      http.get('*/output/stats', () =>
        HttpResponse.json(envelope('output.stats', outputStatsFixture)),
      ),
      http.get('*/settings', () =>
        HttpResponse.json(envelope('settings', settingsFixture)),
      ),
      http.put('*/settings', async () => {
        putCount++;
        return HttpResponse.json(envelope('settings', settingsFixture));
      }),
    );

    renderOutput();

    await waitFor(() =>
      expect(screen.getByTestId('agr-output')).toHaveAttribute('data-state', 'ready'),
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('switch', { name: /sanitize html/i }));
    expect(screen.getByTestId('agr-save-bar')).toBeDefined();

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(putCount).toBe(1);
      expect(screen.queryByTestId('agr-save-bar')).toBeNull();
    });
  });
});
