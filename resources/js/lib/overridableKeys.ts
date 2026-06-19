/**
 * OVERRIDABLE_KEYS — static mirror of the core's settings.overridable allow-list (v1.1.0 set).
 *
 * These are the dotted keys that the GET /settings API returns editable values for
 * and that the PUT /settings API accepts as runtime overrides.
 *
 * Non-overridable infra keys (audit.store, audit.table, *.connection, etc.) are NOT listed here.
 * The API does not return their values and the SPA does not send them.
 *
 * canEdit(key) = OVERRIDABLE_KEYS.includes(key)
 */
export const OVERRIDABLE_KEYS: readonly string[] = [
  'tool_firewall.enabled',
  'tool_firewall.reject_unknown_arguments',
  'tool_firewall.owner_keys',
  'input_screen.enabled',
  'input_screen.refusal_message',
  'input_screen.patterns',
  'output_handler.enabled',
  'output_handler.sanitize_html',
  'output_handler.neutralize_markdown',
  'output_handler.redact_pii',
  'output_handler.html_mode',
  'hitl.enabled',
  'hitl.fallback',
  'hitl.destructive_tools',
  'modes.tool_firewall',
  'modes.input_screen',
  'modes.output_handler',
  'modes.hitl',
  'normalization.enabled',
  'normalization.nfkc',
  'normalization.strip_zero_width',
  'normalization.casefold',
  'normalization.decode_base64_blobs',
  'normalization.fold_confusables',
  'normalization.max_prompt_length',
  'pattern_safety.on_match_error',
  'tool_authorization.enabled',
  'tool_authorization.owner_key_depth',
  'tool_authorization.destructive_match',
  'audit_hygiene.prompt_storage',
  'retention.days',
  'retention.strategy',
] as const;

export function canEdit(key: string): boolean {
  return OVERRIDABLE_KEYS.includes(key);
}
