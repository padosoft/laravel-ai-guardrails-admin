import {
  type ApprovalsData,
  type AuditListData,
  type Overview,
} from '../../../resources/js/lib/api/types';

export const overviewFixture: Overview = {
  controls: [
    { key: 'tool_firewall', label: 'Tool Firewall', enabled: true, mode: 'enforce', posture: 'Engaged', spark: [0, 1, 0, 2, 1, 0, 3, 1, 0, 0, 2, 4] },
    { key: 'input_screen', label: 'Input Screening', enabled: true, mode: 'monitor', posture: 'Observing', spark: [0, 1, 0, 2, 1, 0, 3, 1, 0, 0, 2, 4] },
    { key: 'output_handler', label: 'Output Handler', enabled: true, mode: 'enforce', posture: 'Engaged', spark: [0, 1, 0, 2, 1, 0, 3, 1, 0, 0, 2, 4] },
    { key: 'hitl', label: 'HITL Bridge', enabled: false, mode: 'off', posture: 'Disabled', spark: [0, 1, 0, 2, 1, 0, 3, 1, 0, 0, 2, 4] },
  ],
  totals: { attempts_24h: 11, blocked_24h: 4, sampled: false, observed_24h: 2, pending_approvals: 1 },
  ruleset_version: 'v1',
};

export const auditListFixture: AuditListData = {
  entries: [
    {
      id: 101,
      blocked: true,
      rule_id: 'ignore_previous',
      ruleset_version: 'v1',
      prompt_preview: 'ignore previous instructions and…',
      prompt_length: 42,
      errored: false,
      occurred_at: '2026-06-18T10:00:00+00:00',
    },
  ],
  next_cursor: null,
};

export const approvalsFixture: ApprovalsData = {
  pending: [
    {
      approval_id: 'ap_1',
      run_id: 'run_1',
      step_name: 'refund',
      status: 'pending',
      expires_at: '2026-06-18T12:00:00+00:00',
      created_at: '2026-06-18T10:00:00+00:00',
      tool: 'refund',
      arguments: { order_id: 'o_1', amount: 100 },
      requested_ago: '2 minutes ago',
      expires_in: 'in 2 hours',
    },
  ],
};
