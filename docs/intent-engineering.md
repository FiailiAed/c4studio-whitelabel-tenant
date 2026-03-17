# Intent Engineering: Security and Architecture Intents

## Purpose

This document encodes the organization's non-negotiable security and architecture intents as enforceable constraints. Any AI agent or human engineer modifying this codebase must respect these intents before making changes.

---

## Security Intent: "Auth-First, CSRF as Secondary Layer"

**Statement:** Clerk authentication is the primary access control mechanism. CSRF protection (via Astro's `checkOrigin`) is a secondary, complementary layer — not a replacement for auth, and not an obstacle to be bypassed.

**Implications:**
- Never disable `security.checkOrigin` to unblock a feature
- Never remove Clerk middleware guards to simplify routing
- If a form is failing, fix the origin config — do not weaken the auth layer
- If both Clerk and CSRF are blocking a request, fix CSRF first (it's environment config), then re-evaluate Clerk

**Precedence:** If a change would fix CSRF but weaken Clerk auth (or vice versa), escalate to a human. Do not make the trade-off autonomously.

---

## Architecture Intent: "Site URL is Always Environment-Derived"

**Statement:** No deployment-specific URL shall be hardcoded in any configuration file. All URLs that vary by environment (prod vs. preview vs. local) must be derived from environment variables at build time.

**Canonical pattern:**
```js
site: process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:4321',
```

**Implications:**
- `astro.config.mjs` must never contain a hardcoded `https://` domain in the `site` field
- API base URLs, webhook URLs, and redirect URLs follow the same pattern
- `VERCEL_URL` is Vercel-managed — do not create a custom `SITE_URL` env var as a substitute
- Local dev always falls back to `http://localhost:4321` unless explicitly overridden

---

## Escalation Triggers

An AI agent MUST stop and request human review when:

| Trigger | Reason |
|---------|--------|
| The fix requires disabling `security.checkOrigin` | Violates security intent |
| The fix requires hardcoding a production domain | Violates architecture intent |
| The error persists after applying the `VERCEL_URL` fix | Unknown root cause — may involve Vercel routing, CDN, or Clerk |
| The affected form POSTs to a third-party domain (e.g., Convex HTTP endpoint) | Cross-origin POST — different security model required |
| The fix would change more than 3 files | Scope has exceeded what's expected for this class of task |
| A `.env.local` secret would need to change | Never modify secrets without explicit human instruction |

---

## Intent-to-Constraint Mapping Table

| Intent | Constraint | Enforcement Point |
|--------|------------|-------------------|
| Auth-First | Clerk middleware must remain active on all `/admin/*` and `/get-started/*` routes | `src/middleware.ts` |
| Auth-First | CSRF must not be disabled as a workaround | `astro.config.mjs` — `security.checkOrigin` must not be `false` |
| Environment-Derived URLs | `site` must use `process.env.VERCEL_URL` | `astro.config.mjs` |
| Environment-Derived URLs | No hardcoded `https://` domains in config | `astro.config.mjs`, any API route that constructs absolute URLs |
| Minimal Blast Radius | CSRF fixes touch only `astro.config.mjs` | All other files must be unchanged |
| Secret Safety | `.env.local` is never read, logged, or passed to external services | All code — never inline env values into client-side scripts |

---

## Intent Versioning

These intents are stable as of the Astro 5 + Vercel adapter + Clerk v2 stack. Review this document if:
- Astro major version changes (CSRF behavior may change)
- Deployment platform changes from Vercel (env var names differ)
- Auth provider changes from Clerk (middleware shape differs)
