// All shapes are the inner `data` object of the core v1.1.0 envelope, verbatim from
// padosoft/laravel-ai-guardrails src/Http/* controllers + Resources.

export type ControlKey = 'tool_firewall' | 'input_screen' | 'output_handler' | 'hitl';
export type ControlMode = 'enforce' | 'monitor' | 'off';
export type Posture = 'Engaged' | 'Observing' | 'Disabled';

export interface Control {
  key: ControlKey;
  label: string;
  enabled: boolean;
  mode: ControlMode;
  posture: Posture;
  spark: number[]; // 12 trailing-hour buckets, oldest first
}

export interface OverviewTotals {
  attempts_24h: number;
  blocked_24h: number;
  sampled: boolean;
  observed_24h: number;
  pending_approvals: number;
}

export interface Overview {
  controls: Control[];
  totals: OverviewTotals;
  ruleset_version: string;
}

// GET /audit
export interface AuditSummary {
  id: number;
  blocked: boolean;
  rule_id: string | null;
  ruleset_version: string | null;
  prompt_preview: string;
  prompt_length: number;
  errored: boolean;
  occurred_at: string; // ISO-8601 UTC
}

export interface AuditListData {
  entries: AuditSummary[];
  next_cursor: string | null;
}

// GET /audit/{id}
export interface AuditDetail {
  id: number;
  blocked: boolean;
  rule_id: string | null;
  principal_id: string | null;
  ruleset_version: string | null;
  prompt: string;
  prompt_length: number;
  errored_rule_ids: string[];
  matched_span: [number, number] | null;
  occurred_at: string;
}

export interface AuditDetailData {
  entry: AuditDetail;
}

// GET /audit/trend
export interface TrendPoint {
  date: string; // YYYY-MM-DD (UTC)
  total: number;
  blocked: number;
  allowed: number; // includes monitor-mode matches
  observed: number; // subset of allowed (blocked=false AND rule matched)
}

export interface AuditTrendData {
  from: string;
  to: string;
  points: TrendPoint[];
}

// GET /firewall
export interface FirewallRejection {
  id: number;
  tool: string;
  principal_id: string | null;
  violations: Record<string, string>;
  violation_count: number;
  occurred_at: string;
}

export interface FirewallListData {
  entries: FirewallRejection[];
  next_cursor: string | null;
}

// GET /output/stats
export interface OutputCounts {
  html_stripped: number;
  markdown_sanitized: number;
  structured_validation_failure: number;
  pii_redaction: number;
  pii: { by_detector: Record<string, number> };
}

export interface OutputStatsData {
  from: string;
  to: string;
  counts: OutputCounts;
  total: number;
}

// GET /approvals
export interface ApprovalItem {
  approval_id: string;
  run_id: string;
  step_name: string;
  status: string;
  expires_at: string | null;
  created_at: string;
  tool: string;
  arguments: Record<string, unknown>;
  requested_ago: string;
  expires_in: string | null;
}

export interface ApprovalsData {
  pending: ApprovalItem[];
}

// POST /approvals/{token}/approve|reject
export interface ApprovalDecision {
  decision: 'approved' | 'rejected' | 'unavailable' | 'failed';
  error?: string;
}

// GET/PUT /settings — `settings` is the nested (un-dotted) effective config object.
export type GuardrailSettings = Record<string, unknown>;

export interface SettingsData {
  settings: GuardrailSettings;
  error?: string;
}

// GET /settings/changes
export interface SettingsChangeRow {
  id: number;
  actor_id: string | null;
  key: string;
  old_value: unknown;
  new_value: unknown;
  occurred_at: string;
}

export interface SettingsChangesData {
  changes: SettingsChangeRow[];
}

// POST /try/screen
export interface ScreenResult {
  blocked: boolean;
  rule_id: string | null;
  refusal_message: string | null;
  ruleset_version: string | null;
}

// POST /try/sanitize
export interface SanitizeResult {
  sanitized: string;
}

// Untrusted list filters (sent as query params; empty/undefined values are dropped).
export interface AuditFilters extends Record<string, unknown> {
  q?: string;
  blocked?: boolean;
  rule_id?: string;
  principal_id?: string;
  from?: string;
  to?: string;
  cursor?: string;
}

export interface FirewallFilters extends Record<string, unknown> {
  q?: string;
  principal_id?: string;
  from?: string;
  to?: string;
  cursor?: string;
}

export interface TrendRange extends Record<string, unknown> {
  from?: string;
  to?: string;
}
