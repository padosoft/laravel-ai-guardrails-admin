import { Code, Eye, Filter, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Badge, modeBadgeLabel, modeBadgeVariant } from '../components/Badge';
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

// ── PII availability heuristic ────────────────────────────────────────────────
// The API does not currently expose a dedicated "pii_available" flag.
// We infer availability: if redact_pii is enabled AND the by_detector map
// has at least one entry, the redactor is present and active.
// This is documented as a heuristic — a future API field would replace it.

function isPiiAvailable(
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
      const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const msg =
        e?.response?.data?.errors
          ? Object.values(e.response.data.errors).flat().join('; ')
          : e?.response?.data?.message ?? 'Save failed.';
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
  const piiAvailable = localPosture
    ? isPiiAvailable(localPosture.redact_pii, byDetector)
    : false;

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
              <span
                className={`status-dot ${piiAvailable ? 'dot-engaged' : 'dot-off'}`}
                aria-hidden="true"
              />
              <span className="muted">
                pii-redactor {piiAvailable ? 'available' : 'absent'}
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

                  {/* Redact PII */}
                  <Toggle
                    name="Redact PII"
                    hint="Delegated to padosoft/laravel-pii-redactor when present."
                    on={localPosture.redact_pii}
                    onChange={(v) =>
                      setLocalPosture((p) => p ? { ...p, redact_pii: v } : p)
                    }
                    testId="agr-toggle-redact-pii"
                  />
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
