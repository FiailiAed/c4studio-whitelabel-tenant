# Specification Engineering: CSRF Fix Blueprint

## Purpose

This document is a 5-Primitives specification an LLM or human engineer can execute against with zero ambiguity and no clarifying questions required.

---

## Primitive 1 — Self-Contained Problem Statement

Astro 5 SSR enables `security.checkOrigin` by default. This middleware intercepts every incoming POST request and compares its `Origin` header against the `site` value in `astro.config.mjs`. If they do not match exactly, Astro returns a 403 with the message: `"Cross-site POST form submissions are forbidden."`

In this project, `site` was set to a hardcoded domain (e.g., `'https://example.com'` or `'https://c4studio-bas-template.vercel.app'`). Vercel preview deployments each receive a unique auto-generated URL (e.g., `https://my-app-git-feature-abc123.vercel.app`). The browser sends this preview URL as the `Origin` header. It does not match the hardcoded `site`. Every form POST on every preview deployment fails with a CSRF error.

The same problem occurs locally if `site` does not match `http://localhost:4321`.

Affected pages (all use standard Astro SSR form POST):
- `src/pages/get-started/index.astro`
- `src/pages/get-started/practice.astro`
- `src/pages/get-started/games.astro`
- `src/pages/get-started/compliance.astro`
- `src/pages/admin/events/new.astro`
- `src/pages/admin/events/[id]/edit.astro`
- `src/pages/admin/events/[id]/plan.astro`
- `src/pages/admin/events/[id]/staff.astro`
- `src/pages/coach/log/[eventId].astro`

Root cause: `site` in `astro.config.mjs` is a hardcoded string instead of an environment-derived value.

---

## Primitive 2 — Acceptance Criteria

1. **Problem:** Every form POST on Vercel preview deployments returns 403 "Cross-site POST form submissions are forbidden" because `site` in `astro.config.mjs` is hardcoded and does not match the dynamic preview URL.

2. **Solution:** Replace the hardcoded `site` value with `process.env.VERCEL_URL ? \`https://\${process.env.VERCEL_URL}\` : 'http://localhost:4321'` so that the configured site URL always matches the deployment's actual origin.

3. **Verification:** After the fix, submitting any onboarding form on a Vercel preview URL returns a 200 (or redirect) with no CSRF error, and `bun run build` completes without errors.

---

## Primitive 3 — Constraint Architecture

### Musts
- The fix MUST be confined to `astro.config.mjs`
- The `site` value MUST be derived from `process.env.VERCEL_URL` at build time
- Local dev MUST fall back to `http://localhost:4321` when `VERCEL_URL` is unset
- The fix MUST work for all Vercel deployments (prod + all previews) without manual configuration

### Must Nots
- MUST NOT set `security: { checkOrigin: false }` — this disables CSRF protection
- MUST NOT hardcode any specific domain or hostname
- MUST NOT create a new env var (e.g., `SITE_URL`) — `VERCEL_URL` already exists and is managed by Vercel
- MUST NOT modify any form page, middleware, API route, or Convex function
- MUST NOT add CORS headers as a substitute fix
- MUST NOT modify `.env.local` or any deployment environment variables

### Preferences
- Prefer inline ternary over a separate variable for the `site` value
- Prefer `http://localhost:4321` (not `https://`) for local dev fallback — no TLS cert required
- Keep the change to 1–3 lines

### Escalation Triggers
- If `VERCEL_URL` is set but the error persists → escalate (may be a Vercel routing or CDN issue)
- If the form POSTs to a different domain (not the Astro SSR app) → escalate (different security model)
- If `astro.config.mjs` does not have a `site` field at all → escalate (may be a different Astro version behavior)

---

## Primitive 4 — Task Decomposition

Execute in this exact order:

### Step 1: Read `astro.config.mjs`
- Locate the `site` field
- Note the current value
- Confirm it is a hardcoded string

### Step 2: Apply the fix
- File: `astro.config.mjs`
- Find:
  ```js
  site: 'https://[any-hardcoded-domain]',
  ```
- Replace with:
  ```js
  site: process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:4321',
  ```
- No other changes to this file

### Step 3: Verify no other files need changing
- Confirm `src/middleware.ts` does not contain custom CSRF logic
- Confirm affected form pages use `Astro.request.method === 'POST'` (standard pattern)
- If both are true: done

### Step 4: Run build verification
```bash
bun run build
```
- Must complete with no TypeScript errors
- Must complete with no Astro config errors

### Step 5: Deploy and test
- Push to a Vercel preview branch
- Open any form page on the preview URL
- Submit the form
- Confirm: no 403, no CSRF error in response or logs

---

## Primitive 5 — Evaluation Design

### Build-Time Verification
```bash
bun run build
# Expected: exit code 0, no errors
```

### Local Dev Verification
```bash
bun run dev
# Open http://localhost:4321/get-started
# Submit the Step 1 form
# Expected: redirect to /get-started/practice (no CSRF error)
```

### Preview Deploy Verification
1. Push the fix to a feature branch
2. Vercel creates a preview deploy at `https://[app]-git-[branch]-[org].vercel.app`
3. Open the preview URL + `/get-started`
4. Submit Step 1 form
5. Check Vercel function logs: no `"Cross-site POST form submissions are forbidden"` entries
6. Expected: redirect to `/get-started/practice`

### Production Verification
1. Merge to main
2. Vercel deploys to production
3. Verify `VERCEL_URL` in Vercel dashboard environment variables matches production domain
4. Submit any form on production
5. Expected: no CSRF errors

### Regression Check
- All 9 affected form pages must pass the same test (form submission → success/redirect, no 403)
- Clerk auth must remain functional (protected pages still redirect to sign-in when unauthenticated)
- `security.checkOrigin` must remain enabled (verify no `checkOrigin: false` in `astro.config.mjs`)

### Definition of Done
- [ ] `bun run build` exits 0
- [ ] Form submission on preview URL succeeds
- [ ] No `"Cross-site POST"` errors in Vercel logs
- [ ] `astro.config.mjs` contains no hardcoded domain in `site`
- [ ] `security.checkOrigin` is not explicitly set to `false`
- [ ] Only `astro.config.mjs` was modified
