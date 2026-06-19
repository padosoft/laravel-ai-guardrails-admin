import { Settings, History, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Chips } from '../components/Chips';
import { Field } from '../components/Field';
import { ModeSegmented } from '../components/ModeSegmented';
import { SaveBar } from '../components/SaveBar';
import { ScreenState, useScreenState } from '../components/ScreenState';
import { Toggle } from '../components/Toggle';
import { useQueryClient } from '@tanstack/react-query';
import { useOverview, useSettings, useUpdateSettings, queryKeys } from '../lib/queries';
import type { ControlMode } from '../lib/api/types';
import { OVERRIDABLE_KEYS } from '../lib/overridableKeys';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SettingsPosture {
  // Master
  enabled: boolean;
  // Tool Firewall
  tool_firewall: {
    enabled: boolean;
    owner_keys: string[];
    reject_unknown_arguments: boolean;
  };
  // Input Screen
  input_screen: {
    enabled: boolean;
    refusal_message: string;
    patterns: Record<string, string>;
  };
  // Output Handler
  output_handler: {
    enabled: boolean;
    sanitize_html: boolean;
    neutralize_markdown: boolean;
    redact_pii: boolean;
    html_mode: 'escape' | 'allowlist';
  };
  // HITL
  hitl: {
    enabled: boolean;
    fallback: 'deny' | 'pass';
    destructive_tools: string[];
  };
  // Modes
  modes: {
    tool_firewall: ControlMode;
    input_screen: ControlMode;
    output_handler: ControlMode;
    hitl: ControlMode;
  };
  // Normalization
  normalization: {
    enabled: boolean;
    nfkc: boolean;
    strip_zero_width: boolean;
    casefold: boolean;
    decode_base64_blobs: boolean;
    fold_confusables: boolean;
    max_prompt_length: number;
  };
  // Pattern safety (partially overridable)
  pattern_safety: {
    on_match_error: 'closed' | 'open';
  };
  // Tool authorization
  tool_authorization: {
    enabled: boolean;
    owner_key_depth: 'top_level' | 'recursive';
    destructive_match: 'exact' | 'substring';
  };
  // Audit hygiene
  audit_hygiene: {
    prompt_storage: 'raw' | 'redact' | 'hash' | 'truncate';
  };
  // Retention
  retention: {
    days: number;
    strategy: 'purge' | 'anonymize' | 'keep';
  };
}

function extractPosture(settings: Record<string, unknown>): SettingsPosture {
  const tf = (settings.tool_firewall ?? {}) as Record<string, unknown>;
  const is = (settings.input_screen ?? {}) as Record<string, unknown>;
  const oh = (settings.output_handler ?? {}) as Record<string, unknown>;
  const ht = (settings.hitl ?? {}) as Record<string, unknown>;
  const mo = (settings.modes ?? {}) as Record<string, unknown>;
  const nm = (settings.normalization ?? {}) as Record<string, unknown>;
  const ps = (settings.pattern_safety ?? {}) as Record<string, unknown>;
  const ta = (settings.tool_authorization ?? {}) as Record<string, unknown>;
  const ah = (settings.audit_hygiene ?? {}) as Record<string, unknown>;
  const re = (settings.retention ?? {}) as Record<string, unknown>;

  return {
    enabled: Boolean(settings.enabled ?? true),
    tool_firewall: {
      enabled: Boolean(tf.enabled),
      owner_keys: Array.isArray(tf.owner_keys) ? (tf.owner_keys as string[]) : [],
      reject_unknown_arguments: Boolean(tf.reject_unknown_arguments),
    },
    input_screen: {
      enabled: Boolean(is.enabled),
      refusal_message: (is.refusal_message as string) ?? '',
      patterns: (is.patterns as Record<string, string>) ?? {},
    },
    output_handler: {
      enabled: Boolean(oh.enabled),
      sanitize_html: Boolean(oh.sanitize_html),
      neutralize_markdown: Boolean(oh.neutralize_markdown),
      redact_pii: Boolean(oh.redact_pii),
      html_mode: (oh.html_mode as 'escape' | 'allowlist') ?? 'escape',
    },
    hitl: {
      enabled: Boolean(ht.enabled),
      fallback: (ht.fallback as 'deny' | 'pass') ?? 'deny',
      destructive_tools: Array.isArray(ht.destructive_tools) ? (ht.destructive_tools as string[]) : [],
    },
    modes: {
      tool_firewall: (mo.tool_firewall as ControlMode) ?? 'enforce',
      input_screen: (mo.input_screen as ControlMode) ?? 'enforce',
      output_handler: (mo.output_handler as ControlMode) ?? 'enforce',
      hitl: (mo.hitl as ControlMode) ?? 'enforce',
    },
    normalization: {
      enabled: Boolean(nm.enabled ?? true),
      nfkc: Boolean(nm.nfkc),
      strip_zero_width: Boolean(nm.strip_zero_width),
      casefold: Boolean(nm.casefold),
      decode_base64_blobs: Boolean(nm.decode_base64_blobs),
      fold_confusables: Boolean(nm.fold_confusables),
      max_prompt_length: (nm.max_prompt_length as number) ?? 32768,
    },
    pattern_safety: {
      on_match_error: (ps.on_match_error as 'closed' | 'open') ?? 'closed',
    },
    tool_authorization: {
      enabled: Boolean(ta.enabled),
      owner_key_depth: (ta.owner_key_depth as 'top_level' | 'recursive') ?? 'top_level',
      destructive_match: (ta.destructive_match as 'exact' | 'substring') ?? 'exact',
    },
    audit_hygiene: {
      prompt_storage: (ah.prompt_storage as 'raw' | 'redact' | 'hash' | 'truncate') ?? 'redact',
    },
    retention: {
      days: (re.days as number) ?? 90,
      strategy: (re.strategy as 'purge' | 'anonymize' | 'keep') ?? 'purge',
    },
  };
}

// ── Pattern validation ─────────────────────────────────────────────────────────
// Validates that a pattern is a valid PCRE-style delimited pattern: /body/flags
// or a bare regex body. Returns true if valid.

function isValidPattern(rx: string): boolean {
  if (!rx.trim()) return false;
  try {
    // Must start and end with a delimiter (PCRE fully-delimited format)
    const m = /^\/(.*)\/([a-z]*)$/s.exec(rx);
    if (!m) {
      // Not fully delimited — treat as invalid per spec requirement
      return false;
    }
    new RegExp(m[1], m[2]);
    return true;
  } catch {
    return false;
  }
}

// ── Dirty check ───────────────────────────────────────────────────────────────

function sortedArr(arr: string[]): string[] {
  return [...arr].sort();
}

function computeDirty(local: SettingsPosture, server: SettingsPosture): boolean {
  // NOTE: `enabled` (master kill-switch) is intentionally excluded — it is a
  // deploy-time env var, NOT runtime-overridable. It is rendered read-only.
  if (local.tool_firewall.enabled !== server.tool_firewall.enabled) return true;
  if (local.tool_firewall.reject_unknown_arguments !== server.tool_firewall.reject_unknown_arguments) return true;
  if (local.tool_firewall.owner_keys.length !== server.tool_firewall.owner_keys.length) return true;
  if (sortedArr(local.tool_firewall.owner_keys).some((k, i) => k !== sortedArr(server.tool_firewall.owner_keys)[i])) return true;
  // Input screen
  if (local.input_screen.enabled !== server.input_screen.enabled) return true;
  if (local.input_screen.refusal_message !== server.input_screen.refusal_message) return true;
  // Patterns: compare by content
  const lp = local.input_screen.patterns;
  const sp = server.input_screen.patterns;
  if (Object.keys(lp).length !== Object.keys(sp).length) return true;
  if (Object.entries(lp).some(([k, v]) => sp[k] !== v)) return true;
  // Output handler
  if (local.output_handler.enabled !== server.output_handler.enabled) return true;
  if (local.output_handler.sanitize_html !== server.output_handler.sanitize_html) return true;
  if (local.output_handler.neutralize_markdown !== server.output_handler.neutralize_markdown) return true;
  if (local.output_handler.redact_pii !== server.output_handler.redact_pii) return true;
  if (local.output_handler.html_mode !== server.output_handler.html_mode) return true;
  // HITL
  if (local.hitl.enabled !== server.hitl.enabled) return true;
  if (local.hitl.fallback !== server.hitl.fallback) return true;
  if (local.hitl.destructive_tools.length !== server.hitl.destructive_tools.length) return true;
  if (sortedArr(local.hitl.destructive_tools).some((k, i) => k !== sortedArr(server.hitl.destructive_tools)[i])) return true;
  // Modes
  if (local.modes.tool_firewall !== server.modes.tool_firewall) return true;
  if (local.modes.input_screen !== server.modes.input_screen) return true;
  if (local.modes.output_handler !== server.modes.output_handler) return true;
  if (local.modes.hitl !== server.modes.hitl) return true;
  // Normalization
  if (local.normalization.enabled !== server.normalization.enabled) return true;
  if (local.normalization.nfkc !== server.normalization.nfkc) return true;
  if (local.normalization.strip_zero_width !== server.normalization.strip_zero_width) return true;
  if (local.normalization.casefold !== server.normalization.casefold) return true;
  if (local.normalization.decode_base64_blobs !== server.normalization.decode_base64_blobs) return true;
  if (local.normalization.fold_confusables !== server.normalization.fold_confusables) return true;
  if (local.normalization.max_prompt_length !== server.normalization.max_prompt_length) return true;
  // Pattern safety
  if (local.pattern_safety.on_match_error !== server.pattern_safety.on_match_error) return true;
  // Tool authorization
  if (local.tool_authorization.enabled !== server.tool_authorization.enabled) return true;
  if (local.tool_authorization.owner_key_depth !== server.tool_authorization.owner_key_depth) return true;
  if (local.tool_authorization.destructive_match !== server.tool_authorization.destructive_match) return true;
  // Audit hygiene
  if (local.audit_hygiene.prompt_storage !== server.audit_hygiene.prompt_storage) return true;
  // Retention
  if (local.retention.days !== server.retention.days) return true;
  if (local.retention.strategy !== server.retention.strategy) return true;
  return false;
}

// ── Changed-keys builder ──────────────────────────────────────────────────────
// Builds a minimal dotted-key patch of only changed OVERRIDABLE keys.

function changedKeys(local: SettingsPosture, server: SettingsPosture): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  const add = (key: string, value: unknown) => {
    if (OVERRIDABLE_KEYS.includes(key)) {
      patch[key] = value;
    }
  };

  // NOTE: `enabled` (master kill-switch) is excluded — not runtime-overridable.
  // Tool firewall
  if (local.tool_firewall.enabled !== server.tool_firewall.enabled)
    add('tool_firewall.enabled', local.tool_firewall.enabled);
  if (local.tool_firewall.reject_unknown_arguments !== server.tool_firewall.reject_unknown_arguments)
    add('tool_firewall.reject_unknown_arguments', local.tool_firewall.reject_unknown_arguments);
  {
    const ls = sortedArr(local.tool_firewall.owner_keys);
    const ss = sortedArr(server.tool_firewall.owner_keys);
    if (ls.length !== ss.length || ls.some((k, i) => k !== ss[i]))
      add('tool_firewall.owner_keys', local.tool_firewall.owner_keys);
  }
  // Input screen
  if (local.input_screen.enabled !== server.input_screen.enabled)
    add('input_screen.enabled', local.input_screen.enabled);
  if (local.input_screen.refusal_message !== server.input_screen.refusal_message)
    add('input_screen.refusal_message', local.input_screen.refusal_message);
  {
    const lp = local.input_screen.patterns;
    const sp = server.input_screen.patterns;
    if (Object.keys(lp).length !== Object.keys(sp).length || Object.entries(lp).some(([k, v]) => sp[k] !== v))
      add('input_screen.patterns', lp);
  }
  // Output handler
  if (local.output_handler.enabled !== server.output_handler.enabled)
    add('output_handler.enabled', local.output_handler.enabled);
  if (local.output_handler.sanitize_html !== server.output_handler.sanitize_html)
    add('output_handler.sanitize_html', local.output_handler.sanitize_html);
  if (local.output_handler.neutralize_markdown !== server.output_handler.neutralize_markdown)
    add('output_handler.neutralize_markdown', local.output_handler.neutralize_markdown);
  if (local.output_handler.redact_pii !== server.output_handler.redact_pii)
    add('output_handler.redact_pii', local.output_handler.redact_pii);
  if (local.output_handler.html_mode !== server.output_handler.html_mode)
    add('output_handler.html_mode', local.output_handler.html_mode);
  // HITL
  if (local.hitl.enabled !== server.hitl.enabled) add('hitl.enabled', local.hitl.enabled);
  if (local.hitl.fallback !== server.hitl.fallback) add('hitl.fallback', local.hitl.fallback);
  {
    const ls = sortedArr(local.hitl.destructive_tools);
    const ss = sortedArr(server.hitl.destructive_tools);
    if (ls.length !== ss.length || ls.some((k, i) => k !== ss[i]))
      add('hitl.destructive_tools', local.hitl.destructive_tools);
  }
  // Modes
  if (local.modes.tool_firewall !== server.modes.tool_firewall)
    add('modes.tool_firewall', local.modes.tool_firewall);
  if (local.modes.input_screen !== server.modes.input_screen)
    add('modes.input_screen', local.modes.input_screen);
  if (local.modes.output_handler !== server.modes.output_handler)
    add('modes.output_handler', local.modes.output_handler);
  if (local.modes.hitl !== server.modes.hitl) add('modes.hitl', local.modes.hitl);
  // Normalization
  if (local.normalization.enabled !== server.normalization.enabled)
    add('normalization.enabled', local.normalization.enabled);
  if (local.normalization.nfkc !== server.normalization.nfkc)
    add('normalization.nfkc', local.normalization.nfkc);
  if (local.normalization.strip_zero_width !== server.normalization.strip_zero_width)
    add('normalization.strip_zero_width', local.normalization.strip_zero_width);
  if (local.normalization.casefold !== server.normalization.casefold)
    add('normalization.casefold', local.normalization.casefold);
  if (local.normalization.decode_base64_blobs !== server.normalization.decode_base64_blobs)
    add('normalization.decode_base64_blobs', local.normalization.decode_base64_blobs);
  if (local.normalization.fold_confusables !== server.normalization.fold_confusables)
    add('normalization.fold_confusables', local.normalization.fold_confusables);
  if (local.normalization.max_prompt_length !== server.normalization.max_prompt_length)
    add('normalization.max_prompt_length', local.normalization.max_prompt_length);
  // Pattern safety
  if (local.pattern_safety.on_match_error !== server.pattern_safety.on_match_error)
    add('pattern_safety.on_match_error', local.pattern_safety.on_match_error);
  // Tool authorization
  if (local.tool_authorization.enabled !== server.tool_authorization.enabled)
    add('tool_authorization.enabled', local.tool_authorization.enabled);
  if (local.tool_authorization.owner_key_depth !== server.tool_authorization.owner_key_depth)
    add('tool_authorization.owner_key_depth', local.tool_authorization.owner_key_depth);
  if (local.tool_authorization.destructive_match !== server.tool_authorization.destructive_match)
    add('tool_authorization.destructive_match', local.tool_authorization.destructive_match);
  // Audit hygiene
  if (local.audit_hygiene.prompt_storage !== server.audit_hygiene.prompt_storage)
    add('audit_hygiene.prompt_storage', local.audit_hygiene.prompt_storage);
  // Retention
  if (local.retention.days !== server.retention.days)
    add('retention.days', local.retention.days);
  if (local.retention.strategy !== server.retention.strategy)
    add('retention.strategy', local.retention.strategy);

  return patch;
}

// ── Compact toggle row (horizontal, label right of switch) ────────────────────

function CompactToggle({ name, on, onChange }: { name: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-12">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={name}
        className={'toggle' + (on ? ' on' : '')}
        onClick={() => onChange(!on)}
      />
      <span style={{ fontSize: 13.5, fontWeight: 550 }}>{name}</span>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: settingsData, isLoading: stLoading, isError: stError } = useSettings();
  const { data: overviewData } = useOverview();
  const { mutateAsync: updateSettings } = useUpdateSettings();

  // ── Local edit state ─────────────────────────────────────────────────────
  const [localPosture, setLocalPosture] = useState<SettingsPosture | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Per-pattern server-side 422 error messages keyed by rule id (or '*' = all)
  const [patternFieldErrors, setPatternFieldErrors] = useState<Record<string, string>>({});

  const serverPosture = settingsData ? extractPosture(settingsData.settings) : null;
  const rulesetVersion = overviewData?.ruleset_version ?? '—';

  // Seed local state from server on initial load only.
  useEffect(() => {
    if (serverPosture && localPosture === null) {
      setLocalPosture(JSON.parse(JSON.stringify(serverPosture)) as SettingsPosture);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsData]);

  // ── Dirty check ──────────────────────────────────────────────────────────
  const dirty =
    localPosture != null && serverPosture != null
      ? computeDirty(localPosture, serverPosture)
      : false;

  // ── Pattern validation ─────────────────────────────────────────────────
  const patternsValid =
    localPosture != null
      ? Object.values(localPosture.input_screen.patterns).every(isValidPattern)
      : true;

  // ── Save ─────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!localPosture || !serverPosture || !patternsValid) return;
    setSaving(true);
    setSaveError(null);
    setPatternFieldErrors({});
    try {
      const patch = changedKeys(localPosture, serverPosture);
      const confirmed = await updateSettings({ settings: patch });
      if (confirmed?.settings) {
        setLocalPosture(extractPosture(confirmed.settings));
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings() });
    } catch (err: unknown) {
      // The API client normalizes errors to ApiError instances (errors.ts).
      // ApiError carries `.errors: Record<string, string[]>` and `.message` directly.
      // Fallback to the raw AxiosError shape for any un-normalised paths.
      const e = err as {
        errors?: Record<string, string[]>;
        message?: string;
        response?: { data?: { message?: string; errors?: Record<string, string[]> } };
      };
      const errors = e?.errors ?? e?.response?.data?.errors;

      // ── I6: route per-pattern 422 errors to inline field badges ─────────
      // The server may report errors under two key shapes:
      //   • "input_screen.patterns"            → applies to ALL currently-edited patterns
      //   • "input_screen.patterns.{rid}"      → applies to a specific rule-id
      // We collect both and surface them as per-rid inline badges.
      if (errors && Object.keys(errors).length > 0) {
        const fieldErrs: Record<string, string> = {};
        const editedRids = localPosture ? Object.keys(localPosture.input_screen.patterns) : [];

        for (const [errKey, msgs] of Object.entries(errors)) {
          const msg = Array.isArray(msgs) ? msgs.join(' ') : String(msgs);
          if (errKey === 'input_screen.patterns') {
            // Whole-patterns key — apply to every currently-edited pattern field
            for (const rid of editedRids) {
              fieldErrs[rid] = msg;
            }
          } else if (errKey.startsWith('input_screen.patterns.')) {
            const rid = errKey.slice('input_screen.patterns.'.length);
            fieldErrs[rid] = msg;
          }
        }
        if (Object.keys(fieldErrs).length > 0) {
          setPatternFieldErrors(fieldErrs);
        }

        const msg = Object.values(errors).flat().join('; ');
        setSaveError(msg);
      } else {
        setSaveError(e?.message ?? e?.response?.data?.message ?? 'Save failed.');
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Discard ──────────────────────────────────────────────────────────────
  function handleDiscard() {
    if (serverPosture) {
      setLocalPosture(JSON.parse(JSON.stringify(serverPosture)) as SettingsPosture);
    }
    setSaveError(null);
    setPatternFieldErrors({});
  }

  // ── Updater helpers ──────────────────────────────────────────────────────
  function upd(fn: (p: SettingsPosture) => void) {
    setLocalPosture((prev) => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev)) as SettingsPosture;
      fn(next);
      return next;
    });
  }

  // ── Screen state ─────────────────────────────────────────────────────────
  const state = useScreenState({
    isLoading: stLoading && !settingsData,
    isError: stError,
    isEmpty: false,
  });

  const p = localPosture;

  return (
    <div className="page" data-screen-label="Settings">
      {/* Page header */}
      <div className="page-head">
        <div className="ph-text">
          <h1 className="screen-title">
            <Settings size={19} />
            Settings
          </h1>
          <p className="screen-subtitle">
            The configuration surface. Master kill-switch, three-state control modes
            (enforce / monitor / off), and tunables — normalization, patterns, owner keys,
            retention, authorization.
          </p>
        </div>
        <div className="ph-actions">
          <button
            type="button"
            className="btn btn-sm"
            data-testid="agr-change-history-btn"
            onClick={() => navigate('/settings/audit')}
          >
            <History size={14} /> Change history
          </button>
        </div>
      </div>

      <ScreenState
        testId="agr-settings"
        state={state}
        error={null}
        empty="Settings could not be loaded."
      >
        {p ? (
          <div className="flex col gap-0">
            {/* ── Master ──────────────────────────────────────────────────── */}
            <div className="section-label" style={{ margin: '22px 0 11px' }}>Master</div>
            <div className="panel panel-pad">
              {/* C1: `enabled` is a deploy-time env var — NOT runtime-overridable.
                  Rendered disabled so it cannot trigger dirty state or enter the PATCH. */}
              <Toggle
                name="Guardrails enabled"
                hint="Set via config (not runtime-editable) — deploy-time kill-switch."
                on={p.enabled}
                disabled
                testId="agr-readonly-enabled"
              />
            </div>

            {/* ── Control A — Tool Firewall ────────────────────────────── */}
            <div className="flex items-center justify-between" style={{ margin: '22px 0 11px' }}>
              <span className="section-label" style={{ margin: 0 }}>Control A · Tool Firewall</span>
              <ModeSegmented
                mode={p.modes.tool_firewall}
                onChange={(m) => upd((n) => { n.modes.tool_firewall = m; })}
                testIdPrefix="tool_firewall"
              />
            </div>
            <div className="panel panel-pad">
              <div className="flex col gap-16">
                <Field label="Owner keys" hint="Overwritten server-side with the authenticated principal id.">
                  <Chips
                    values={p.tool_firewall.owner_keys}
                    addLabel="Add owner key"
                    onRemove={(k) => upd((n) => { n.tool_firewall.owner_keys = n.tool_firewall.owner_keys.filter((x) => x !== k); })}
                    onAdd={(k) => upd((n) => { n.tool_firewall.owner_keys = [...new Set([...n.tool_firewall.owner_keys, k])]; })}
                  />
                </Field>
                <div style={{ borderTop: '1px solid var(--color-border)' }} />
                <Toggle
                  name="Reject unknown arguments"
                  hint="Refuse args not declared in the tool schema."
                  on={p.tool_firewall.reject_unknown_arguments}
                  onChange={(v) => upd((n) => { n.tool_firewall.reject_unknown_arguments = v; })}
                />
              </div>
            </div>

            {/* ── Control B — Input Screening ──────────────────────────── */}
            <div className="flex items-center justify-between" style={{ margin: '22px 0 11px' }}>
              <span className="section-label" style={{ margin: 0 }}>Control B · Input Screening</span>
              <ModeSegmented
                mode={p.modes.input_screen}
                onChange={(m) => upd((n) => { n.modes.input_screen = m; })}
                testIdPrefix="input_screen"
              />
            </div>
            <div className="panel panel-pad">
              <div className="flex col gap-16">
                <Field label="Refusal message" hint="Returned to the caller when a prompt is blocked.">
                  <input
                    className="input"
                    style={{ width: '100%' }}
                    data-testid="agr-input-refusal-message"
                    value={p.input_screen.refusal_message}
                    onChange={(e) => upd((n) => { n.input_screen.refusal_message = e.target.value; })}
                  />
                </Field>
                <Field
                  label="Patterns"
                  hint="Rule id → fully-delimited PCRE pattern (e.g. /\bword\b/iu). Invalid regex is flagged inline."
                >
                  <div className="flex col gap-8">
                    {Object.entries(p.input_screen.patterns).map(([rid, rx]) => {
                      const localInvalid = !isValidPattern(rx);
                      const serverErr = patternFieldErrors[rid] ?? null;
                      const hasError = localInvalid || serverErr !== null;
                      return (
                        <div key={rid} className="flex col gap-4">
                          <div className="flex items-center gap-8">
                            <span className="chip mono" style={{ minWidth: 150, justifyContent: 'flex-start' }}>{rid}</span>
                            <input
                              className="input mono"
                              style={{
                                flexGrow: 1,
                                fontSize: 11.5,
                                borderColor: hasError ? 'var(--color-block)' : undefined,
                              }}
                              data-testid={`agr-pattern-input-${rid}`}
                              value={rx}
                              onChange={(e) => {
                                upd((n) => { n.input_screen.patterns[rid] = e.target.value; });
                                // Clear the server-side error for this rid when the user edits
                                if (patternFieldErrors[rid]) {
                                  setPatternFieldErrors((prev) => {
                                    const next = { ...prev };
                                    delete next[rid];
                                    return next;
                                  });
                                }
                              }}
                            />
                            {hasError && (
                              <span
                                className="badge badge-block"
                                data-testid={`agr-pattern-error-${rid}`}
                                title={serverErr ?? 'Invalid PCRE pattern'}
                              >
                                <AlertTriangle size={11} />
                              </span>
                            )}
                          </div>
                          {serverErr && (
                            <span
                              style={{
                                fontSize: 11.5,
                                color: 'var(--color-block)',
                                paddingLeft: 158,
                              }}
                            >
                              {serverErr}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Field>
              </div>
            </div>

            {/* ── Control C — Output Handler ───────────────────────────── */}
            <div className="flex items-center justify-between" style={{ margin: '22px 0 11px' }}>
              <span className="section-label" style={{ margin: 0 }}>Control C · Output Handler</span>
              <ModeSegmented
                mode={p.modes.output_handler}
                onChange={(m) => upd((n) => { n.modes.output_handler = m; })}
                testIdPrefix="output_handler"
              />
            </div>
            <div className="panel panel-pad">
              <div className="flex col gap-16">
                <div className="flex gap-20 wrap">
                  <CompactToggle
                    name="Sanitize HTML"
                    on={p.output_handler.sanitize_html}
                    onChange={(v) => upd((n) => { n.output_handler.sanitize_html = v; })}
                  />
                  <CompactToggle
                    name="Neutralize markdown"
                    on={p.output_handler.neutralize_markdown}
                    onChange={(v) => upd((n) => { n.output_handler.neutralize_markdown = v; })}
                  />
                  <CompactToggle
                    name="Redact PII"
                    on={p.output_handler.redact_pii}
                    onChange={(v) => upd((n) => { n.output_handler.redact_pii = v; })}
                  />
                </div>
                <Field label="HTML mode" hint="Escape everything, or allow a curated tag allowlist.">
                  <select
                    className="select"
                    value={p.output_handler.html_mode}
                    onChange={(e) => upd((n) => { n.output_handler.html_mode = e.target.value as 'escape' | 'allowlist'; })}
                  >
                    <option value="escape">escape</option>
                    <option value="allowlist">allowlist</option>
                  </select>
                </Field>
              </div>
            </div>

            {/* ── Control D — HITL Bridge ──────────────────────────────── */}
            <div className="flex items-center justify-between" style={{ margin: '22px 0 11px' }}>
              <span className="section-label" style={{ margin: 0 }}>Control D · HITL Bridge</span>
              <ModeSegmented
                mode={p.modes.hitl}
                onChange={(m) => upd((n) => { n.modes.hitl = m; })}
                testIdPrefix="hitl"
              />
            </div>
            <div className="panel panel-pad">
              <div className="flex col gap-16">
                <Field label="Destructive tools" hint="Routed through approvalGate() instead of executing.">
                  <Chips
                    values={p.hitl.destructive_tools}
                    addLabel="Add destructive tool"
                    onRemove={(k) => upd((n) => { n.hitl.destructive_tools = n.hitl.destructive_tools.filter((x) => x !== k); })}
                    onAdd={(k) => upd((n) => { n.hitl.destructive_tools = [...new Set([...n.hitl.destructive_tools, k])]; })}
                  />
                </Field>
                <Field label="Fallback" hint="When flow is absent and a destructive tool is called.">
                  <select
                    className="select"
                    value={p.hitl.fallback}
                    onChange={(e) => upd((n) => { n.hitl.fallback = e.target.value as 'deny' | 'pass'; })}
                  >
                    <option value="deny">deny (safe)</option>
                    <option value="pass">pass</option>
                  </select>
                </Field>
              </div>
            </div>

            {/* ── Normalization ────────────────────────────────────────── */}
            <div className="section-label" style={{ margin: '22px 0 11px' }}>Normalization · pre-screening</div>
            <div className="panel panel-pad">
              <div className="flex col gap-16">
                <div className="flex gap-20 wrap">
                  <CompactToggle
                    name="NFKC fold"
                    on={p.normalization.nfkc}
                    onChange={(v) => upd((n) => { n.normalization.nfkc = v; })}
                  />
                  <CompactToggle
                    name="Strip zero-width"
                    on={p.normalization.strip_zero_width}
                    onChange={(v) => upd((n) => { n.normalization.strip_zero_width = v; })}
                  />
                  <CompactToggle
                    name="Casefold"
                    on={p.normalization.casefold}
                    onChange={(v) => upd((n) => { n.normalization.casefold = v; })}
                  />
                  <CompactToggle
                    name="Decode base64"
                    on={p.normalization.decode_base64_blobs}
                    onChange={(v) => upd((n) => { n.normalization.decode_base64_blobs = v; })}
                  />
                  <CompactToggle
                    name="Fold confusables"
                    on={p.normalization.fold_confusables}
                    onChange={(v) => upd((n) => { n.normalization.fold_confusables = v; })}
                  />
                </div>
                <Field label="Max prompt length" hint="Prompts longer than this are refused as too_long before matching.">
                  <input
                    className="input mono"
                    style={{ width: 140 }}
                    type="number"
                    data-testid="agr-input-max-prompt-length"
                    value={p.normalization.max_prompt_length}
                    onChange={(e) => upd((n) => { n.normalization.max_prompt_length = Number(e.target.value); })}
                  />
                </Field>
              </div>
            </div>

            {/* ── Pattern safety ───────────────────────────────────────── */}
            <div className="section-label" style={{ margin: '22px 0 11px' }}>Pattern safety</div>
            <div className="panel panel-pad">
              <div className="flex gap-20 wrap items-end">
                <Field label="On match error" hint="Behaviour when a pattern itself throws.">
                  <select
                    className="select"
                    value={p.pattern_safety.on_match_error}
                    onChange={(e) => upd((n) => { n.pattern_safety.on_match_error = e.target.value as 'closed' | 'open'; })}
                  >
                    <option value="closed">block (fail closed)</option>
                    <option value="open">allow (fail open)</option>
                  </select>
                </Field>
                <Field label="Ruleset version" hint="Validated at boot · read-only.">
                  <span className="chip mono" data-testid="agr-ruleset-version">{rulesetVersion}</span>
                </Field>
              </div>
            </div>

            {/* ── Tool authorization ───────────────────────────────────── */}
            <div className="section-label" style={{ margin: '22px 0 11px' }}>Tool authorization</div>
            <div className="panel panel-pad">
              <div className="flex col gap-16">
                <Toggle
                  name="Authorization layer enabled"
                  hint="Scope tool args to the principal beyond simple owner-key overwrite."
                  on={p.tool_authorization.enabled}
                  onChange={(v) => upd((n) => { n.tool_authorization.enabled = v; })}
                />
                <div className="flex gap-20 wrap items-end">
                  <Field label="Owner-key depth">
                    <select
                      className="select"
                      value={p.tool_authorization.owner_key_depth}
                      onChange={(e) => upd((n) => { n.tool_authorization.owner_key_depth = e.target.value as 'top_level' | 'recursive'; })}
                    >
                      <option value="top_level">top_level</option>
                      <option value="recursive">recursive</option>
                    </select>
                  </Field>
                  <Field label="Destructive match">
                    <select
                      className="select"
                      value={p.tool_authorization.destructive_match}
                      onChange={(e) => upd((n) => { n.tool_authorization.destructive_match = e.target.value as 'exact' | 'substring'; })}
                    >
                      <option value="exact">exact</option>
                      <option value="substring">substring</option>
                    </select>
                  </Field>
                </div>
              </div>
            </div>

            {/* ── Audit hygiene & retention ────────────────────────────── */}
            <div className="section-label" style={{ margin: '22px 0 11px' }}>Audit hygiene &amp; retention</div>
            <div className="panel panel-pad">
              <div className="flex col gap-16">
                <div className="flex gap-20 wrap items-end">
                  <Field label="Prompt storage" hint="How screened prompts are persisted at rest.">
                    <select
                      className="select"
                      value={p.audit_hygiene.prompt_storage}
                      onChange={(e) => upd((n) => { n.audit_hygiene.prompt_storage = e.target.value as 'raw' | 'redact' | 'hash' | 'truncate'; })}
                    >
                      <option value="raw">raw</option>
                      <option value="redact">redact (PII removed)</option>
                      <option value="hash">hash (sha256 only)</option>
                      <option value="truncate">truncate</option>
                    </select>
                  </Field>
                  <Field label="Retention (days)">
                    <input
                      className="input mono"
                      style={{ width: 120 }}
                      type="number"
                      step="1"
                      min="0"
                      data-testid="agr-input-retention-days"
                      value={p.retention.days}
                      onChange={(e) => {
                        // M3: guard to non-negative integer client-side; server validates as backstop
                        const v = Math.max(0, Math.trunc(Number(e.target.value)));
                        upd((n) => { n.retention.days = v; });
                      }}
                    />
                  </Field>
                  <Field label="Strategy">
                    <select
                      className="select"
                      value={p.retention.strategy}
                      onChange={(e) => upd((n) => { n.retention.strategy = e.target.value as 'purge' | 'anonymize' | 'keep'; })}
                    >
                      <option value="purge">purge</option>
                      <option value="anonymize">anonymize</option>
                      <option value="keep">keep</option>
                    </select>
                  </Field>
                </div>
              </div>
            </div>

            {/* ── Injection Audit Store (READ-ONLY / infra) ─────────────── */}
            <div className="section-label" style={{ margin: '22px 0 11px' }}>Injection Audit Store</div>
            <div className="panel panel-pad">
              <div className="flex gap-20 wrap items-end">
                <Field
                  label="Store driver"
                  hint="Set via config file — not runtime-editable."
                >
                  <input
                    className="input mono"
                    data-testid="agr-readonly-audit.store"
                    disabled
                    placeholder="set via config (not runtime-editable)"
                    style={{ width: 200, opacity: 0.6 }}
                  />
                </Field>
                <Field
                  label="Table"
                  hint="Set via config file — not runtime-editable."
                >
                  <input
                    className="input mono"
                    data-testid="agr-readonly-audit.table"
                    disabled
                    placeholder="set via config (not runtime-editable)"
                    style={{ width: 280, opacity: 0.6 }}
                  />
                </Field>
              </div>
              <p className="muted" style={{ fontSize: 12, margin: '10px 0 0' }}>
                Infrastructure settings (store driver, table, connection) are set via
                config file and cannot be changed at runtime.{' '}
                <span style={{ color: 'var(--color-fg-subtle)' }}>set via config</span>
              </p>
            </div>
          </div>
        ) : null}
      </ScreenState>

      {/* Sticky save bar — blocked when patterns invalid */}
      <SaveBar
        dirty={dirty}
        saving={saving}
        error={saveError}
        onSave={handleSave}
        onDiscard={handleDiscard}
        message="You have unsaved configuration changes."
        saveDisabled={!patternsValid}
      />
    </div>
  );
}
