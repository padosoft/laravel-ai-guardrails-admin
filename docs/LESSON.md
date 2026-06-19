# LESSON — laravel-ai-guardrails-admin

Accumulated non-obvious discoveries. Date entries YYYY-MM-DD.

---

## 2026-06-19 — SaveBar reusable contract (Task 5 → reused in Tasks 6, 8)

`SaveBar` is a pure display component. The **seed-on-save** pattern that makes it race-free:

1. `localPosture === null` means "not yet seeded" — the `useEffect` seeds from server data **only** when null. It never fires again during editing.
2. `handleSave()` seeds `localPosture` directly from `confirmed.settings` (the PUT response body) and calls `queryClient.invalidateQueries()` in the background with `void`. An edit made between PUT-resolve and cache refetch cannot be clobbered.
3. `changedKeys()` uses an order-insensitive comparison for array fields (`owner_keys`, `destructive_tools`) — sorted multiset before diff. Remove-then-re-add the same set in a different order yields `dirty = false`.
4. `useUpdateSettings` mutationFn is typed `(payload: { settings: Record<string, unknown> })` — the `{ settings: ... }` wrapper is enforced at compile time so callers cannot accidentally send a bare object.
5. Discard: `setLocalPosture(JSON.parse(JSON.stringify(serverPosture)))` — deep copy to avoid shared refs.

**Copy this pattern verbatim for any future screen that edits settings.**

---

## 2026-06-19 — OVERRIDABLE_KEYS static mirror (Task 8)

The core's `settings.overridable` allow-list is mirrored in `resources/js/lib/overridableKeys.ts` as the `OVERRIDABLE_KEYS` string array constant (31 keys). `changedKeys()` in SettingsPage uses `canEdit(key)` as a guard so non-overridable keys physically cannot enter the `PUT /settings` payload, even if a future dev adds a field to the UI without adding it to the allow-list.

When the core widens its `overridable` list in a future version, update `OVERRIDABLE_KEYS` here to match.

---

## 2026-06-19 — Approvals token-paste: security divergence from prototype (Task 7)

The prototype showed one-click approve/reject and displayed the plaintext token in the drawer. **Do not restore this.** The correct implementation:

- `GET /approvals` never returns a plaintext token (core stores hashed values).
- `POST /approvals/{token}/approve|reject` requires the plaintext token in the URL path (not `approval_id`).
- The panel's confirm drawer has a token-input field. The operator pastes the token from their out-of-band notification (Slack, email, PagerDuty).
- This is a deliberate second factor. Even with a compromised panel session, an attacker cannot auto-approve without also controlling the operator's notification channel.
- A future core enhancement could add approve-by-id for authenticated operators. Until then, token-paste is the correct security posture.

---

## 2026-06-19 — Drawer focus-steal bug (Task 8 fix pass)

`Drawer.tsx` has a `setTimeout(() => btn?.focus(), 60)` that auto-focuses the first focusable element — which in the approvals ConfirmDrawer is the **Cancel button**. In tests that call `userEvent.type(agr-token-input, ...)`, the 60ms timer fires during the type sequence and moves focus to Cancel, which activates it on the next keypress.

**Fix:** `await user.click(screen.getByTestId('agr-token-input'))` immediately before typing in all approve/reject/409/422 tests. This gives explicit focus to the token input, overriding the delayed auto-focus.

**If you add a new Drawer with a form**, always call `user.click(theInputField)` before typing in tests to avoid this class of intermittent failure.

---

## 2026-06-19 — Byte-offset matched-span highlight (Task 4)

The `POST /audit/{id}` response returns `matched_span: {start, end}` as **byte offsets** (UTF-8), not character offsets. JavaScript strings are UTF-16. A multi-byte character (emoji, CJK, etc.) before the span shifts the character index but not the byte index.

**Fix in `AuditPage.tsx` (`PromptExcerpt`):**

```ts
const enc = new TextEncoder();
const bytes = enc.encode(prompt);
const clampedStart = Math.max(0, Math.min(start, bytes.length));
const clampedEnd   = Math.max(clampedStart, Math.min(end, bytes.length));
const dec = new TextDecoder();
const pre  = dec.decode(bytes.slice(0, clampedStart));
const mark = dec.decode(bytes.slice(clampedStart, clampedEnd));
const post = dec.decode(bytes.slice(clampedEnd));
```

Degenerate or out-of-range spans clamp gracefully and render the prompt without a highlight rather than throwing.

---

## 2026-06-19 — observed ⊆ allowed: the dashboard invariant (Task 3)

The core API contract:

```
total = blocked + allowed
observed ⊆ allowed   (monitor-mode matches are a subset of allowed prompts)
```

The 3-band chart computes disjoint bands to avoid double-counting:

```
clean    = max(0, allowed − observed)
observed = observed
blocked  = blocked
```

These three bands sum to `blocked + allowed = total`. The "clean" band means "allowed AND no rule matched in monitor mode." If `observed > allowed` ever appears (API bug), `Math.max(0, ...)` clamps to zero rather than rendering a negative band.

Do NOT display `observed` as an independent additive band on top of `total` — that inflates the visual.

---

## 2026-06-19 — API degradations honestly handled (Tasks 6, 10)

### PII availability (`/output/stats`)

The API does not expose a `pii_available` flag. The panel derives `piiActive` from `redact_pii === true && by_detector` has entries. **Do not disable the Redact PII toggle** based on this — an installed-but-idle redactor (no redactions in the window) would be incorrectly presented as absent. Show an idle-note paragraph instead.

### PII count from `/try/sanitize`

`POST /try/sanitize` returns only `{sanitized: string}`. Do not show `"PII redactions: N"` — the count is unavailable and the value would be fabricated. Show a changed/unchanged indicator instead.

### Normalization diff from `/try/screen`

`POST /try/screen` returns only `{blocked, rule_id, refusal_message, ruleset_version}`. The server does not return the normalized form of the prompt. The client-side preview (NFKC + zero-width strip + casefold) is illustrative — it must be labelled as such and must not be presented as an authoritative normalization. Confusables folding is server-side only.

### Verdict filter → API mapping (`/audit`)

The API only accepts `blocked` (boolean) as a filter — there is no 3-way verdict filter. Client-side derivation: `Observed = blocked===false && rule_id != null`; `Allowed = blocked===false && rule_id == null`. Both map to `blocked=0` on the wire; the table column distinguishes them.

---

## 2026-06-19 — isHashOrRedacted() guard (Task 4)

`isRawPrompt()` (which enables the byte-span highlight) returns `false` for prompts that look like hashes or redaction markers, even if their `.length >= promptLength`. Three regex patterns:

- `HASH_HEX_RE` — all-hex strings of ≥ 32 chars (md5/sha256).
- `HASH_B64_RE` — base64/base64url tokens of ≥ 32 chars with no spaces.
- `REDACT_MARKER_RE` — bracket/angle-bracket markers like `[REDACTED]`, `<HASH>`.

Without this guard, a sha256 hash stored as `prompt` (when `audit_hygiene.prompt_storage = hash`) whose length equals `promptLength` would pass the raw check and attempt to highlight byte offsets inside the hash string, producing a meaningless mark.

---

## 2026-06-19 — UTC-safe time-range arithmetic (Task 3)

Do NOT use `new Date().setDate(d.getDate() - N)` for generating `from`/`to` query params. JavaScript `setDate()` operates in local time, so a day boundary near midnight local time can shift the wrong day. Use millisecond arithmetic instead:

```ts
const toMs   = nowMs ?? Date.now();
const fromMs = toMs - days * 86_400_000;
const from   = new Date(fromMs).toISOString().slice(0, 10);   // always UTC date
const to     = new Date(toMs).toISOString().slice(0, 10);
```

Accept `nowMs` as an optional injection parameter in tests so the clock can be fixed without global patching.

---

## 2026-06-19 — NFKC vs confusables for normalization preview (Task 10)

Cyrillic lookalike characters (e.g. Cyrillic `о` U+043E for Latin `o` U+006F) do **NOT** change under NFKC normalization. Only confusables folding catches them (server-side only). To test NFKC in unit tests, use **fullwidth Latin characters** (U+FF00 block, e.g. `Ａ` U+FF21) which genuinely change under NFKC to their ASCII equivalents. Do not use Cyrillic homoglyphs for NFKC tests — they will always remain unchanged and the test will be meaninglessly green.

---

## 2026-06-19 — Playwright e2e: route-matching for query strings (Task 4)

`page.route('**/api/audit', ...)` (Playwright glob) does **not** match `/api/audit?blocked=1`. Use a regex pattern instead:

```ts
page.route(/\/api\/audit(\?|$)/, handler)
```

The `(\?|$)` suffix anchors to the path end or the start of the query string, so it matches both `/api/audit` and `/api/audit?blocked=1` but not `/api/audit-log`.

---

## 2026-06-19 — Prebuilt assets distribution pattern (Task 11)

The house pattern (mirroring `padosoft/laravel-evidence-risk-review-admin`) ships prebuilt Vite output in the repository so `composer require` consumers do not need `npm` on their machines. To track the assets:

1. Remove `/public/vendor` from `.gitignore` (keep `/node_modules`, `/dist`, `composer.lock`, etc.).
2. `git add public/vendor/ai-guardrails-admin` — tracks the manifest + hashed JS/CSS.
3. Commit separately from docs: `build: ship compiled SPA assets for distribution`.

`/dist` (the ESM library build) remains gitignored — it is published to npm, not consumed by Laravel hosts.

The `LaravelAiGuardrailsAdminServiceProvider` only registers the publish group when `is_dir($builtAssets)` is true, so the provider degrades gracefully if the assets directory is absent (e.g. during development before building).
