# laravel-ai-guardrails-admin

[![Latest Version on Packagist](https://img.shields.io/packagist/v/padosoft/laravel-ai-guardrails-admin.svg)](https://packagist.org/packages/padosoft/laravel-ai-guardrails-admin)
[![PHP](https://img.shields.io/badge/PHP-8.3%2B-777bb4.svg?logo=php&logoColor=white)](https://www.php.net/)
[![Laravel](https://img.shields.io/badge/Laravel-11%20%7C%2012%20%7C%2013-ff2d20.svg?logo=laravel&logoColor=white)](https://laravel.com/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react&logoColor=white)](https://react.dev/)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

> The web control plane for [`padosoft/laravel-ai-guardrails`](https://github.com/padosoft/laravel-ai-guardrails): inspect injection attempts, manage tool firewall posture, tune output handling, work the HITL approval queue, and edit runtime settings — a polished React admin panel that drops into any Laravel app.

![Dashboard dark](resources/screenshots/laravel-ai-guardrails-admin-Dashboard-Dark.png)

## Table Of Contents

- [Why It Exists](#why-it-exists)
- [The Value It Adds](#the-value-it-adds)
- [Features](#features)
- [Screenshots](#screenshots)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Routes And Assets](#routes-and-assets)
- [Core API Contract](#core-api-contract)
- [Security And Honest Design Notes](#security-and-honest-design-notes)
- [Embedded Mount](#embedded-mount)
- [Testing](#testing)
- [Part Of The Padosoft AI Suite](#part-of-the-padosoft-ai-suite)
- [Security](#security)
- [Contributing](#contributing)
- [Changelog](#changelog)
- [License](#license)

## Why It Exists

The core package, `padosoft/laravel-ai-guardrails`, provides deterministic, offline-first prompt-injection guardrails for `laravel/ai`. It is fast, headless, and speaks PHP, Artisan, HTTP, and (as a follow-up) MCP — but it has no face.

This package **is that face**. It is the human-facing admin panel over the core's `ai-guardrails.api.v1` HTTP API, and it deliberately does **not** duplicate any core business logic: every audit entry, approval request, stat, and setting is read live from the configured API base.

```
Laravel host
  ├─ padosoft/laravel-ai-guardrails              # core engine — HTTP API
  └─ padosoft/laravel-ai-guardrails-admin        # this React admin panel (HTTP only)
```

When a teammate asks _"why was this prompt blocked?"_, _"which tools are scoped to which owner keys?"_, _"is the output sanitizer in enforce or monitor mode?"_, or _"who approved this destructive tool call and when?"_ — this is where you point them. No SSH, no `tinker`, no log grepping.

## The Value It Adds

You _could_ hit the core API with `curl` and read raw JSON. This package exists because operators and security engineers should not have to.

- **See the audit, not the JSON.** Injection attempts with rule matches, hygiene-aware prompt excerpts, byte-accurate matched-span highlighting, and verdict badges are laid out as a readable case file.
- **Approve or reject destructive calls in context.** The HITL queue shows tool name, scoped arguments, run ID, and age. The security-correct token-paste flow keeps approval authority with the notified human, not with the panel session.
- **Trust the config you ship.** All four control surfaces (Tool Firewall, Input Screen, Output Handler, HITL) are rendered from live API data — "what the docs say" and "what production runs" cannot silently drift.
- **Edit runtime settings safely.** Only the 31 runtime-overridable keys can be edited; infra keys are rendered read-only. Every change is append-only audited with the actor.
- **Zero business logic to keep in sync.** The panel is a pure consumer of the core HTTP contract. Upgrade the engine and the panel reflects it.
- **Drops in, stays out of the way.** One catch-all route, prebuilt Vite assets, your own auth middleware. It is not an auth provider and it owns no data.
- **Honest when the engine is down.** If the core API is unreachable, every screen renders an explicit unavailable/error state instead of a blank page — verified by Playwright against the real production bundle.
- **Embeddable.** Ships an ES module entry so a host SPA can cross-mount the panel inside its own navigation chrome.

## Features

- **Dashboard** — control-card matrix with mode badges, 3-band throughput chart (blocked / observed / clean), 24h totals, and configurable time range.
- **Injection Audit** — paginated, filterable audit log with hygiene-aware prompt excerpts and byte-accurate matched-span highlighting.
- **Tool Firewall** — live posture (owner keys, reject-unknown-arguments toggle) with editable config and a rejections detail drawer.
- **Output Handler** — sanitization stats, PII by-detector breakdown, and mode-aware config editing with monitor-mode banner.
- **Approvals** — HITL queue with tool/scoped-args/run-id detail drawer and security-correct token-paste approve/reject.
- **Settings** — full runtime config surface with 31 editable keys, read-only infra fields, regex validation, and Change History link.
- **Change History** — append-only audit of every settings mutation with actor, old→new diff chips, and load-more.
- **Try · Sandbox** — paste a prompt to preview screening verdict plus illustrative normalization diff; paste output to preview sanitization result.
- Light and dark themes, per-user toggle, server-controlled default.
- Demo-state control (data / loading / empty / error) for operator onboarding and testing.
- Production-bundle E2E — Playwright drives the real built assets; only the external core HTTP API is mocked.

## Screenshots

| | |
|---|---|
| **Dashboard (dark)** | **Dashboard (light)** |
| ![Dashboard dark](resources/screenshots/laravel-ai-guardrails-admin-Dashboard-Dark.png) | ![Dashboard light](resources/screenshots/laravel-ai-guardrails-admin-Dashboard.png) |
| **Injection Audit Log** | **Attempt detail (blocked)** |
| ![Injection Audit](resources/screenshots/laravel-ai-guardrails-admin-Inspection-Audit-log.png) | ![Attempt blocked](resources/screenshots/laravel-ai-guardrails-admin-Attemp-blocked.png) |
| **Tool Firewall** | **Output Handler** |
| ![Tool Firewall](resources/screenshots/laravel-ai-guardrails-admin-Tool-firewall.png) | ![Output Handler](resources/screenshots/laravel-ai-guardrails-admin-Output-handler.png) |
| **Approvals / HITL** | **Approval detail** |
| ![Approvals](resources/screenshots/laravel-ai-guardrails-admin-Approvals.png) | ![Approval detail](resources/screenshots/laravel-ai-guardrails-admin-Approvals-details.png) |
| **Settings** | **Change History** |
| ![Settings](resources/screenshots/laravel-ai-guardrails-admin-settings.png) | ![Change History](resources/screenshots/laravel-ai-guardrails-admin-change-history.png) |
| **Try · Sandbox** | |
| ![Try Sandbox](resources/screenshots/laravel-ai-guardrails-admin-Try-Sandbox.png) | |

## Quick Start

> New to the package? Follow these steps top to bottom — they assume nothing.

**1. Install the core engine and this panel.** The panel talks to the core over HTTP, so the core comes first.

```bash
composer require padosoft/laravel-ai-guardrails
composer require padosoft/laravel-ai-guardrails-admin
```

> **Heads up:** the core HTTP API is **default-OFF**. Enable it in `config/ai-guardrails.php` (`api.enabled = true`) before installing this panel.

**2. Publish the prebuilt assets.**

```bash
php artisan vendor:publish --tag=ai-guardrails-admin-assets
```

You may also publish the config if you want to tune it:

```bash
php artisan vendor:publish --tag=ai-guardrails-admin-config
```

**3. Point the panel at your auth middleware and the core API base.** Add these to your host app's `.env`:

```dotenv
# Where the panel mounts (you visit this URL)
AI_GUARDRAILS_ADMIN_PREFIX=admin/ai-guardrails

# Your host's auth — the panel is NOT an auth provider, protect it yourself
AI_GUARDRAILS_ADMIN_MIDDLEWARE=web,auth

# Where the core engine's HTTP API lives
AI_GUARDRAILS_ADMIN_API_BASE=/ai-guardrails/api

# Default theme: dark | light
AI_GUARDRAILS_ADMIN_THEME=dark

# Override published asset path if needed (rarely)
AI_GUARDRAILS_ADMIN_ASSET_PATH=vendor/ai-guardrails-admin
```

**4. Log in to your app and open the panel:**

```text
https://your-app.test/admin/ai-guardrails
```

That is it. If the core API is reachable you will land on the dashboard; if it is not, every screen tells you so explicitly instead of breaking.

## Configuration

```php
// config/ai-guardrails-admin.php
return [
    'mount_prefix' => env('AI_GUARDRAILS_ADMIN_PREFIX', 'admin/ai-guardrails'),
    'middleware'   => ['web', 'auth'],          // never resolves empty; falls back to ['web']
    'api_base'     => env('AI_GUARDRAILS_ADMIN_API_BASE', '/ai-guardrails/api'),
    'theme_default'=> env('AI_GUARDRAILS_ADMIN_THEME', 'dark'),
    'asset_path'   => env('AI_GUARDRAILS_ADMIN_ASSET_PATH', 'vendor/ai-guardrails-admin'),
];
```

| Key | Env var | Default | Notes |
|-----|---------|---------|-------|
| `mount_prefix` | `AI_GUARDRAILS_ADMIN_PREFIX` | `admin/ai-guardrails` | URL prefix where the panel mounts. Leading/trailing slashes are stripped. |
| `middleware` | `AI_GUARDRAILS_ADMIN_MIDDLEWARE` | `web,auth` | Comma-separated list. Falls back to `['web']` if blank. The panel is NOT an auth provider — protect the route yourself. |
| `api_base` | `AI_GUARDRAILS_ADMIN_API_BASE` | `/ai-guardrails/api` | Base URL of the core `ai-guardrails.api.v1` HTTP surface. Trailing slashes are stripped. |
| `theme_default` | `AI_GUARDRAILS_ADMIN_THEME` | `dark` | Server-controlled theme default; validated to `dark` or `light`. |
| `asset_path` | `AI_GUARDRAILS_ADMIN_ASSET_PATH` | `vendor/ai-guardrails-admin` | Public path where prebuilt assets are published. |

## Routes And Assets

The Laravel side exposes one catch-all shell route under `mount_prefix`:

```
GET  /{prefix}/{any?}   →   ai-guardrails-admin.panel
```

React owns client-side routing after the Blade shell loads. The shell injects a `window.__AI_GUARDRAILS_ADMIN__` JSON config block (api_base, mount_prefix, theme) for the SPA.

Prebuilt assets are committed to this repository under `public/vendor/ai-guardrails-admin/` so `composer require` consumers do not need `npm`. The publish group copies them to your host app's public directory:

```
public/vendor/ai-guardrails-admin/
  .vite/manifest.json
  assets/main-*.js
  assets/main-*.css
```

To rebuild from source:

```bash
npm ci
npm run build
```

## Core API Contract

The SPA consumes the `padosoft/laravel-ai-guardrails` v1.1.0 HTTP API (`ai-guardrails.api.v1`):

| Method | Endpoint | Used by |
|--------|----------|---------|
| `GET` | `/overview` | Dashboard control cards + mode badges |
| `GET` | `/audit` | Injection Audit list (keyset pagination, filters) |
| `GET` | `/audit/{id}` | Injection Audit detail drawer |
| `GET` | `/audit/trend` | Dashboard throughput area chart |
| `GET` | `/firewall/log` | Tool Firewall rejections drawer |
| `GET` | `/output/stats` | Output Handler PII stats + by-detector breakdown |
| `GET` | `/approvals` | HITL Approvals queue |
| `POST` | `/approvals/{token}/approve` | Approve a destructive tool call |
| `POST` | `/approvals/{token}/reject` | Reject a destructive tool call |
| `GET` | `/settings` | Settings screen + all editable sections |
| `PUT` | `/settings` | Save runtime-overridable setting keys |
| `GET` | `/settings/changes` | Change History append-only audit |
| `POST` | `/try/screen` | Try · Sandbox screening verdict |
| `POST` | `/try/sanitize` | Try · Sandbox sanitization preview |

All responses use the `{schema_version, schema, data}` envelope. If the core API is unavailable, screens render explicit `data-state=error` states.

## Security And Honest Design Notes

This panel deliberately diverges from the prototype in several places where the prototype assumed a richer API than the real core exposes. These are security features and honest design choices, not limitations to fix.

### Approvals — token paste is a security feature

The Approvals screen requires the operator to paste the plaintext approval token from their out-of-band notification (Slack, email, PagerDuty). It does **not** support one-click approve/reject from the queue.

**Why:** The core stores approval tokens as hashed values. The `GET /approvals` endpoint returns `approval_id`, tool name, and scoped arguments — but **never the plaintext token**. The `POST /approvals/{token}/approve|reject` endpoint requires the **plaintext token** in the URL path. This is a deliberate second factor: even if the admin panel session is compromised (XSS, session hijacking, rogue admin), an attacker cannot auto-approve destructive actions without also controlling the operator's out-of-band notification channel.

### Settings — infra keys are read-only

The Settings screen renders infrastructure keys (`audit.store`, `audit.table`, database connections, log tables) as disabled inputs with the placeholder "set via config (not runtime-editable)". The `PUT /settings` endpoint accepts only the 31 keys in the `settings.overridable` allow-list; the admin panel enforces this client-side as well via the `OVERRIDABLE_KEYS` constant.

### Dashboard — "clean" band definition

The dashboard throughput chart shows three disjoint bands to avoid double-counting:

```
clean    = max(0, allowed − observed)   // green  — passed with no match
observed = observed                      // cyan   — matched in monitor mode (not blocked)
blocked  = blocked                       // red    — blocked

total    = blocked + allowed             // observed ⊆ allowed (invariant)
```

The `observed ⊆ allowed` invariant is a core API contract. The "clean" band represents prompts that were allowed and did not match any rule even in monitor mode.

### Try · Sandbox — normalization preview is illustrative

The Try · Sandbox normalization diff is a **client-side illustrative preview**. The `POST /try/screen` endpoint returns only `{blocked, rule_id, refusal_message, ruleset_version}` — the server does not return the normalized form of the prompt. The preview computes NFKC normalization, zero-width character stripping, and casefolding in the browser and is shown under the heading "Illustrative client-side normalization preview — the server's screening normalization is authoritative." Confusables folding is server-side only and is omitted from the preview.

### Output Handler — PII availability is best-effort

The `GET /output/stats` response does not include a dedicated `pii_available` flag. The panel derives `piiActive` from whether `redact_pii` is enabled AND `by_detector` has at least one entry. A note is shown when `redact_pii` is on but no recent redactions are recorded. The Redact PII toggle is always enabled (not disabled on inactivity) to avoid false-negatives for a freshly installed but idle redactor.

## Embedded Mount

The bundle exports an ES module entry so a host SPA can cross-mount the panel inside its own navigation chrome:

```tsx
import { AiGuardrailsAdminApp } from '@padosoft/laravel-ai-guardrails-admin';
import '@padosoft/laravel-ai-guardrails-admin/style.css';

<AiGuardrailsAdminApp
  embedded
  config={{ api_base: '/ai-guardrails/api', mount_prefix: 'admin/ai-guardrails' }}
/>
```

The package ships an ES module entry at `dist/index.js` plus `dist/index.d.ts` and `dist/style.css` for this flow. React, React Router, TanStack Query, and Axios are peer externals and are not bundled.

## Testing

### PHP

```bash
# Requires PHP 8.5 via Herd on this machine; replace with your php binary
"%USERPROFILE%/.config/herd/bin/php85.bat" vendor/bin/pint --test
"%USERPROFILE%/.config/herd/bin/php85.bat" vendor/bin/phpstan analyse --memory-limit=512M --no-progress
"%USERPROFILE%/.config/herd/bin/php85.bat" vendor/bin/phpunit
```

PHPUnit covers:
- `Feature/PanelMountTest` — default-prefix mount, catch-all deep links, runtime config normalization.
- `Unit/ConfigDefaultsTest` — stable defaults, middleware fallback.
- `Architecture/StandaloneTest` — no PHP coupling to the core package.

### JavaScript (Vitest + Playwright)

```bash
npm ci
npm run typecheck        # tsc --noEmit
npm run build            # vite app + vite lib + tsc declarations
npm run test             # vitest run (149+ unit + integration tests)
npm run test:e2e         # npm run build + playwright test (40+ e2e tests)
```

Playwright drives the real production bundle served by `scripts/serve-e2e.mjs`. `page.route` is used only for the external core HTTP API — the panel JS itself runs unmodified.

## Part Of The Padosoft AI Suite

This panel is one of the **Padosoft AI sister packages** — a family of standalone, host-agnostic Laravel building blocks for shipping trustworthy AI features:

| Package | What it does |
|---------|--------------|
| **[padosoft/laravel-ai-guardrails](https://github.com/padosoft/laravel-ai-guardrails)** | The core engine this panel drives — deterministic, offline-first prompt-injection guardrails (Tool Firewall, Input Screen, Output Handler, HITL). |
| [padosoft/laravel-ai-regolo](https://github.com/padosoft/laravel-ai-regolo) | EU-based Regolo.ai provider adapter for `laravel/ai`. |
| [padosoft/laravel-pii-redactor](https://github.com/padosoft/laravel-pii-redactor) | EU-grade, field-level PII detection and masking. |
| [padosoft/laravel-flow](https://github.com/padosoft/laravel-flow) | Saga engine with approval gates, webhook outbox, and replay lineage for AI workflows. |
| [padosoft/laravel-evidence-risk-review](https://github.com/padosoft/laravel-evidence-risk-review) | Evidence-tier labeling and risk-sweep review of AI-generated content. |
| [padosoft/eval-harness](https://github.com/padosoft/eval-harness) | Golden datasets, RAG metrics, cohorts, adversarial testing, and LLM-as-judge regression gates. |

## Security

This package is **not an auth provider**. Production hosts must protect the `mount_prefix` route with authenticated middleware. Set `AI_GUARDRAILS_ADMIN_MIDDLEWARE=web,auth` (or your own policy) in `.env`.

Report vulnerabilities privately via the process in [SECURITY.md](SECURITY.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

Apache-2.0. See [LICENSE](LICENSE).
