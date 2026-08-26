import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DemoStateProvider } from '../../../resources/js/lib/demoState';
import { ApiEndpointsProvider } from '../../../resources/js/lib/queries';
import { runtimeConfig } from '../../../resources/js/config';
import { renderWithProviders } from '../support/render';
import { server } from '../support/server';
import type { Overview, ProvenanceListData } from '../../../resources/js/lib/api/types';
import { ProvenancePage } from '../../../resources/js/pages/ProvenancePage';

const envelope = (schema: string, data: unknown) => ({
  schema_version: 'ai-guardrails.api.v1',
  schema: `ai-guardrails.api.v1.${schema}`,
  data,
});

const refused = {
  id: 1,
  tool: 'refund',
  principal_id: 'user_42',
  tiers: ['untrusted_external' as const],
  blocked: true,
  occurred_at: '2026-08-26T10:00:00+00:00',
};

const observed = {
  id: 2,
  tool: 'send_email',
  principal_id: 'user_99',
  tiers: ['untrusted_external' as const],
  blocked: false,
  occurred_at: '2026-08-26T09:30:00+00:00',
};

const overviewFixture: Overview = {
  controls: [
    { key: 'provenance', label: 'Provenance Gate', enabled: true, mode: 'monitor', posture: 'Observing', spark: [] },
  ],
  totals: { attempts_24h: 0, blocked_24h: 0, sampled: false, observed_24h: 0, pending_approvals: 0 },
  ruleset_version: 'v1',
};

function renderPage() {
  return renderWithProviders(
    <ApiEndpointsProvider config={runtimeConfig()}>
      <DemoStateProvider>
        <ProvenancePage />
      </DemoStateProvider>
    </ApiEndpointsProvider>,
  );
}

/**
 * Records what `blocked` the page actually sent, because that is the whole
 * contract between this page and the endpoint: `undefined` means "no
 * filter", `false` means "only the ones that RAN". Collapsing the two would
 * make the rollout tab silently show everything, and it would still look
 * plausible on screen.
 */
function mockApi(entries = [refused, observed], overview: Overview = overviewFixture) {
  const sent: (string | null)[] = [];

  server.use(
    http.get('*/provenance', ({ request }) => {
      const blocked = new URL(request.url).searchParams.get('blocked');
      sent.push(blocked);

      const filtered =
        blocked === null ? entries : entries.filter((e) => e.blocked === (blocked === '1'));

      return HttpResponse.json(
        envelope('provenance', { entries: filtered, next_cursor: null } satisfies ProvenanceListData),
      );
    }),
    http.get('*/overview', () => HttpResponse.json(envelope('overview', overview))),
  );

  return sent;
}

describe('ProvenancePage', () => {
  it('renders refused and observed decisions from fixture', async () => {
    mockApi();
    renderPage();

    await waitFor(() =>
      expect(screen.getByTestId('agr-provenance')).toHaveAttribute('data-state', 'ready'),
    );

    const rows = screen.getAllByTestId('agr-provenance-row');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('refund')).toBeDefined();
    expect(within(rows[0]).getByText('refused')).toBeDefined();
    expect(within(rows[1]).getByText('send_email')).toBeDefined();
    expect(within(rows[1]).getByText('ran')).toBeDefined();
  });

  it('sends no blocked filter on the All tab', async () => {
    const sent = mockApi();
    renderPage();

    await waitFor(() =>
      expect(screen.getByTestId('agr-provenance')).toHaveAttribute('data-state', 'ready'),
    );

    expect(sent).toContain(null);
  });

  it('the rollout tab asks for blocked=0, not for everything', async () => {
    // The load-bearing assertion. "Would have been refused" is a DIFFERENT
    // question from "all decisions", and getting it wrong produces a page
    // that looks right and answers the wrong thing.
    const sent = mockApi();
    renderPage();

    await waitFor(() =>
      expect(screen.getByTestId('agr-provenance')).toHaveAttribute('data-state', 'ready'),
    );

    await userEvent.click(screen.getByTestId('agr-provenance-scope-observed'));

    await waitFor(() => expect(sent).toContain('0'));

    const rows = await screen.findAllByTestId('agr-provenance-row');
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText('send_email')).toBeDefined();
  });

  it('the refused tab asks for blocked=1', async () => {
    const sent = mockApi();
    renderPage();

    await waitFor(() =>
      expect(screen.getByTestId('agr-provenance')).toHaveAttribute('data-state', 'ready'),
    );

    await userEvent.click(screen.getByTestId('agr-provenance-scope-refused'));

    await waitFor(() => expect(sent).toContain('1'));
  });

  it('reports the posture from the overview', async () => {
    mockApi();
    renderPage();

    await waitFor(() =>
      expect(screen.getByTestId('agr-status-badge')).toHaveTextContent('OBSERVING'),
    );
  });

  it('tells an operator to start in monitor when the control is off', async () => {
    // The empty state has to distinguish "nothing happened" from "the
    // control is not running", because the remedy is completely different.
    mockApi([], {
      ...overviewFixture,
      controls: [
        { key: 'provenance', label: 'Provenance Gate', enabled: false, mode: 'off', posture: 'Disabled', spark: [] },
      ],
    });
    renderPage();

    await waitFor(() =>
      expect(screen.getByTestId('agr-provenance')).toHaveAttribute('data-state', 'empty'),
    );

    expect(screen.getByText(/Enable it in monitor mode first/i)).toBeDefined();
  });

  it('never renders tool arguments, because the API does not carry them', async () => {
    mockApi();
    renderPage();

    await waitFor(() =>
      expect(screen.getByTestId('agr-provenance')).toHaveAttribute('data-state', 'ready'),
    );

    await userEvent.click(screen.getAllByTestId('agr-provenance-row')[0]);

    expect(await screen.findByText(/Tool arguments are deliberately not recorded/i)).toBeDefined();
  });
});
