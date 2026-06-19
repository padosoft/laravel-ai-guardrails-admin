import { Code, Eye, Filter, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Badge, modeBadgeLabel, modeBadgeVariant } from '../components/Badge';
import { Banner } from '../components/Banner';
import { BarBreakdown } from '../components/BarBreakdown';
import { SaveBar } from '../components/SaveBar';
import { ScreenState, useScreenState } from '../components/ScreenState';
import { StatCard } from '../components/StatCard';
import { Toggle } from '../components/Toggle';
import { useQueryClient } from '@tanstack/react-query';
import { useOutputStats, useSettings, useUpdateSettings, queryKeys } from '../lib/queries';
import type { ControlMode } from '../lib/api/types';

// ── Output handler settings shape ────────────────────────────────────────────

interface OutputPosture {
  sanitize_html: boolean;
  neutralize_markdown: boolean;
  redact_pii: boolean;
  html_mode: 'escape' | 'allowlist';
}

function extractOutputPosture(settings: Record<string, unknown>): OutputPosture {
  const oh = (settings.output_handler ?? {}) as Record<string, unknown>;
  return {
    sanitize_html: Boolean(oh.sanitize_html),
    neutralize_markdown: Boolean(oh.neutralize_markdown),
    redact_pii: Boolean(oh.redact_pii),
    html_mode: (oh.html_mode as 'escape' | 'allowlist') ?? 'escape',
  };
}

function extractOutputMode(settings: Record<string, unknown>): ControlMode {
  const modes = (settings.modes ?? {}) as Record<string, unknown>;
  return (modes.output_handler as ControlMode) ?? 'enforce';
}

// ── Dirty check ───────────────────────────────────────────────────────────────

function computeDirty(local: OutputPosture, server: OutputPosture): boolean {
  return (
    local.sanitize_html !== server.sanitize_html ||
    local.neutralize_markdown !== server.neutralize_markdown ||
    local.redact_pii !== server.redact_pii ||
    local.html_mode !== server.html_mode
  );
}

// ── Changed-keys builder ──────────────────────────────────────────────────────
// Builds a minimal dotted-key patch containing only the keys that actually changed.

function changedKeys(local: OutputPosture, server: OutputPosture): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (local.sanitize_html !== server.sanitize_html) {
    patch['output_handler.sanitize_html'] = local.sanitize_html;
  }
  if (local.neutralize_markdown !== server.neutralize_markdown) {
    patch['output_handler.neutralize_markdown'] = local.neutralize_markdown;
  }
  if (local.redact_pii !== server.redact_pii) {
    patch['output_handler.redact_pii'] = local.redact_pii;
  }
  if (local.html_mode !== server.html_mode) {
    patch['output_handler.html_mode'] = local.html_mode;
  }
  return patch;
}

// ── PII activity indicator ────────────────────────────────────────────────────
// Indicates whether the pii-redactor appears active: redact_pii is enabled AND
// by_detector has at least one entry (i.e. redactions have been recorded in the window).
// We do NOT use this to disable the toggle — the real API exposes no `pii_available`
// flag, so the prototype's `disabled={!pii_available}` would false-negative on an
// installed-but-idle redactor. The toggle stays enabled regardless.

function isPiiActive(
  redactPii: boolean,
  byDetector: Record<string, number>,
): boolean {
  return redactPii && Object.keys(byDetector).length > 0;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function OutputPage() {
  const queryClient = useQueryClient();

  const { data: statsData, isLoading: statsLoading, isError: statsError } = useOutputStats();
  const { data: settingsData, isLoading: stLoading, isError: stError } = useSettings();
  const { mutateAsync: updateSettings } = useUpdateSettings();

  // ── Local edit state ─────────────────────────────────────────────────────
  const [localPosture, setLocalPosture] = useState<OutputPosture | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const serverPosture = settingsData
    ? extractOutputPosture(settingsData.settings)
    : null;

  const mode: ControlMode = settingsData
    ? extractOutputMode(settingsData.settings)
    : 'enforce';

  // Seed local state from server on initial load only.
  // After first seed, local state is authoritative — background refetches
  // never clobber in-flight edits.
  useEffect(() => {
    if (serverPosture && localPosture === null) {
      setLocalPosture({ ...serverPosture });
    }
    // localPosture intentionally excluded — only react to server data arriving.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsData]);

  // ── Dirty check ──────────────────────────────────────────────────────────
  const dirty =
    localPosture != null && serverPosture != null
      ? computeDirty(localPosture, serverPosture)
      : false;

  // ── Save ─────────────────────────────────────────────────────────────────
  // Race-free seed-on-save: seed local state directly from the PUT response.
  async function handleSave() {
    if (!localPosture || !serverPosture) return;
    setSaving(true);
    setSaveError(null);
    try {
      const patch = changedKeys(localPosture, serverPosture);
      const confirmed = await updateSettings({ settings: patch });
      if (confirmed?.settings) {
        setLocalPosture(extractOutputPosture(confirmed.settings));
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings() });
    } catch (err: unknown) {
      // The API client normalizes errors to ApiError instances (errors.ts).
      // ApiError carries `.errors` and `.message` directly (no `.response` wrapper).
      // Fallback to the raw AxiosError shape for any un-normalised paths.
      const e = err as {
        errors?: Record<string, string[]>;
        message?: string;
        response?: { data?: { message?: string; errors?: Record<string, string[]> } };
      };
      const fieldErrors = e?.errors ?? e?.response?.data?.errors;
      const msg = fieldErrors
        ? Object.values(fieldErrors).flat().join('; ')
        : e?.message ?? e?.response?.data?.message ?? 'Save failed.';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }

  // ── Discard ──────────────────────────────────────────────────────────────
  function handleDiscard() {
    if (serverPosture) {
      setLocalPosture({ ...serverPosture });
    }
    setSaveError(null);
  }

  // ── Screen state ─────────────────────────────────────────────────────────
  const state = useScreenState({
    isLoading: (statsLoading || stLoading) && !statsData && !settingsData,
    isError: statsError || stError,
    isEmpty: false,
  });

  // ── Derived data ─────────────────────────────────────────────────────────
  const counts = statsData?.counts;
  const byDetector = counts?.pii?.by_detector ?? {};
  const detectorItems = Object.entries(byDetector).map(([label, value]) => ({ label, value }));
  const piiActive = localPosture ? isPiiActive(localPosture.redact_pii, byDetector) : false;
  // Show idle note when redact_pii is on but no redactions have been recorded in the window.
  const showPiiIdleNote = localPosture?.redact_pii === true && Object.keys(byDetector).length === 0;

  return (
    <div className="page" data-screen-label="Output Handler">
      {/* Page header */}
      <div className="page-head">
        <div className="ph-text">
          <h1 className="screen-title">
            <Filter size={19} />
            Output Handler
          </h1>
          <p className="screen-subtitle">
            Treats model output as untrusted: escapes HTML, neutralizes markdown
            exfiltration vectors, validates structured output, and redacts PII.
          </p>
        </div>
        <div className="ph-actions">
          <Badge variant={modeBadgeVariant(mode)} testId="agr-status-badge">
            {modeBadgeLabel(mode)}
          </Badge>
        </div>
      </div>

      {/* Monitor-mode shadow banner — output passes through unmodified in this mode */}
      {mode === 'monitor' && (
        <div style={{ marginBottom: 16 }}>
          <Banner kind="info" icon="eye" testId="agr-monitor-banner">
            <b>Shadow mode.</b> The handler computes what it <i>would</i> sanitize and
            redact, and records the counts below — but passes output through unmodified.
            Switch to Enforce on Settings to apply.
          </Banner>
        </div>
      )}

      <ScreenState
        testId="agr-output"
        state={state}
        error={null}
        empty="No output processed yet."
      >
        <>
          {/* Stat cards */}
          <div className="grid cols-4 gap-14" style={{ margin: '22px 0 22px' }}>
            <StatCard
              label="HTML escaped"
              icon={Code}
              value={(counts?.html_stripped ?? 0).toLocaleString()}
              sub="tags neutralized"
              testId="agr-stat-html"
            />
            <StatCard
              label="Markdown neutralized"
              icon={Filter}
              value={(counts?.markdown_sanitized ?? 0).toLocaleString()}
              sub="link/image vectors"
              testId="agr-stat-markdown"
            />
            <StatCard
              label="Structured rejections"
              icon={AlertTriangle}
              value={(counts?.structured_validation_failure ?? 0).toLocaleString()}
              sub="schema violations"
              testId="agr-stat-structured"
            />
            <StatCard
              label="PII redactions"
              icon={Eye}
              value={(counts?.pii_redaction ?? 0).toLocaleString()}
              sub="across all detectors"
              testId="agr-stat-pii"
            />
          </div>

          {/* PII by detector */}
          <div className="section-label" style={{ margin: '22px 0 11px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>PII redactions by detector</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              {/* status-dot uses prototype class names: engaged = active, degraded = idle/off */}
              <span
                className={`status-dot ${piiActive ? 'engaged' : 'degraded'}`}
                aria-hidden="true"
              />
              <span className="muted">
                pii-redactor {piiActive ? 'active' : 'no recent redactions'}
              </span>
            </span>
          </div>
          <div className="panel panel-pad">
            <BarBreakdown
              items={detectorItems}
              emptyMessage="No per-detector data yet — either no PII has been redacted or the pii-redactor package is not installed."
            />
          </div>

          {/* Handler configuration */}
          <div className="section-label" style={{ margin: '22px 0 11px' }}>
            Handler configuration
          </div>
          <div className="panel panel-pad">
            <div className="flex col gap-16">
              {localPosture && (
                <>
                  {/* Sanitize HTML + html_mode segmented control */}
                  <div className="flex items-center justify-between gap-16 wrap">
                    <div className="toggle-label">
                      <div className="tl-name">Sanitize HTML</div>
                      <div className="tl-hint">
                        Escape HTML so model output can't inject markup / stored-XSS.
                      </div>
                    </div>
                    <div className="flex items-center gap-12">
                      {/* HTML mode segmented control */}
                      <div className="segmented" role="group" aria-label="HTML mode">
                        <button
                          type="button"
                          className={localPosture.html_mode === 'escape' ? 'on' : ''}
                          onClick={() =>
                            setLocalPosture((p) => p ? { ...p, html_mode: 'escape' } : p)
                          }
                          aria-pressed={localPosture.html_mode === 'escape'}
                        >
                          Escape
                        </button>
                        <button
                          type="button"
                          className={localPosture.html_mode === 'allowlist' ? 'on' : ''}
                          onClick={() =>
                            setLocalPosture((p) => p ? { ...p, html_mode: 'allowlist' } : p)
                          }
                          aria-pressed={localPosture.html_mode === 'allowlist'}
                        >
                          Allowlist
                        </button>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={localPosture.sanitize_html}
                        aria-label="Sanitize HTML"
                        className={'toggle' + (localPosture.sanitize_html ? ' on' : '')}
                        onClick={() =>
                          setLocalPosture((p) =>
                            p ? { ...p, sanitize_html: !p.sanitize_html } : p,
                          )
                        }
                      />
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--color-border)' }} />

                  {/* Neutralize markdown */}
                  <Toggle
                    name="Neutralize markdown"
                    hint="Defang markdown link/image targets — the classic data-exfiltration vector."
                    on={localPosture.neutralize_markdown}
                    onChange={(v) =>
                      setLocalPosture((p) => p ? { ...p, neutralize_markdown: v } : p)
                    }
                  />

                  <div style={{ borderTop: '1px solid var(--color-border)' }} />

                  {/* Redact PII — toggle is always enabled.
                      We diverge from the prototype's disabled={!pii_available} because the
                      real /output/stats API exposes no pii_available flag. Disabling on the
                      weak by_detector heuristic would false-negative an installed-but-idle
                      redactor and wrongly block the user from toggling it. */}
                  <Toggle
                    name="Redact PII"
                    hint="Delegated to padosoft/laravel-pii-redactor when present."
                    on={localPosture.redact_pii}
                    onChange={(v) =>
                      setLocalPosture((p) => p ? { ...p, redact_pii: v } : p)
                    }
                    testId="agr-toggle-redact-pii"
                  />

                  {/* Idle note: redact_pii is ON but no redactions recorded — surface as info, not error */}
                  {showPiiIdleNote && (
                    <p
                      className="muted"
                      style={{ fontSize: 12, margin: 0 }}
                      data-testid="agr-pii-idle-note"
                    >
                      No PII redactions recorded in this window — if you expect redactions,
                      verify <span className="mono">padosoft/laravel-pii-redactor</span> is installed.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      </ScreenState>

      {/* Sticky save bar */}
      <SaveBar
        dirty={dirty}
        saving={saving}
        error={saveError}
        onSave={handleSave}
        onDiscard={handleDiscard}
        message="You have unsaved output-handler changes."
      />
    </div>
  );
}
