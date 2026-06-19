# Design — laravel-ai-guardrails-admin (+ core v1.1.0 API extension)

**Date:** 2026-06-19
**Status:** Approved (design); pending spec review → implementation plan.
**Author:** Lorenzo Padovani / Claude

## 1. Purpose & scope

Build `padosoft/laravel-ai-guardrails-admin`: the web control plane for the
`padosoft/laravel-ai-guardrails` core package. It surfaces every guardrail control
(Dashboard, Injection Audit, Tool Firewall, Output Handler, Approvals/HITL, Settings,
Change History, Try/Sandbox) as a single-page admin UI, mounted into a host Laravel app.

The admin is an **HTTP-only consumer** of the core's `ai-guardrails.api.v1` envelope. It
follows the Padosoft admin-package house pattern (canonical sibling:
`laravel-evidence-risk-review-admin`) and reproduces the approved design prototype
pixel-faithfully.

**Visual baseline:** the approved prototype handoff
(`C:\Users\lopad\Downloads\laravel-ai-guardrails-admin-handoff\...`) and the 11 screenshots
in `resources/screenshots/`. Where the prototype and any prior note disagree, the prototype
wins (e.g. accent is **cyan `#38bdf8`**, not teal).

### Approved decisions (brainstorming)

1. **Extend the core fully** so the admin is pixel-perfect (vs. freezing core / degrading UI).
   The prototype needs richer data than core v1.0.0 exposes → ship an **additive** core
   **v1.1.0** first.
2. **Settings screen renders everything; edits only the overridable allow-list.** The core's
   overridable allow-list is widened (Phase 0) where safe; the rest stays read-only.
3. **Stack: React 19 + Vite (latest) + Tailwind v4** (modern), TanStack Query v5, React
   Router v7, Axios.
4. **Phase 0 (core v1.1.0) ships before the admin.** It is the hard dependency.
5. **One screen = one PR** (implementation phases 3–10).
6. **No docmd site for the admin** — README + internal `docs/` only. (docmd is core-only.)

## 2. Architecture

### 2.1 Two coordinated sub-projects

- **Phase 0 — core `v1.1.0`** on repo `laravel-ai-guardrails`. Purely additive, default-safe,
  both-states tested, subject to the core's existing gates: TDD → Infection ≥80% MSI →
  docs-site (docmd) update → README sync → Copilot PR review loop → SemVer tag `v1.1.0`.
- **Phases 1–N — admin SPA** on repo `laravel-ai-guardrails-admin`. Declares
  `composer require padosoft/laravel-ai-guardrails` (already on Packagist) and binds to the
  extended HTTP API.

### 2.2 Admin backend (thin)

- `LaravelAiGuardrailsAdminServiceProvider` (only PHP service file):
  `mergeConfigFrom` → loads `config/ai-guardrails-admin.php`; `boot()` loads views
  (namespace `ai-guardrails-admin`), routes, and (in console) publishes config / views /
  built assets.
- `routes/web.php`: a single catch-all `Route::get('/{any?}')->where('any', '.*')` under
  `mount_prefix`, with middleware from config. Middleware **never resolves to empty**
  (falls back to `['web']`).
- `Http/Controllers/PanelController` renders `resources/views/panel.blade.php`, which injects
  the runtime config object `window.__AI_GUARDRAILS_ADMIN__ = { api_base, mount_prefix,
  theme_default, asset_path }` and the Vite manifest entry.
- **No domain logic in the admin backend.** All data crosses the wire to the core API. The
  architecture test asserts `src/` never imports any `Padosoft\AiGuardrails\*` class.

### 2.3 Admin frontend

- **React 19 + Vite (latest) + Tailwind v4** (CSS-first `@theme` in `resources/css/panel.css`,
  no `tailwind.config.js`; `@tailwindcss/vite` plugin), **TanStack Query v5**, **React Router
  v7**, **Axios**.
- Axios client: `baseURL = runtimeConfig.api_base`, `withCredentials`, XSRF header; a response
  interceptor unwraps the `{schema_version, schema, data}` envelope and normalizes errors.
- Dual Vite build: SPA (`vite.config.ts` → `public/vendor/ai-guardrails-admin/`, manifest on)
  + library ESM (`vite.lib.config.ts` → `dist/`) for embedded mount in host SPAs.
- Layout: 248px sidebar (brand + grouped nav) + topbar (breadcrumb, demo-state segmented
  control, theme toggle). Dark-first; light theme via `data-theme`.

### 2.4 Design language (from prototype)

- Accent **cyan**: `#38bdf8` (dark) / `#0284c7` (light). Semantic: allow `#34d399`,
  block `#f87171`, warn `#fbbf24`, pending `#a78bfa`, observe `#22d3ee`.
- Dark bg `#0b0f17`, surface `#111827`/`#161e2e`, border `#1f2937`/`#334155`, text
  `#e5e9f0`/`#9aa6b8`.
- Fonts: Inter (UI) + JetBrains Mono (data/code). Base 14px / line-height 1.5. Radii 10/7/999px.

## 3. Phase 0 — core v1.1.0 API contract (additive)

All changes are backward-compatible: new fields/buckets/endpoints only; existing shapes
unchanged; new toggles default-safe; each tested in both states; mutation gate maintained.

| Endpoint / surface | Additive change | Implementation note |
|---|---|---|
| `GET /overview` | add `controls[].posture` (string), `controls[].spark[]` (12 hourly counts), `totals.observed_24h`, `totals.pending_approvals` | spark = hourly bucket counts over trailing window |
| `GET /audit/trend` | add `observed` bucket per point | derived: `observed = (rule_id != null AND blocked = false)`; no migration |
| `GET /output/stats` | add `counts.pii.by_detector{ email, phone, iban, ... }` | **needs** a `detector` column on the append-only output-stats store + recording path → additive migration + new `OutputStatKind`/detector dimension |
| `GET /approvals` | add `tool`, `arguments` (scoped JSON), `requested_ago`, `expires_in` per item | **risk:** depends on what `laravel-flow` persists. If args aren't stored, persist them in the guardrails HITL bridge (`src/Hitl`) when routing the destructive call, and join on read |
| `config('ai-guardrails.settings.overridable')` | widen allow-list (see §3.1) | each new key gets type/enum/regex validation in the settings store; infra keys stay non-overridable |

### 3.1 Widened overridable allow-list

Add (with validation): `tool_firewall.owner_keys` (string[]), `input_screen.patterns`
(map rule_id→regex, validated `/u` + compiles), `hitl.destructive_tools` (string[]),
`normalization.nfkc|strip_zero_width|casefold|decode_base64_blobs|fold_confusables` (bool),
`normalization.max_prompt_length` (int>0), `audit_hygiene.prompt_storage`
(enum redact|hash|truncate|raw), `retention.days` (int≥0), `retention.strategy`
(enum anonymize|purge|keep).

**Stay read-only** (rendered, disabled in UI): `audit.store`, `audit.table`,
`firewall_log.store`, `output_stats.store`, `settings.store` — infra/driver keys that must
not be runtime-mutable.

### 3.2 Phase-0 risk spikes (resolved before building dependent screens)

- **Approvals tool+args persistence** — investigate `laravel-flow` approval payload first.
  If insufficient, add bridge-side persistence. If it proves too invasive for a minor release,
  flag to the user and degrade only the Approvals args panel.
- **PII by-detector** — append-only store migration is the heaviest change; if the pii-redactor
  doesn't expose per-detector counts, surface what it does and degrade only that card.

## 4. Screens (route → API binding)

| Route | Screen | Binds to |
|---|---|---|
| `/` | Dashboard — 4 control cards (mode/posture/spark), throughput area chart, 24h totals | `GET /overview`, `GET /audit/trend` |
| `/audit` | Injection Audit — filter bar (verdict/rule/principal/q), keyset-paginated table, detail drawer (matched span highlight, hygiene-aware prompt) | `GET /audit`, `GET /audit/{id}` |
| `/firewall` | Tool Firewall — posture panel (enabled, owner-key chips, reject-unknown), authorization read-out, rejections table + drawer, sticky save | `GET /firewall`, `GET/PUT /settings` |
| `/output` | Output Handler — 4 stat cards, PII by-detector, config toggles + html_mode, sticky save | `GET /output/stats`, `GET/PUT /settings` |
| `/approvals` | Approvals/HITL — availability banner, queue table (tool, args preview, expires), inline approve/reject, detail + confirm drawers | `GET /approvals`, `POST /approvals/{token}/approve\|reject` |
| `/settings` | Settings — full config surface; non-overridable fields read-only/disabled; PUT only the allow-list; sticky save | `GET/PUT /settings` |
| `/settings/audit` | Change History — actor / key / old→new diff / when; load-more | `GET /settings/changes` |
| `/try` | Try/Sandbox — screen a prompt (normalization diff, verdict) + sanitize output (before/after) | `POST /try/screen`, `POST /try/sanitize` |

**Demo-state control** (topbar Data/Loading/Empty/Error): backed by real TanStack Query
states (loading/error/empty) plus a demo override for screenshots/QA.

**Drawers** (prototype screens 10–11) are the detail panes of Audit and Approvals — not
separate routes.

## 5. Testing strategy (tri-level, house rule)

- **PHPUnit + Orchestra Testbench**, matrix PHP 8.3/8.4/8.5 × Laravel 11/12/13: panel mounts
  at configured prefix; deep-link catch-all; runtime-config normalization (blank/wrapped
  slashes, invalid theme); middleware applied; architecture test (no core PHP import); config
  defaults. Both-states where a toggle changes behaviour.
- **Vitest + MSW + Testing Library**: API client (envelope unwrap, error normalize, CSRF),
  query hooks, and each page component against mocked envelope responses (data/empty/error).
- **Playwright**: an E2E scenario for **every screen and every interaction** — nav, audit
  filters + drawer, firewall save, output config, approve/reject + confirm, settings sticky
  save (overridable vs read-only), change-history load-more, theme toggle, try sandbox —
  mocking the core API via `page.route()`. (Family rule: Playwright for every UI interaction.)
- **CI**: three jobs (php matrix; frontend typecheck+build+vitest; playwright) mirroring the
  sibling workflow.

## 6. Configuration (`config/ai-guardrails-admin.php`)

`mount_prefix` (env `AI_GUARDRAILS_ADMIN_PREFIX`, default `admin/ai-guardrails`),
`middleware` (CSV env `AI_GUARDRAILS_ADMIN_MIDDLEWARE`, default `web,auth`, never empty),
`api_base` (env `AI_GUARDRAILS_ADMIN_API_BASE`, default `/ai-guardrails/api`),
`theme_default` (env `AI_GUARDRAILS_ADMIN_THEME`, default `dark`),
`asset_path` (env `AI_GUARDRAILS_ADMIN_ASSET_PATH`, default `vendor/ai-guardrails-admin`).

**Security posture:** the admin is **not** an auth provider — the host protects the mount via
middleware. It is a thin renderer + API client; all enforcement and accountability live in the
core (server-derived actors, append-only audit, token log-scrubbing remain the core/host's
responsibility).

## 7. Composer / namespace

`padosoft/laravel-ai-guardrails-admin`, PSR-4 `Padosoft\LaravelAiGuardrailsAdmin\` → `src/`,
provider `Padosoft\LaravelAiGuardrailsAdmin\LaravelAiGuardrailsAdminServiceProvider`,
`require` illuminate contracts/routing/support/view `^11|^12|^13`, php `^8.3`;
`suggest` the core package as the API provider; require-dev pint/testbench/phpstan/phpunit.

## 8. Implementation phases (each phase = one PR into the macro branch)

0. **Core v1.1.0** API extension on the core repo → tag `v1.1.0`. (risk spikes first)
1. **Scaffold**: composer, provider, route, blade shell, config, Vite + Tailwind v4, CI, docs
   skeleton + PHPUnit mount/config tests.
2. **App shell**: sidebar/topbar/router/theme/API client/query layer + Vitest + a smoke
   Playwright.
3. **Dashboard** · 4. **Injection Audit** · 5. **Tool Firewall** · 6. **Output Handler** ·
   7. **Approvals** · 8. **Settings** · 9. **Change History** · 10. **Try/Sandbox** — one
   screen per PR, each with Vitest + Playwright.
11. **README + internal docs**, asset build, release admin `v1.0.0`.

## 9. Open risks / non-goals

- **Risks:** approvals tool+args persistence; PII by-detector store migration (§3.2). Both have
  a documented degrade-only fallback if they exceed a minor-release budget.
- **Non-goals:** no admin-side auth/RBAC (host's job); no docmd site for the admin; no
  duplication of core domain logic; MCP is a core surface, not re-exposed by the admin.
