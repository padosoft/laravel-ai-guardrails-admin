# Changelog

All notable changes to `padosoft/laravel-ai-guardrails-admin` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-06-19

Initial release. A complete React admin panel for the `padosoft/laravel-ai-guardrails` HTTP API
(`ai-guardrails.api.v1`), mountable as a Laravel package with prebuilt Vite assets.

### Added

#### Backend scaffold (Task 1)
- `LaravelAiGuardrailsAdminServiceProvider` — mergeConfig, loadViews, loadRoutes, publishes config/views/assets.
- `PanelController` — normalizes api_base, mount_prefix, theme, asset_path; injects `window.__AI_GUARDRAILS_ADMIN__` JSON.
- `config/ai-guardrails-admin.php` — five env-driven keys (`mount_prefix`, `middleware`, `api_base`, `theme_default`, `asset_path`).
- `routes/web.php` — catch-all shell route under configurable prefix + middleware.
- `resources/views/panel.blade.php` — Vite manifest loader + `#agr-root` mount point.
- PHPUnit suites: Feature (panel mount), Unit (config defaults), Architecture (no PHP coupling to core).
- Pint + PHPStan level 8 configuration.

#### Frontend toolchain + app shell (Task 2)
- React 19 + Vite 6 + Tailwind v4 CSS-first (no postcss.config.js, no tailwind.config.js).
- TanStack Query v5, React Router v7, Axios with XSRF wiring + envelope-unwrap interceptor.
- Full API client layer: `createApiClient()`, 13 endpoint methods, 9 query hooks + 5 mutations.
- Real v1.1.0 TypeScript type definitions for all API shapes.
- `DemoStateProvider` — operator-controlled data/loading/empty/error override for onboarding.
- `Shell` — 248px sidebar with 7 nav items (3 groups), topbar with breadcrumb + demo segmented + theme toggle.
- `ScreenState` — `data-testid` / `data-state` / `aria-busy` / `aria-live` semantics on every screen.
- Vitest + MSW v2 unit/integration test harness.
- Playwright E2E harness driving the real production bundle via `scripts/serve-e2e.mjs`.
- GitHub Actions CI matrix (PHP 8.3/8.4/8.5 × Laravel 11/12/13; frontend typecheck + build + test; Playwright).

#### Dashboard screen (Task 3)
- Control-card matrix with mode badges (ENFORCE / MONITOR / OFF) and posture summary.
- 3-band stacked SVG area chart: `clean = allowed − observed`, `observed`, `blocked` (no double-counting).
- 24h totals row with KPI stat cards.
- Configurable time-range selector (1h / 6h / 24h / 7d) triggering `/audit/trend` refetch.
- Live refresh indicator.
- UTC-safe time-range arithmetic; unique sparkline gradient IDs via `useId()`.

#### Injection Audit screen (Task 4)
- Paginated audit table with keyset cursor (Load more), filterable by free text / verdict / rule ID / principal.
- Client-side verdict derivation: Blocked / Observed (monitor-mode match) / Allowed / Errored.
- Hygiene-aware detail drawer: byte-accurate matched-span highlighting via `TextEncoder`/`TextDecoder`; detects and labels redacted/hashed/truncated prompts without fabricating a highlight.
- `isHashOrRedacted()` guard prevents hex hashes from triggering a false `<mark>`.
- Filter-reset correctness: cursor and accumulated entries cleared atomically with filter state changes.

#### Tool Firewall screen (Task 5)
- Live posture: owner keys (editable tag set), reject-unknown-arguments toggle, mode badge.
- Rejections detail drawer with tool name, scoped arguments, timestamps.
- Reusable `SaveBar` component (sticky, dirty-gated, error-inline) and `Chips` (add/remove tag set).
- `PUT /settings` sends only actually-changed keys; order-insensitive dirty check for array fields.
- Seed-on-save pattern (seeds local state from PUT response, not from a re-seed effect).

#### Output Handler screen (Task 6)
- Sanitization counters + HTML-escape / markdown-neutralize / PII-redact stats.
- `BarBreakdown` component for PII-by-detector horizontal bar chart.
- Monitor-mode banner (shadow-mode, output passes through unmodified).
- Honest PII-availability note: toggle always enabled; idle-note shown when `by_detector` is empty.
- Full `panel.css` with all layout helpers, status-dot, bar, banner, save-bar, badge, and button CSS.

#### Approvals / HITL screen (Task 7)
- Approval queue with tool name, scoped arguments preview, requested-ago, expires-in.
- Detail drawer showing tool, run_id, full scoped args (no fabricated token value).
- Security-correct token-paste confirm drawer: operator pastes the plaintext token received out-of-band.
- 409 (HITL unavailable) → banner; 422 (decision failed) → inline error, drawer stays open for retry.

#### Settings screen (Task 8)
- 10 config sections covering all four controls + normalization + retention + audit hygiene.
- `OVERRIDABLE_KEYS` static constant (31 keys) mirroring the core's allow-list; non-overridable infra keys rendered read-only.
- `ModeSegmented` — Enforce / Monitor / Off segmented control with per-button `data-testid`.
- Per-pattern PCRE regex validation with inline error badge; Save disabled until all patterns valid.
- Master `enabled` key rendered read-only (deploy-time env var, not runtime-overridable).
- Change History navigation link.

#### Change History screen (Task 9)
- Append-only table of every `PUT /settings` mutation with actor, timestamp, old→new diff chips.
- Red chip for old value, green chip for new value; XSS-as-text (React text nodes, no `innerHTML`).
- Load-more (page replace, not append; SERVER_MAX = 200, PAGE_SIZE = 50).
- Relative "when" display (e.g. "3m ago", "2h ago") with raw ISO as tooltip.
- Back to Settings navigation.

#### Try · Sandbox screen (Task 10)
- Screening panel: `POST /try/screen` → authoritative verdict (blocked / allowed / observed) + rule match.
- Illustrative normalization preview: client-side NFKC + zero-width strip + casefold diff chips, clearly labelled as non-authoritative.
- Sanitize panel: `POST /try/sanitize` → before/after text display, changed/unchanged indicator.
- Input snapshotted at submit time so "Before" block is stable during mid-flight edits.
- No `dangerouslySetInnerHTML`; XSS guard tested in both Vitest and Playwright.

#### Documentation + distribution assets (Task 11)
- Full `README.md` with quick start, config table, API contract, security and honest design notes, embedded mount, and testing instructions.
- `CHANGELOG.md` (this file).
- `docs/PROGRESS.md` — task-by-task completion record.
- `docs/LESSON.md` — accumulated non-obvious discoveries.
- Prebuilt Vite SPA assets committed to `public/vendor/ai-guardrails-admin/` for zero-npm-install consumer workflow.

[1.0.0]: https://github.com/padosoft/laravel-ai-guardrails-admin/releases/tag/v1.0.0
