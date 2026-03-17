# Context Engineering: CSRF Fix in Astro SSR

## Purpose

This document defines the minimal, sufficient context window for an LLM (or human) to diagnose and fix Astro 5 SSR CSRF errors without excess noise or missing information.

---

## Files to Include

| File | Why |
|------|-----|
| `astro.config.mjs` | Contains `site` — the root cause |
| `src/middleware.ts` | Confirms CSRF is not handled there; shows route guards |
| One affected form page (e.g., `src/pages/get-started/index.astro`) | Confirms standard Astro POST handling pattern |
| Vercel deployment URL (from logs or browser) | Required to confirm the Origin mismatch |
| Error message verbatim | Confirms this is a CSRF-class error, not auth or network |

**Typical token cost:** ~800–1,200 tokens. Well within any model's working budget.

---

## Files to Explicitly Exclude

These files are irrelevant to CSRF diagnosis and inflate the context window without benefit:

| File / Directory | Why Excluded |
|------------------|--------------|
| `convex/` (all files) | Database layer — not involved in HTTP origin checks |
| `src/pages/admin/drills/` | Feature pages — not affected by the root cause |
| `src/pages/admin/plans/` | Feature pages — not affected by the root cause |
| `src/pages/admin/events/[id]/checklist.astro` | Feature pages — not affected |
| `src/layouts/` | Layout components — no role in CSRF handling |
| `convex/schema.ts` | Schema definition — irrelevant to origin checking |
| `package.json` / `bun.lockb` | Dependency list — version is already known from stack docs |
| `.env.local` (never include) | Contains secrets — never pass to any LLM |

---

## Token Budget Guidelines

- **Hard cap:** 4,000 tokens for this class of task
- `astro.config.mjs` is ~20 lines (~60 tokens) — always include in full
- `src/middleware.ts` is ~50–80 lines (~200 tokens) — include in full
- One form page: include only the frontmatter and the form element (~100 tokens); omit Tailwind class-heavy HTML
- Error message: include verbatim, one line
- Deployment URL: one line

**Do not summarize `astro.config.mjs`** — it must be read exactly as-is to spot the `site` mismatch.

---

## How to Summarize Convex Schema (When Required)

For tasks adjacent to CSRF (e.g., form POST + Convex mutation failures), summarize the schema as:

```
Tables relevant to this form:
- onboarding: { clerkUserId, currentStep, volunteerType, ... }
- users: { clerkUserId, email, role }
```

Never dump the full `convex/schema.ts`. A targeted 3–5 field summary per relevant table is sufficient.

---

## When to Refresh Context vs. Reuse

| Situation | Action |
|-----------|--------|
| Fixing CSRF on the same deployment | Reuse — root cause is identical |
| Fixing CSRF on a new deployment with a different URL | Reuse — fix is identical (`VERCEL_URL` handles it) |
| CSRF fix is applied but error persists | Refresh — read `astro.config.mjs` again post-fix to confirm change landed |
| New Astro major version | Refresh — `checkOrigin` behavior may have changed |
| Error message differs (e.g., 403 with no CSRF text) | Refresh — different error class; start diagnosis from scratch |
| Any file in `convex/` was changed | Irrelevant — do not refresh for CSRF tasks |

---

## Context Assembly Checklist

Before handing context to an LLM for this task, verify:

- [ ] `astro.config.mjs` included in full
- [ ] `src/middleware.ts` included in full
- [ ] At least one affected form page included (frontmatter + form element only)
- [ ] Error message included verbatim
- [ ] Deployment URL included
- [ ] No `.env.local` or secret files included
- [ ] No unrelated feature pages included
- [ ] Total token estimate is under 4,000
