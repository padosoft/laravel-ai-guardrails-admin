import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DemoStateProvider } from '../../../resources/js/lib/demoState';
import { ApiEndpointsProvider } from '../../../resources/js/lib/queries';
import { runtimeConfig } from '../../../resources/js/config';
import { renderWithProviders } from '../support/render';
import { server } from '../support/server';
import type { ApprovalsData, ApprovalDecision } from '../../../resources/js/lib/api/types';
import { ApprovalsPage } from '../../../resources/js/pages/ApprovalsPage';

// ------------------------------------------------------------------ fixtures --

const envelope = (schema: string, data: unknown) => ({
  schema_version: 'ai-guardrails.api.v1',
  schema: `ai-guardrails.api.v1.${schema}`,
  data,
});

const approvalsFixture: ApprovalsData = {
  pending: [
    {
      approval_id: 'ap_1',
      run_id: 'run_abc123',
      step_name: 'refund_step',
      status: 'pending',
      expires_at: '2026-06-19T14:00:00+00:00',
      created_at: '2026-06-19T12:00:00+00:00',
      tool: 'process_refund',
      arguments: { order_id: 'o_999', amount: 250, currency: 'EUR' },
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
      arguments: { record_id: 'r_42', hard_delete: true },
      requested_ago: '5 minutes ago',
      expires_in: 'in 3 hours',
    },
  ],
};

const emptyFixture: ApprovalsData = { pending: [] };

// ------------------------------------------------------------------ helpers --

function renderApprovals() {
  return renderWithProviders(
    <ApiEndpointsProvider config={runtimeConfig()}>
      <DemoStateProvider>
        <ApprovalsPage />
      </DemoStateProvider>
    </ApiEndpointsProvider>,
  );
}

function withDefaultMocks(overrides: { approvals?: ApprovalsData } = {}) {
  server.use(
    http.get('*/approvals', () =>
      HttpResponse.json(envelope('approvals', overrides.approvals ?? approvalsFixture)),
    ),
  );
}

function withApproveMock(decision: ApprovalDecision, statusCode = 200) {
  server.use(
    http.post('*/approvals/*/approve', () =>
      HttpResponse.json(envelope('approval.decision', decision), { status: statusCode }),
    ),
    http.post('*/approvals/*/reject', () =>
      HttpResponse.json(envelope('approval.decision', decision), { status: statusCode }),
    ),
  );
}

// ============================================================ TESTS ============================================================

describe('ApprovalsPage', () => {
  // ------------------------------------------------------------------
  // Queue rows render tool + arguments preview + requested_ago + expires_in
  // ------------------------------------------------------------------
  it('renders queue rows with tool, arguments preview, requested_ago, expires_in', async () => {
    withDefaultMocks();
    renderApprovals();

    await waitFor(() =>
      expect(screen.getByTestId('agr-approvals')).toHaveAttribute('data-state', 'ready'),
    );

    const rows = screen.getAllByTestId('agr-approval-row');
    expect(rows).toHaveLength(2);

    // First row: tool + args preview + timing
    const row1 = rows[0];
    expect(within(row1).getByText('process_refund')).toBeVisible();
    expect(within(row1).getByText(/order_id/)).toBeVisible();
    expect(within(row1).getByText('2 minutes ago')).toBeVisible();
    expect(within(row1).getByText('in 2 hours')).toBeVisible();

    // Second row
    const row2 = rows[1];
    expect(within(row2).getByText('delete_record')).toBeVisible();
    expect(within(row2).getByText(/record_id/)).toBeVisible();
    expect(within(row2).getByText('5 minutes ago')).toBeVisible();
    expect(within(row2).getByText('in 3 hours')).toBeVisible();
  });

  // ------------------------------------------------------------------
  // Empty pending → empty-state "queue is clear"
  // ------------------------------------------------------------------
  it('shows empty-state when pending is []', async () => {
    withDefaultMocks({ approvals: emptyFixture });
    renderApprovals();

    await waitFor(() =>
      expect(screen.getByTestId('agr-approvals')).toHaveAttribute('data-state', 'empty'),
    );

    // Empty state text visible
    expect(screen.getByTestId('agr-approvals-empty')).toBeVisible();
    expect(screen.getByTestId('agr-approvals-empty')).toHaveTextContent(/queue is clear/i);

    // No rows
    expect(screen.queryAllByTestId('agr-approval-row')).toHaveLength(0);
  });

  // ------------------------------------------------------------------
  // Loading state
  // ------------------------------------------------------------------
  it('shows loading state before data arrives', async () => {
    // Never resolves — check initial loading state
    server.use(
      http.get('*/approvals', () => new Promise(() => {})),
    );
    renderApprovals();

    expect(screen.getByTestId('agr-approvals')).toHaveAttribute('data-state', 'loading');
  });

  // ------------------------------------------------------------------
  // Error state
  // ------------------------------------------------------------------
  it('shows error state when request fails', async () => {
    server.use(
      http.get('*/approvals', () => HttpResponse.error()),
    );
    renderApprovals();

    await waitFor(() =>
      expect(screen.getByTestId('agr-approvals')).toHaveAttribute('data-state', 'error'),
    );
  });

  // ------------------------------------------------------------------
  // Clicking a row opens the detail drawer
  // ------------------------------------------------------------------
  it('clicking a row opens the detail drawer', async () => {
    withDefaultMocks();
    renderApprovals();
    const user = userEvent.setup();

    await waitFor(() =>
      expect(screen.getByTestId('agr-approvals')).toHaveAttribute('data-state', 'ready'),
    );

    const rows = screen.getAllByTestId('agr-approval-row');
    await user.click(rows[0]);

    // Detail drawer opened
    expect(screen.getByTestId('agr-drawer')).toBeVisible();
  });

  // ------------------------------------------------------------------
  // Detail drawer shows tool, run_id, requested_ago, expires_in, scoped args
  // ------------------------------------------------------------------
  it('detail drawer shows tool, run_id, args — NOT a fabricated token', async () => {
    withDefaultMocks();
    renderApprovals();
    const user = userEvent.setup();

    await waitFor(() =>
      expect(screen.getByTestId('agr-approvals')).toHaveAttribute('data-state', 'ready'),
    );

    await user.click(screen.getAllByTestId('agr-approval-row')[0]);

    const drawer = screen.getByTestId('agr-drawer');
    expect(within(drawer).getByText('process_refund')).toBeVisible();
    expect(within(drawer).getByText('run_abc123')).toBeVisible();
    // JSON arguments visible
    expect(within(drawer).getByText(/order_id/)).toBeVisible();
    // No fabricated token value — the prototype's "Token" KV row must NOT show a raw token
    expect(within(drawer).queryByText(/token:\s*[a-zA-Z0-9_\-]{20,}/)).toBeNull();
  });

  // ------------------------------------------------------------------
  // Approve button in detail drawer footer opens confirm drawer
  // ------------------------------------------------------------------
  it('clicking Approve in detail drawer opens confirm drawer with token input', async () => {
    withDefaultMocks();
    renderApprovals();
    const user = userEvent.setup();

    await waitFor(() =>
      expect(screen.getByTestId('agr-approvals')).toHaveAttribute('data-state', 'ready'),
    );

    await user.click(screen.getAllByTestId('agr-approval-row')[0]);

    // Click Approve in drawer footer
    const drawer = screen.getByTestId('agr-drawer');
    const approveBtn = within(drawer).getByRole('button', { name: /approve/i });
    await user.click(approveBtn);

    // Confirm drawer opened with token input
    expect(screen.getByTestId('agr-confirm-drawer')).toBeVisible();
    expect(screen.getByTestId('agr-token-input')).toBeVisible();
  });

  // ------------------------------------------------------------------
  // Inline approve button also opens confirm drawer
  // ------------------------------------------------------------------
  it('inline approve button in table row opens confirm drawer', async () => {
    withDefaultMocks();
    renderApprovals();
    const user = userEvent.setup();

    await waitFor(() =>
      expect(screen.getByTestId('agr-approvals')).toHaveAttribute('data-state', 'ready'),
    );

    const rows = screen.getAllByTestId('agr-approval-row');
    const approveBtn = within(rows[0]).getByRole('button', { name: /approve process_refund/i });
    await user.click(approveBtn);

    expect(screen.getByTestId('agr-confirm-drawer')).toBeVisible();
    expect(screen.getByTestId('agr-token-input')).toBeVisible();
  });

  // ------------------------------------------------------------------
  // Submitting with token calls POST /approvals/{token}/approve and closes confirm drawer
  // ------------------------------------------------------------------
  it('submitting approve with token calls POST /approvals/{token}/approve then closes drawer', async () => {
    // Deterministic: resolve only after we capture that the POST was called.
    let postCallCount = 0;
    // After approve succeeds, the page re-fetches /approvals. Return a fixture
    // WITHOUT the approved row so the invalidation resolves deterministically.
    let getCallCount = 0;

    server.use(
      http.get('*/approvals', () => {
        getCallCount++;
        // First fetch: return both rows. Subsequent fetches (post-approve refetch):
        // return empty list so the row disappears deterministically.
        const fixture = getCallCount === 1 ? approvalsFixture : emptyFixture;
        return HttpResponse.json(envelope('approvals', fixture));
      }),
      http.post('*/approvals/*/approve', () => {
        postCallCount++;
        return HttpResponse.json(envelope('approval.decision', { decision: 'approved' }));
      }),
    );

    renderApprovals();
    const user = userEvent.setup();

    await waitFor(() =>
      expect(screen.getByTestId('agr-approvals')).toHaveAttribute('data-state', 'ready'),
    );

    // Click inline approve button
    const rows = screen.getAllByTestId('agr-approval-row');
    await user.click(within(rows[0]).getByRole('button', { name: /approve process_refund/i }));

    // Confirm drawer opens with token input
    expect(screen.getByTestId('agr-confirm-drawer')).toBeVisible();

    // Click the token input explicitly before typing to ensure focus (the Drawer
    // auto-focuses the first focusable button after 60ms, which would steal focus).
    await user.click(screen.getByTestId('agr-token-input'));
    await user.type(screen.getByTestId('agr-token-input'), 'tok123');
    await user.click(screen.getByTestId('agr-confirm-approve'));

    // Wait for POST to have been called BEFORE asserting UI changes
    await waitFor(() => expect(postCallCount).toBe(1));

    // Confirm drawer closes on success — no arbitrary timeout crutch
    await waitFor(() => expect(screen.queryByTestId('agr-confirm-drawer')).toBeNull());
  });

  // ------------------------------------------------------------------
  // Submit reject with token calls POST /approvals/{token}/reject and closes drawer
  // ------------------------------------------------------------------
  it('submitting reject with token calls POST /approvals/{token}/reject then closes drawer', async () => {
    let postCallCount = 0;
    let getCallCount = 0;

    server.use(
      http.get('*/approvals', () => {
        getCallCount++;
        const fixture = getCallCount === 1 ? approvalsFixture : emptyFixture;
        return HttpResponse.json(envelope('approvals', fixture));
      }),
      http.post('*/approvals/*/reject', () => {
        postCallCount++;
        return HttpResponse.json(envelope('approval.decision', { decision: 'rejected' }));
      }),
    );

    renderApprovals();
    const user = userEvent.setup();

    await waitFor(() =>
      expect(screen.getByTestId('agr-approvals')).toHaveAttribute('data-state', 'ready'),
    );

    // Click inline reject button
    const rows = screen.getAllByTestId('agr-approval-row');
    await user.click(within(rows[0]).getByRole('button', { name: /reject process_refund/i }));

    // Confirm drawer opens with token input
    expect(screen.getByTestId('agr-confirm-drawer')).toBeVisible();

    // Click the token input explicitly before typing to ensure focus
    await user.click(screen.getByTestId('agr-token-input'));
    await user.type(screen.getByTestId('agr-token-input'), 'rej456');
    await user.click(screen.getByTestId('agr-confirm-reject'));

    // Wait for POST to be called BEFORE asserting UI changes
    await waitFor(() => expect(postCallCount).toBe(1));

    // Confirm drawer closes on success
    await waitFor(() => expect(screen.queryByTestId('agr-confirm-drawer')).toBeNull());
  });

  // ------------------------------------------------------------------
  // 409 (hitl_unavailable) → shows HITL-unavailable banner
  // ------------------------------------------------------------------
  it('409 hitl_unavailable → shows HITL-unavailable banner', async () => {
    server.use(
      http.get('*/approvals', () =>
        HttpResponse.json(envelope('approvals', approvalsFixture)),
      ),
      http.post('*/approvals/*/approve', () =>
        HttpResponse.json(
          envelope('approval.decision', { decision: 'unavailable', error: 'hitl_unavailable' }),
          { status: 409 },
        ),
      ),
    );

    renderApprovals();
    const user = userEvent.setup();

    await waitFor(() =>
      expect(screen.getByTestId('agr-approvals')).toHaveAttribute('data-state', 'ready'),
    );

    const rows = screen.getAllByTestId('agr-approval-row');
    await user.click(within(rows[0]).getByRole('button', { name: /approve process_refund/i }));
    await user.click(screen.getByTestId('agr-token-input'));
    await user.type(screen.getByTestId('agr-token-input'), 'tok');
    await user.click(screen.getByTestId('agr-confirm-approve'));

    await waitFor(() =>
      expect(screen.getByTestId('agr-hitl-unavailable-banner')).toBeVisible(),
    );
  });

  // ------------------------------------------------------------------
  // 422 (decision_failed / invalid token) → shows error in confirm drawer, keeps drawer open
  // ------------------------------------------------------------------
  it('422 decision_failed → shows invalid-token error, keeps confirm drawer open', async () => {
    server.use(
      http.get('*/approvals', () =>
        HttpResponse.json(envelope('approvals', approvalsFixture)),
      ),
      http.post('*/approvals/*/approve', () =>
        HttpResponse.json(
          envelope('approval.decision', { decision: 'failed', error: 'decision_failed' }),
          { status: 422 },
        ),
      ),
    );

    renderApprovals();
    const user = userEvent.setup();

    await waitFor(() =>
      expect(screen.getByTestId('agr-approvals')).toHaveAttribute('data-state', 'ready'),
    );

    const rows = screen.getAllByTestId('agr-approval-row');
    await user.click(within(rows[0]).getByRole('button', { name: /approve process_refund/i }));
    await user.click(screen.getByTestId('agr-token-input'));
    await user.type(screen.getByTestId('agr-token-input'), 'wrongtok');
    await user.click(screen.getByTestId('agr-confirm-approve'));

    // Confirm drawer stays open
    await waitFor(() => {
      expect(screen.getByTestId('agr-confirm-drawer')).toBeVisible();
      expect(screen.getByTestId('agr-token-error')).toBeVisible();
    });
  });

  // ------------------------------------------------------------------
  // Confirm drawer copy explains token requirement
  // ------------------------------------------------------------------
  it('confirm drawer explains token requirement', async () => {
    server.use(
      http.get('*/approvals', () =>
        HttpResponse.json(envelope('approvals', approvalsFixture)),
      ),
    );
    renderApprovals();
    const user = userEvent.setup();

    await waitFor(() =>
      expect(screen.getByTestId('agr-approvals')).toHaveAttribute('data-state', 'ready'),
    );

    await user.click(within(screen.getAllByTestId('agr-approval-row')[0]).getByRole('button', { name: /approve process_refund/i }));

    const confirmDrawer = screen.getByTestId('agr-confirm-drawer');
    expect(within(confirmDrawer).getByText(/paste the approval token/i)).toBeVisible();
  });
});
