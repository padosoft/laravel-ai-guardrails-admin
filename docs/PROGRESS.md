# PROGRESS — laravel-ai-guardrails-admin

All 11 tasks on branch `feature/admin-panel` are complete as of 2026-06-19.

---

## Task 1 — Backend scaffold + Laravel mount (2026-06-19)

**Commit:** `5c7c99e` (initial) → `fb5d478` (fix pass)

- `LaravelAiGuardrailsAdminServiceProvider`, `PanelController`, config, routes, Blade shell.
- PHPUnit suites: Feature (panel mount), Unit (config defaults), Architecture (no PHP coupling to core).
- Pint + PHPStan level 8.
- **Fix pass:** `.gitignore` (standard package ignores; `/public/vendor` ignored at this stage), JSON_HEX_APOS|JSON_HEX_QUOT in json_encode, architecture test cleanup, `composer.lock` untracked.
- Gates: 8 PHPUnit tests green, Pint pass, PHPStan level 8 no errors.

---

## Task 2 — Frontend toolchain + app shell (2026-06-19)

**Commit:** `7e83a3b` (initial) → `9953d24` (fix pass)

- React 19 + Vite 6 + Tailwind v4 CSS-first + TanStack Query v5 + React Router v7 + Axios.
- Full API client layer (envelope-unwrap interceptor, XSRF wiring, error normalization, 9 query hooks + 5 mutations).
- Real v1.1.0 TypeScript type definitions.
- `DemoStateProvider`, `ScreenState` (data-testid / data-state / aria-live).
- `Shell` (sidebar, topbar, 7 nav items, theme toggle).
- Vitest + MSW v2 harness; Playwright E2E harness.
- GitHub Actions CI matrix.
- **Fix pass:** bare-data envelope unwrap (resolves to inner payload), explicit XSRF wiring, routeBase() tests, NotFoundError vs FeatureDisabledError split, prefix breadcrumb longest-match, nav fidelity (7 items, Change History not in sidebar).
- Gates: 19 vitest, 2 e2e, 8 PHP, typecheck clean, build green.

---

## Task 3 — Dashboard screen (2026-06-19)

**Commit:** `ab4f7bd` (initial) → `461e8ad` (fix pass)

- Control-card matrix, 3-band area chart (`clean = allowed − observed`), 24h KPI totals, time-range selector.
- `Sparkline`, `AreaChart`, `StatCard`, `Badge` components.
- **Fix pass:** UTC-safe time-range arithmetic, real Playwright trend-wait (waitForResponse), unique sparkline gradient IDs via `useId()`, `aria-live="polite"` on ScreenState.
- Gates: 29 vitest, 7 e2e, typecheck clean, build green.

---

## Task 4 — Injection Audit screen (2026-06-19)

**Commit:** `068d8d2` (initial) → `11acf5e` (fix pass)

- Paginated keyset audit table with filters; `DataTable` and `Drawer` components.
- Hygiene-aware detail drawer with byte-accurate matched-span highlighting.
- **Fix pass:** blank Principal column (removed fake prompt_preview slice), robust hash/redact detection (`isHashOrRedacted()`), byte-offset UTF-8 safety via TextEncoder/TextDecoder, filter-reset correctness (no stale cursor), de-duplication.
- Gates: 44 vitest, 11 e2e, typecheck clean, build green.

---

## Task 5 — Tool Firewall screen (2026-06-19)

**Commit:** `2d0745b` (initial) → `698816f` (fix pass)

- Firewall posture with editable owner-keys Chips, reject-unknown-arguments Toggle, mode badge.
- Rejections drawer with tool+args details.
- Reusable `SaveBar` (dirty-gated, error-inline, seed-on-save contract).
- **Fix pass:** race-free seed-on-save (seeds from PUT response body, not re-seed effect), order-insensitive owner_keys dirty check, typed `{settings: ...}` wrapper enforced by TypeScript.
- Gates: 63 vitest, 15 e2e, typecheck clean, build green.

---

## Task 6 — Output Handler screen (2026-06-19)

**Commit:** `273bda0` (initial) → `f6d9841` (fix pass)

- Sanitization stats, `BarBreakdown` PII-by-detector chart, config editing with `SaveBar`.
- **Fix pass:** monitor-mode `Banner` component, honest PII-availability (toggle always enabled; idle-note instead of fake disable), status-dot CSS, full missing CSS ported from prototype (`panel.css` now complete).
- Gates: 86 vitest, 19 e2e, typecheck clean, build green.

---

## Task 7 — Approvals / HITL screen (2026-06-19)

**Commit:** `f56258a`

- HITL queue with tool/args/run_id/age; detail drawer; token-paste confirm drawer (security-correct divergence from prototype).
- 409 → HITL-unavailable banner; 422 → inline error, drawer stays open.
- Gates: 99 vitest, 25 e2e, typecheck clean, build green.

---

## Task 8 — Settings screen (2026-06-19)

**Commit:** `8a3c5f4` (initial) → `1608f5e` (fix pass)

- 10 config sections; `OVERRIDABLE_KEYS` (31 keys); `ModeSegmented`; `Field`; per-pattern PCRE regex validation; `saveDisabled` prop on SaveBar.
- **Fix pass:** master `enabled` field rendered read-only (no ghost-save), per-pattern 422 inline errors, integer guard for `retention.days`, `toBeDefined()` → `toBeInTheDocument()`, Drawer focus-steal bug fixed in approvals tests.
- Gates: 118 vitest, 29 e2e, typecheck clean, build green.

---

## Task 9 — Change History screen (2026-06-19)

**Commit:** `403dc3e` (initial) → `4aae577` (fix pass)

- Append-only settings-change audit table; old→new diff chips; load-more (replace, not append).
- **Fix pass:** relative "when" display, load-more replace assertion, back-to-settings nav test non-vacuous, XSS-as-text test.
- Gates: 133 vitest, 5 e2e (change-history), 29 e2e (full suite), typecheck clean, build green.

---

## Task 10 — Try · Sandbox screen (2026-06-19)

**Commit:** `d00ef77` (initial) → `dfc4db6` (fix pass)

- Screening panel (`POST /try/screen`) + illustrative normalization diff; sanitize panel (`POST /try/sanitize`).
- **Fix pass:** snapshot submitted prompt for normalization preview (not live textarea value), real e2e XSS assertion (DOM check + escaped text content), extended degradation-note test, homoglyph seed comment.
- Gates: 149 vitest, 40 e2e, typecheck clean, build green.

---

## Task 11 — Docs + final asset build + release prep (2026-06-19)

- `README.md` — full quick start, config table, API contract, security + honest design notes, embedded mount, testing, suite table.
- `CHANGELOG.md` — `v1.0.0` section with all 11 tasks documented.
- `docs/PROGRESS.md` (this file) and `docs/LESSON.md`.
- `npm run build` (final build, all 3 outputs: SPA + lib + tsc declarations).
- `.gitignore` updated: removed `/public/vendor` line; prebuilt `public/vendor/ai-guardrails-admin/` assets tracked and committed.
- Gates: 149 vitest, build green, 40 e2e, 8 PHP, Pint pass, PHPStan level 8 no errors.

---

## Summary

| Task | Screen / Component | Commit(s) | Gates |
|------|--------------------|-----------|-------|
| 1 | Backend scaffold | 5c7c99e, fb5d478 | 8 PHP |
| 2 | Frontend shell | 7e83a3b, 9953d24 | 19 vitest, 2 e2e, 8 PHP |
| 3 | Dashboard | ab4f7bd, 461e8ad | 29 vitest, 7 e2e |
| 4 | Injection Audit | 068d8d2, 11acf5e | 44 vitest, 11 e2e |
| 5 | Tool Firewall | 2d0745b, 698816f | 63 vitest, 15 e2e |
| 6 | Output Handler | 273bda0, f6d9841 | 86 vitest, 19 e2e |
| 7 | Approvals | f56258a | 99 vitest, 25 e2e |
| 8 | Settings | 8a3c5f4, 1608f5e | 118 vitest, 29 e2e |
| 9 | Change History | 403dc3e, 4aae577 | 133 vitest, 29 e2e |
| 10 | Try · Sandbox | d00ef77, dfc4db6 | 149 vitest, 40 e2e |
| 11 | Docs + assets | TBD | 149 vitest, 40 e2e, 8 PHP |
