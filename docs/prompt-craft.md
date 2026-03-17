# Prompt Craft: Diagnosing and Fixing Astro SSR CSRF Errors

## Role / Task Statement

You are a senior full-stack engineer specializing in Astro SSR deployments on Vercel. Your task is to diagnose "Cross-site POST form submissions are forbidden" errors and produce a correct, minimal fix scoped to `astro.config.mjs`.

---

## Required Input Context

Before acting, you must have access to:

1. `astro.config.mjs` — to inspect the `site` field
2. `src/middleware.ts` — to confirm CSRF is not being handled there
3. One affected form page (e.g., `src/pages/get-started/index.astro`) — to confirm standard Astro POST handling
4. The error message verbatim (browser console or Vercel function logs)
5. The deployment URL (the URL at which the error occurs)

Do NOT act on partial context. If any of the above is missing, request it before diagnosing.

---

## Step-by-Step Diagnostic Instructions

1. **Confirm the error is CSRF-class**
   - Error text must contain: `"Cross-site POST form submissions are forbidden"`
   - This error is thrown by Astro's built-in `security.checkOrigin` middleware (enabled by default in Astro 5 SSR)
   - It triggers when the `Origin` header of a POST request does not match the `site` config value

2. **Inspect `astro.config.mjs`**
   - Find the `site` field
   - If `site` is a hardcoded string (e.g., `'https://example.com'` or any URL that differs from the deployment URL), this is the root cause
   - If `site` is already environment-derived (`process.env.VERCEL_URL`), the error is elsewhere — stop and re-diagnose

3. **Identify the mismatch**
   - The `Origin` header browsers send = the URL the user is visiting (e.g., `https://my-app-abc123.vercel.app`)
   - The `site` Astro checks against = whatever is in `astro.config.mjs`
   - If they differ, every POST fails

4. **Apply the fix**
   - Replace the hardcoded `site` with:
     ```js
     site: process.env.VERCEL_URL
       ? `https://${process.env.VERCEL_URL}`
       : 'http://localhost:4321',
     ```
   - `VERCEL_URL` is auto-injected by Vercel at build time for every deployment (prod + preview)
   - It is hostname-only (no protocol), so prepend `https://`
   - Local dev fallback: `http://localhost:4321`

5. **Verify no other files need changing**
   - Astro's `checkOrigin` reads `site` at build time; no runtime config exists
   - Form pages using standard `Astro.request.method === 'POST'` handling are unaffected
   - Middleware CSRF handling (if any) is separate and not the cause here

---

## Worked Example 1: Correct Diagnosis

**Input context:**
```
// astro.config.mjs
site: 'https://example.com',
```
**Error:** `Cross-site POST form submissions are forbidden` on `https://my-app-xyz.vercel.app/get-started`

**Diagnosis:** `site` is `'https://example.com'` but `Origin` is `https://my-app-xyz.vercel.app`. Mismatch → CSRF block.

**Fix:**
```js
site: process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:4321',
```

**Expected output:** One-line diff in `astro.config.mjs`. No other files touched.

---

## Worked Example 2: Correct Diagnosis (Preview Deploy)

**Input context:**
```
// astro.config.mjs
site: 'https://my-app.vercel.app',
```
**Error:** CSRF block on `https://my-app-git-feature-abc123.vercel.app/admin/events/new`

**Diagnosis:** `site` is hardcoded to production URL but preview deploy has a different `VERCEL_URL`. Preview `Origin` ≠ `site` → CSRF block.

**Fix:** Same as Example 1 — use `process.env.VERCEL_URL`. This resolves both prod and all preview URLs automatically.

---

## Counter-Example 1: Wrong Answer — Disabling checkOrigin

**Wrong fix:**
```js
security: { checkOrigin: false }
```

**Why it's wrong:** This disables CSRF protection entirely. The correct fix is to supply the right `site` value, not to remove the guard. Disabling `checkOrigin` violates the security intent of the project.

---

## Counter-Example 2: Wrong Answer — Hardcoding the Production URL

**Wrong fix:**
```js
site: 'https://my-app-xyz.vercel.app',
```

**Why it's wrong:** This fixes production but breaks all preview deployments. Each Vercel preview deploy gets a unique `VERCEL_URL`. Hardcoding one URL means every preview's `Origin` will be rejected. The environment-derived approach handles all deployments.

---

## Guardrails

- **Do NOT** disable `security.checkOrigin`
- **Do NOT** hardcode any domain into `site`
- **Do NOT** add CORS headers as a workaround — CSRF and CORS are distinct mechanisms
- **Do NOT** modify form pages, middleware, or API routes to work around this
- **Do NOT** add `credentials: 'include'` to fetch calls — this is a form POST issue, not an XHR issue
- **Do NOT** touch Convex, Clerk, or UploadThing configuration — they are unrelated

---

## Output Format Template

```
## Diagnosis

Root cause: [one sentence]
File: [file path]
Line: [line number or range]
Mismatch: site=[current value] vs Origin=[deployment URL pattern]

## Fix

File: astro.config.mjs
Change:
  Before: site: '[old value]',
  After:
    site: process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:4321',

## Verification

1. Run `bun run build` — confirm no errors
2. Deploy to Vercel preview — submit any form — confirm no CSRF error
3. Check Vercel function logs — confirm no "Cross-site POST" entries
```
