# Context Engineering — Coach Portal

Defines the minimum viable token set for each task category. Always include
`CLAUDE.md` as the **first** context item in every session.

---

## Rule: Always Include First

- `CLAUDE.md` — tech stack, conventions, env vars
- `docs/specs/prompt-craft.md` — role, patterns, guardrails, output format

---

## Task Category: Schema Work

**Use when:** Adding or modifying tables, indexes, or validators in `convex/schema.ts`

### Always Include
| File | Why |
|------|-----|
| `convex/schema.ts` | Full current schema — never excerpt for schema tasks |
| `convex/_generated/dataModel.d.ts` | Current generated types to validate against |
| The relevant spec file (`spec-01` or `spec-02`) | Acceptance criteria + exact field definitions |

### Exclude
All Astro page files, layout files, middleware, UploadThing config, unrelated Convex function files

### Post-Task Command
```
npx convex dev --once
```

---

## Task Category: Coach Page (read-only view)

**Use when:** Building `/coach`, `/coach/practice/[id]`, `/coach/drills`, `/coach/drills/[id]`, `/profile`

### Always Include
| File | Why |
|------|-----|
| `src/middleware.ts` | Route protection patterns |
| `src/layouts/Layout.astro` | Base layout interface |
| `src/layouts/CoachLayout.astro` (once created) | Coach shell with bottom nav |
| Relevant `convex/*.ts` function file (1–2 max) | Queries the page will call |
| `convex/schema.ts` — relevant tables only (excerpt) | Type safety for returned data |
| The relevant spec file | Acceptance criteria |

### Exclude
Admin pages, UploadThing config, `convex/documents.ts`, `convex/onboarding.ts` (unless page uses them), all other Convex files

### Context Size Limit
Maximum **2 Convex function files** per page invocation.

---

## Task Category: Form POST / Mutation

**Use when:** Building rep logging, RSVP, player creation, or any server POST handler

### Always Include
| File | Why |
|------|-----|
| `src/middleware.ts` | Auth pattern reference |
| The page file being created/modified | Full current state |
| The Convex mutation file | Exact function signature |
| `convex/schema.ts` — affected table(s) only (excerpt) | Validate arg types |
| The relevant spec file | Acceptance criteria + constraint architecture |

### Exclude
All read-only Convex query files not used on this page, all other Astro pages, layout files (unless layout is being modified), drill/event tables if the page doesn't touch them

---

## Task Category: Layout / Navigation

**Use when:** Creating `CoachLayout.astro`, updating bottom nav, updating middleware routing

### Always Include
| File | Why |
|------|-----|
| `src/layouts/Layout.astro` | Base layout to extend |
| `src/layouts/AdminDashboardLayout.astro` | Pattern reference for nav structure |
| `src/middleware.ts` | Route guard patterns to replicate |
| One representative Astro page using the layout | Usage pattern |
| The relevant spec file (`spec-03`) | Acceptance criteria |

### Exclude
All Convex files, UploadThing config, unrelated page files

---

## Task Category: Middleware Routing

**Use when:** Adding `/coach/*` route protection or `/` → `/coach` redirect

### Always Include
| File | Why |
|------|-----|
| `src/middleware.ts` | Full current middleware — must be shown complete |
| `convex/users.ts` | `getUserByClerkId` query used in middleware |
| The relevant spec file | Routing rules |

### Exclude
All page files, layout files, Convex files other than `users.ts`

---

## Task Category: Admin Page

**Use when:** Building `/admin/players` or any new admin route

### Always Include
| File | Why |
|------|-----|
| `src/layouts/AdminDashboardLayout.astro` | Admin shell layout |
| `src/middleware.ts` | Admin auth guard reference |
| The relevant Convex function file | Queries/mutations for this page |
| `convex/schema.ts` — affected tables only (excerpt) | Type reference |
| The relevant spec file | Acceptance criteria |

### Exclude
All coach pages, coach layout, UploadThing config (unless file uploads are involved)

---

## Global Context Size Rules

| Rule | Value |
|------|-------|
| Max Convex function files per session | 3 |
| Max Astro page files per session | 2 |
| Admin + coach pages in same context | NEVER |
| Schema tasks — use full schema | ALWAYS |
| Non-schema tasks — excerpt schema | excerpt relevant tables only |
| `CLAUDE.md` | ALWAYS first |
| `docs/specs/prompt-craft.md` | ALWAYS second |

---

## File Reference Map

Quick lookup: which files belong to which task categories.

```
convex/schema.ts           → Schema tasks only (full file)
convex/users.ts            → Middleware tasks, coach tasks (getUserByClerkId)
convex/events.ts           → Coach home, admin events
convex/assignments.ts      → Coach home, coach practice view
convex/plans.ts            → Coach practice view, admin plans
convex/drills.ts           → Coach drill library
convex/onboarding.ts       → Onboarding update tasks
convex/players.ts (new)    → Admin players page, rep logging
convex/repsLog.ts (new)    → Rep logging page
convex/eventRsvp.ts (new)  → Coach home (RSVP widget)

src/middleware.ts                       → All tasks (always include)
src/layouts/Layout.astro               → Layout tasks
src/layouts/CoachLayout.astro (new)    → All coach page tasks
src/layouts/AdminDashboardLayout.astro → All admin page tasks
src/pages/index.astro                  → Landing page task (spec-10)
src/pages/profile.astro (new)          → Profile migration task (spec-08)
src/pages/coach/index.astro (new)      → Coach home task (spec-04)
```
