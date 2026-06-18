# laravel-ai-guardrails-admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `padosoft/laravel-ai-guardrails-admin` web control plane — a React SPA mounted into a host Laravel app that surfaces the core guardrails controls via its HTTP API — pixel-faithful to the approved prototype, with tri-level tests.

**Architecture:** Thin Laravel package (service provider + catch-all route + Blade shell injecting runtime config) hosting a React SPA. The SPA is a pure HTTP consumer of the core's `ai-guardrails.api.v1` envelope — no PHP coupling to the core (architecture-test enforced). Dual Vite build: SPA bundle published to `public/vendor/ai-guardrails-admin/` + ESM library to `dist/` for embedded mounts.

**Tech Stack:** PHP ^8.3, Laravel 11/12/13, Testbench, PHPStan, Pint. React 19 + Vite (latest) + Tailwind v4 (`@tailwindcss/vite`, CSS-first `@theme`) + TanStack Query v5 + React Router v7 + Axios + TypeScript. Vitest + MSW + Testing Library; Playwright.

## Global Constraints

- Depends on core `padosoft/laravel-ai-guardrails` `^1.1` (Phase 0 must be tagged first) — declared in `suggest`, not `require` (HTTP-only).
- Namespace `Padosoft\LaravelAiGuardrailsAdmin\`; provider `LaravelAiGuardrailsAdminServiceProvider`; config file `config/ai-guardrails-admin.php`; view namespace + asset path + route name prefix `ai-guardrails-admin`.
- Mount middleware NEVER resolves empty (fallback `['web']`). The admin is not an auth provider — the host gates the mount.
- Design language (from prototype): accent cyan `#38bdf8` (dark)/`#0284c7` (light); semantic allow `#34d399`, block `#f87171`, warn `#fbbf24`, pending `#a78bfa`, observe `#22d3ee`; dark bg `#0b0f17`, surface `#111827`/`#161e2e`; Inter + JetBrains Mono; radii 10/7/999px; sidebar 248px + topbar.
- Envelope contract: every API response is `{schema_version, schema, data}`; the Axios interceptor unwraps `.data` and normalizes errors.
- One screen = one PR into macro branch `feature/admin-panel`. Every UI interaction has a Playwright scenario (family rule). All three suites (PHPUnit, Vitest, Playwright) green in CI before merge.
- No docmd site (README + internal `docs/` only).
- `data-testid` convention: `agr-<area>` (e.g. `agr-shell`, `agr-nav-audit`, `agr-dashboard`, `agr-audit-row`, `agr-drawer`, `agr-save-bar`). Pages expose `data-state="loading|error|empty|ready"` on their root for E2E assertions.

## File structure (locked decomposition)

```
src/LaravelAiGuardrailsAdminServiceProvider.php   # register/boot: config, views, routes, publishes
src/Http/Controllers/PanelController.php          # renders blade shell + runtime config
config/ai-guardrails-admin.php                    # mount_prefix, middleware, api_base, theme_default, asset_path
routes/web.php                                    # catch-all /{any?} under prefix+middleware
resources/views/panel.blade.php                   # shell: #agr-root + window.__AI_GUARDRAILS_ADMIN__ + vite manifest
resources/css/panel.css                           # @import "tailwindcss"; @theme tokens (design language)
resources/js/main.tsx                             # SPA entry: mount React to #agr-root
resources/js/index.ts                             # library entry (embedded mount export)
resources/js/config.ts                            # runtimeConfig() from window.__AI_GUARDRAILS_ADMIN__
resources/js/App.tsx                              # QueryClientProvider + RouterProvider + ThemeProvider
resources/js/lib/api/client.ts                    # axios factory + envelope interceptor + CSRF
resources/js/lib/api/types.ts                     # TS types for every endpoint's data shape
resources/js/lib/api/endpoints.ts                 # typed request fns per endpoint
resources/js/lib/queries.ts                       # TanStack Query hooks
resources/js/lib/demoState.tsx                    # Data/Loading/Empty/Error override context (topbar control)
resources/js/components/{Badge,StatCard,DataTable,Drawer,Toggle,Chips,SaveBar,Sparkline,AreaChart,ScreenState}.tsx
resources/js/shell/Shell.tsx                      # sidebar + topbar + <Outlet/>
resources/js/pages/{Dashboard,Audit,Firewall,Output,Approvals,Settings,ChangeHistory,Try}Page.tsx
tests/ (PHPUnit: TestCase, Feature/*, Architecture/*, Unit/*)
tests/js/ (Vitest: support/{server,render,fixtures}, lib/*, pages/*)
tests/e2e/ (Playwright: *.spec.ts, fixtures.ts)
vite.config.ts, vite.lib.config.ts, tsconfig*.json, playwright.config.ts, package.json, pint.json, phpstan.neon, phpunit.xml
.github/workflows/ci.yml
```

---

### Task 1: Backend scaffold + mount (PHPUnit-driven)

**Files:**
- Create: `composer.json`, `src/LaravelAiGuardrailsAdminServiceProvider.php`, `src/Http/Controllers/PanelController.php`, `config/ai-guardrails-admin.php`, `routes/web.php`, `resources/views/panel.blade.php`, `phpunit.xml`, `pint.json`, `phpstan.neon`, `tests/TestCase.php`, `tests/Feature/PanelMountTest.php`, `tests/Unit/ConfigDefaultsTest.php`, `tests/Architecture/StandaloneTest.php`.

**Interfaces:**
- Produces: route name `ai-guardrails-admin.panel`; view `ai-guardrails-admin::panel`; runtime config object `window.__AI_GUARDRAILS_ADMIN__ = {api_base, mount_prefix, theme_default, asset_path}`; config keys per Global Constraints.

- [ ] **Step 1: composer.json** — name `padosoft/laravel-ai-guardrails-admin`, PSR-4 `Padosoft\LaravelAiGuardrailsAdmin\` → `src/` + Tests autoload-dev, `require` illuminate contracts/routing/support/view `^11|^12|^13` + php `^8.3`, `suggest` core `^1.1`, require-dev pint/testbench/phpstan/phpunit, `extra.laravel.providers`, scripts.
- [ ] **Step 2: Failing PHPUnit** `tests/Feature/PanelMountTest.php`:

```php
public function test_panel_mounts_at_default_prefix(): void
{
    $this->get('/admin/ai-guardrails')
        ->assertOk()
        ->assertSee('agr-root')
        ->assertSee('window.__AI_GUARDRAILS_ADMIN__', false);
}

public function test_catch_all_serves_deep_links(): void
{
    $this->get('/admin/ai-guardrails/audit')->assertOk()->assertSee('agr-root');
}

public function test_runtime_config_normalizes_blank_and_wrapped_values(): void
{
    config()->set('ai-guardrails-admin.api_base', ' /custom/api/ ');
    config()->set('ai-guardrails-admin.theme_default', 'invalid');
    $html = (string) $this->get('/admin/ai-guardrails')->getContent();
    $this->assertStringContainsString('"api_base":"/custom/api"', $html);   // trimmed, no trailing slash
    $this->assertStringContainsString('"theme_default":"dark"', $html);     // invalid → default
}
```

- [ ] **Step 3: Run → FAIL** (`composer install` first via `composer.bat`; run `php85.bat vendor/bin/phpunit`).
- [ ] **Step 4: Implement** provider (mergeConfig, loadViews, loadRoutes, console publishes), `config/ai-guardrails-admin.php` (per Global Constraints, middleware CSV parse never-empty), `routes/web.php` (catch-all), `PanelController` (normalize runtime config: trim, strip wrapping slashes on api_base/mount_prefix, theme∈{dark,light} else default), `panel.blade.php` (`<div id="agr-root">` + `<script>window.__AI_GUARDRAILS_ADMIN__ = @json($runtimeConfig)</script>` + Vite manifest/dev fallback).
- [ ] **Step 5: Run → PASS.**
- [ ] **Step 6: Architecture test** `StandaloneTest` — asserts no file under `src/` references `Padosoft\AiGuardrails\` (no core PHP coupling). Run → PASS.
- [ ] **Step 7: ConfigDefaults unit test** — middleware fallback `['web']` when env blank; defaults match Global Constraints. Run → PASS.
- [ ] **Step 8: Pint + PHPStan** green.
- [ ] **Step 9: Commit.** `git commit -m "feat: backend scaffold — provider, catch-all mount, runtime config, PHPUnit"`

---

### Task 2: Frontend toolchain + app shell (Vitest-driven)

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.lib.json`, `vite.config.ts`, `vite.lib.config.ts`, `resources/css/panel.css`, `resources/js/{main.tsx,index.ts,config.ts,App.tsx}`, `resources/js/lib/api/{client.ts,types.ts,endpoints.ts}`, `resources/js/lib/queries.ts`, `resources/js/lib/demoState.tsx`, `resources/js/shell/Shell.tsx`, `resources/js/components/ScreenState.tsx`, `tests/js/support/{server.ts,render.tsx,fixtures.ts}`, `tests/js/lib/api/client.test.ts`, `tests/js/App.test.tsx`.

**Interfaces:**
- Produces: `createApiClient(config)` (axios, unwraps envelope `.data`, throws normalized `ApiError`); `runtimeConfig()`; query hooks `useOverview/useAuditList/useAuditDetail/useAuditTrend/useFirewall/useOutputStats/useApprovals/useSettings/useSettingsChanges` + mutations `useApprove/useReject/useUpdateSettings/useTryScreen/useTrySanitize`; `<Shell>` with sidebar nav (8 routes) + topbar (breadcrumb, demo-state segmented control, theme toggle); `<ScreenState state=...>` wrapper exposing `data-state`.
- Consumes: Task 1's runtime config object + envelope contract.

- [ ] **Step 1: Toolchain** — `package.json` (React 19, react-dom 19, @tanstack/react-query 5, react-router-dom 7, axios, clsx, tailwind-merge, lucide-react; dev: vite, @vitejs/plugin-react, typescript, tailwindcss v4 + @tailwindcss/vite, vitest, jsdom, msw, @testing-library/{react,jest-dom,user-event}, @playwright/test, @types/*). Scripts: `build` (dual vite + tsc lib), `test` (vitest run), `test:e2e`, `typecheck`. `vite.config.ts` base `/vendor/ai-guardrails-admin/`, outDir `public/vendor/ai-guardrails-admin`, manifest on, input `resources/js/main.tsx`, plugins `[react(), tailwindcss()]`. `vite.lib.config.ts` lib ESM from `resources/js/index.ts`, externalize react/react-dom/router/query/axios.
- [ ] **Step 2: Failing Vitest** `tests/js/lib/api/client.test.ts`:

```ts
it('unwraps the envelope data', async () => {
  server.use(http.get('*/overview', () => HttpResponse.json({
    schema_version: 'ai-guardrails.api.v1', schema: 'x', data: { ok: true },
  })));
  const client = createApiClient({ api_base: '/ai-guardrails/api' });
  await expect(client.get('/overview')).resolves.toEqual({ ok: true });
});

it('normalizes an error envelope into ApiError', async () => {
  server.use(http.get('*/overview', () => HttpResponse.json({ message: 'nope' }, { status: 422 })));
  const client = createApiClient({ api_base: '/ai-guardrails/api' });
  await expect(client.get('/overview')).rejects.toMatchObject({ status: 422 });
});
```

- [ ] **Step 3: Run → FAIL.** `npm i && npx vitest run tests/js/lib/api/client.test.ts`
- [ ] **Step 4: Implement** `client.ts` (axios instance, response interceptor returns `res.data.data`, error interceptor → `ApiError{status,message,errors}`, XSRF-TOKEN header + withCredentials), `config.ts`, `types.ts` (all endpoint data shapes incl. the v1.1.0 additions), `endpoints.ts`, `queries.ts`, `demoState.tsx`, `App.tsx`, `main.tsx`, `index.ts`, `ScreenState.tsx`, `Shell.tsx` (sidebar groups Overview/Controls/Configure + topbar). `panel.css`: `@import "tailwindcss"; @theme { --color-accent: #38bdf8; ... }`.
- [ ] **Step 5: Run → PASS.**
- [ ] **Step 6: App test** `App.test.tsx` — renders Shell, sidebar has 8 nav links, theme toggle flips `data-theme`. Run → PASS.
- [ ] **Step 7: typecheck + build** — `npm run typecheck && npm run build` green; assets land in `public/vendor/ai-guardrails-admin`.
- [ ] **Step 8: Smoke Playwright** `tests/e2e/smoke.spec.ts` + `playwright.config.ts` + `scripts/serve-e2e.mjs` (static-serve the built shell, mock core API): shell mounts, nav to `/audit` works. Run `npm run test:e2e` → PASS.
- [ ] **Step 9: CI** `.github/workflows/ci.yml` — three jobs (php matrix 8.3/8.4/8.5 × Laravel 11/12/13; frontend typecheck+build+vitest; playwright). 
- [ ] **Step 10: Commit.** `git commit -m "feat: frontend toolchain, API client, query layer, app shell + Vitest/Playwright smoke"`

---

### Tasks 3–10: One screen per task (shared TDD recipe)

**Shared recipe (apply to each screen below):**
1. **Vitest page test (FAIL):** mock the screen's endpoint(s) via MSW with a `data` fixture; render `<XPage>` via the custom `render()`; assert key cells/labels render and `data-state="ready"`. Add empty + error variants asserting `data-state`.
2. Run → FAIL.
3. **Implement** `pages/XPage.tsx` using the query hook(s) + shared components (`DataTable`, `Badge`, `StatCard`, `Drawer`, `SaveBar`, `Toggle`, `Chips`, `Sparkline`, `AreaChart`), wrapped in `<ScreenState>`; wire into the router in `App.tsx`. Pixel-match the prototype screen.
4. Run → PASS (data/empty/error).
5. **Playwright scenario(s)** for every interaction on the screen (mock core API via `page.route()`); run → PASS.
6. typecheck + build green.
7. **Commit**, push, open PR into `feature/admin-panel`, Copilot review loop green, merge.

Each task below specifies only its screen-specific bindings, components, interactions, and assertions.

---

### Task 3: Dashboard (`/`)

**Files:** Create `resources/js/pages/DashboardPage.tsx`, `resources/js/components/{Sparkline,AreaChart,StatCard}.tsx`; `tests/js/pages/dashboard.test.tsx`; `tests/e2e/dashboard.spec.ts`.

**Binds:** `useOverview()` (`/overview`), `useAuditTrend()` (`/audit/trend`).
**Renders:** 4 control cards (letter A–D, name, mode badge ENFORCE/MONITOR/OFF, `posture`, `spark` sparkline), 7-day stacked area chart (allowed/observed/blocked from trend), 4 totals stat cards (attempts_24h, observed_24h, blocked_24h, pending_approvals). Time-range affordance (24h/7d/30d) re-queries trend `from/to`.
**Vitest asserts:** 4 cards with mode badges; totals values from fixture; area chart svg has 3 series; `data-state` ready/empty/error.
**Playwright:** loads → cards visible, `agr-dashboard` `data-state=ready`; switch range → trend refetch; demo-state Empty/Error toggles → `data-state` changes.

---

### Task 4: Injection Audit (`/audit`)

**Files:** `pages/AuditPage.tsx`, `components/{DataTable,Drawer}.tsx`; `tests/js/pages/audit.test.tsx`; `tests/e2e/audit.spec.ts`.

**Binds:** `useAuditList(filters)` (`/audit`, keyset `cursor`/`limit`), `useAuditDetail(id)` (`/audit/{id}`).
**Renders:** filter bar (q, verdict blocked/observed/allowed/too_long, rule_id, principal_id), result-count badge, table (verdict badge, rule mono, principal mono, prompt excerpt, relative time), "Load more" (next_cursor). Row click → drawer with KV (verdict/mode/rule/ruleset/principal/storage/recorded), prompt with matched-span highlight (hygiene-aware: hash/redact/truncate show a label not raw), contextual banner per verdict.
**Vitest asserts:** rows render from fixture; filter change re-queries; load-more appends; drawer opens with matched span highlighted; hygiene label shown when `prompt_storage != raw`.
**Playwright:** filter by verdict; open row drawer; close; load-more.

---

### Task 5: Tool Firewall (`/firewall`)

**Files:** `pages/FirewallPage.tsx`, `components/{Chips,Toggle,SaveBar}.tsx`; tests as recipe.

**Binds:** `useFirewall()` (`/firewall` rejections), `useSettings()`+`useUpdateSettings()` (posture: `tool_firewall.enabled`, `tool_firewall.owner_keys`, `tool_firewall.reject_unknown_arguments`; read-only `tool_authorization.*`).
**Renders:** posture panel (enabled toggle, owner-key chips editable, reject-unknown toggle), authorization read-out (KV, read-only), rejections table (tool, reason badge authorization/schema, violations text, principal, when) + drawer, sticky SaveBar on dirty.
**Vitest:** rejections render; editing a chip / toggle marks dirty → SaveBar appears; Save calls `PUT /settings` with only the firewall allow-list keys; Discard reverts.
**Playwright:** add owner-key chip → Save → toast/clears; open rejection drawer.

---

### Task 6: Output Handler (`/output`)

**Files:** `pages/OutputPage.tsx`; tests as recipe.

**Binds:** `useOutputStats()` (`/output/stats` incl. `counts.pii.by_detector`), `useSettings()`+`useUpdateSettings()` (`output_handler.*`).
**Renders:** 4 stat cards (html_stripped, markdown_sanitized, structured_validation_failure, pii_redaction), PII-by-detector list (email/phone/iban; empty-state if `{}`), config toggles (sanitize_html, neutralize_markdown, redact_pii) + html_mode select (escape/allowlist), sticky SaveBar.
**Vitest:** counts render; by_detector empty-state when `{}`; toggles dirty→Save PUTs `output_handler.*`.
**Playwright:** flip html_mode → Save; toggle redact_pii.

---

### Task 7: Approvals (`/approvals`)

**Files:** `pages/ApprovalsPage.tsx`; tests as recipe.

**Binds:** `useApprovals()` (`/approvals` incl. `tool`,`arguments`,`requested_ago`,`expires_in`), `useApprove(token)`, `useReject(token)`.
**Renders:** availability banner (flow_available/fallback), queue table (tool mono, arguments JSON preview, requested_ago, expires_in, inline approve/reject), row→detail drawer (KV tool/token/run_id/requested/expires + scoped arguments code block + destructive warning), confirm drawer (approve→"resume & run", reject→"halt"), empty-state "queue is clear".
**Vitest:** items render with tool+args; approve calls `POST /approvals/{token}/approve` then refetches/removes row; 409 (hitl unavailable) shows banner; 422 (expired) shows error.
**Playwright:** approve flow (open → confirm → row gone); reject flow; empty-state.

---

### Task 8: Settings (`/settings`)

**Files:** `pages/SettingsPage.tsx`; tests as recipe.

**Binds:** `useSettings()` + `useUpdateSettings()`.
**Renders:** full settings surface grouped (Master; Control A owner_keys+reject_unknown+mode; Control B refusal_message+patterns; Control C toggles+html_mode; Control D destructive_tools+fallback; Normalization sub-toggles+max_prompt_length; Pattern safety on_match_error + ruleset_version read-only; Tool authorization; Audit hygiene+retention; Store driver READ-ONLY/disabled). Overridable fields editable; non-overridable rendered disabled with "set via config" tooltip. Regex pattern inputs show invalid state. Sticky SaveBar PUTs only changed overridable keys.
**Vitest:** non-overridable inputs are `disabled`; editing an overridable field → dirty; invalid regex → field error + Save disabled; Save sends only changed allow-listed keys; 422 maps field errors.
**Playwright:** edit refusal_message + a mode → Save; attempt invalid regex → blocked.

---

### Task 9: Change History (`/settings/audit`)

**Files:** `pages/ChangeHistoryPage.tsx`; tests as recipe.

**Binds:** `useSettingsChanges(limit)` (`/settings/changes`).
**Renders:** table (actor user/system icon + id, key mono, old→new diff chips red→green, relative when), load-more, empty-state "No configuration changes recorded". Rows not clickable. "Back to Settings" action.
**Vitest:** diff chips render old/new; load-more; empty-state.
**Playwright:** load-more; back-to-settings nav.

---

### Task 10: Try / Sandbox (`/try`)

**Files:** `pages/TryPage.tsx`; tests as recipe.

**Binds:** `useTryScreen()` (`POST /try/screen`), `useTrySanitize()` (`POST /try/sanitize`).
**Renders:** left panel screen-a-prompt (textarea, Screen button, verdict badge + rule_id, refusal/allowed banner); right panel sanitize-output (textarea, Sanitize button, before/after code blocks, "PII redactions: N" when present). No persistence.
**Vitest:** screen blocked → shows rule + refusal; screen allowed → "no pattern matched"; sanitize → before/after rendered.
**Playwright:** type prompt → Screen → verdict; type text → Sanitize → after block.

---

### Task 11: Docs, assets, release v1.0.0

**Files:** `README.md`, `docs/{PROGRESS,LESSON}.md`, `CHANGELOG.md`, built `public/vendor/ai-guardrails-admin/*`, `resources/screenshots/*` referenced in README.

- [ ] **Step 1: README** — why-it-exists, stack, quick start (`composer require padosoft/laravel-ai-guardrails-admin`, publish assets `--tag=ai-guardrails-admin-assets`, `.env` keys, visit `/admin/ai-guardrails`), config table, core API contract (`^1.1`), embedded mount (ESM), testing, security (host gates middleware), screenshots.
- [ ] **Step 2:** `docs/PROGRESS.md` + `docs/LESSON.md` capturing decisions; `CHANGELOG.md` `v1.0.0`.
- [ ] **Step 3: Final build** — `npm run build`; commit the compiled `public/vendor/ai-guardrails-admin` assets (distribution includes prebuilt output, per house pattern).
- [ ] **Step 4: Full green** — `php85.bat vendor/bin/phpunit`, `npm run test`, `npm run test:e2e`, Pint, PHPStan all green.
- [ ] **Step 5: Macro PR** `feature/admin-panel` → `main`, Copilot loop green, merge.
- [ ] **Step 6: Tag** `v1.0.0` at closure SHA; GitHub Release; register on Packagist if not yet.

## Self-review (coverage)

- Spec §2.2 backend → Task 1. §2.3 frontend toolchain/shell → Task 2. §2.4 design tokens → Task 2 (`panel.css`). §4 the 8 screens → Tasks 3–10 (each with its API binding, components, interactions). §5 tri-level tests → embedded in every task (PHPUnit Task 1; Vitest+Playwright Tasks 2–10; CI Task 2). §6 config → Task 1. §7 composer/namespace → Task 1. §8 phases → Tasks map 1:1. Demo-state control → Task 2 (`demoState.tsx`) exercised per screen. No placeholders; shared recipe defines the repeating TDD cycle once, each screen task pins its unique bindings/assertions.
```
