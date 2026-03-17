# Spec 10 — Landing Page Update (`/`)

**Phase:** C (Core Views)
**Depends on:** spec-03 (middleware routing — authenticated approved coaches are redirected before they see this page)
**Blocks:** Nothing

---

## Primitive 1: Self-Contained Problem Statement

Currently `src/pages/index.astro` serves as both the landing page and the
authenticated user profile page. After spec-03's middleware redirects:
- Approved coaches → `/coach`
- Admins stay on `/` unless they navigate manually to `/admin`

The landing page must be refactored to be a clean informational page for:
1. **Unauthenticated visitors** — program information + sign-in entry point
2. **Non-approved coaches** (pending/in_progress/submitted) — their current status + next step CTA
3. **Admin users** who land here — a simple "Go to Admin Dashboard" button

The profile content (name, email, Convex record details) moves entirely to
`/profile` (spec-08). This page must NOT duplicate that content.

---

## Primitive 2: Acceptance Criteria

### Unauthenticated State
- ✅ Shows program name, tagline, and brief description (≤ 3 sentences)
- ✅ Shows `<SignIn />` component from `@clerk/astro/components`
- ✅ No broken layout at 375px

### Authenticated — Pending / In Progress
- ✅ Shows coach name (first name only, friendly)
- ✅ Shows onboarding status badge (using existing badge color convention)
- ✅ Shows a prominent CTA button: "Continue Onboarding →" linking to `/get-started`
- ✅ Does NOT show profile details (those are at `/profile`)

### Authenticated — Submitted (Under Review)
- ✅ Shows: "Thanks [firstName]! Your application is under review."
- ✅ Shows blue badge "Under Review"
- ✅ Shows: "We'll be in touch soon. No action needed."
- ✅ Shows link to `/profile` for account details

### Authenticated — Admin
- ✅ Shows: "Welcome back, [firstName]"
- ✅ Shows a single "Go to Admin Dashboard →" button linking to `/admin`
- ✅ Shows a link to `/profile`

### Done (Approved Coach) — Should Never See This Page
- ✅ Middleware (spec-03) redirects approved coaches to `/coach` before this page renders
- ✅ But as a fallback: if an approved non-admin user reaches this page, redirect to `/coach` in the frontmatter

### General
- ✅ Uses `Layout.astro` (base layout, not CoachLayout or AdminLayout)
- ✅ `bun run build` passes
- ✅ Zero TypeScript `any` types
- ❌ DENY: Rendering profile details (name, email, role, timestamps, badge grid)
- ❌ DENY: Importing admin or coach layout components
- ❌ DENY: Showing the debug badge rainbow grid from the old implementation

---

## Primitive 3: Constraint Architecture

**MUST:**
- Use `Astro.locals.auth()` to get `userId`
- Use `Astro.locals.currentUser()` to get first name
- Use `ConvexHttpClient` to get `convexUser` (for role + onboardStatus)
- Conditionally render one of the four states above using Astro's `{condition && <jsx />}` pattern
- Use `<SignedIn>` and `<SignedOut>` from `@clerk/astro/components` for outer auth branching

**MUST NOT:**
- Fetch onboarding table details (only need `users.onboardStatus` and `users.role`)
- Add marketing copy beyond a tagline + 2–3 sentences (this is an internal volunteer tool, not a public marketing page)
- Show a full navigation bar on the landing page (no top nav needed — sign-in is the only action)

**PREFERENCE:**
- Center content vertically and horizontally (`min-h-screen flex items-center justify-center`)
- Program name: "Lacrosse Coach Portal" (or whatever `SiteBanner` uses — check existing copy)
- CTA buttons: `rounded-full bg-gray-900 px-6 py-3 text-white font-semibold`
- Layout: `max-w-md mx-auto text-center px-4`

**ESCALATION TRIGGER:**
- If `convexUser` is `null` for an authenticated user (race condition during first sign-in / webhook delay), show a "Setting up your account..." message and a refresh link — do not crash

---

## Primitive 4: Task Decomposition

1. **Refactor `src/pages/index.astro`**
   - Keep frontmatter auth logic (auth, currentUser, convexUser)
   - Add fallback redirect for `onboardStatus === "done"` non-admin users
   - Replace template with 4-state conditional rendering
   - Remove all profile detail display code

2. **Run verification** — `bun run build && bunx tsc --noEmit`

No new Convex functions. No new layout files. No new pages.

---

## Primitive 5: Evaluation Design

| Check | Method | Expected |
|-------|--------|----------|
| Build passes | `bun run build` | Exit 0 |
| TypeScript | `bunx tsc --noEmit` | Exit 0 |
| Renders at 375px | Mobile viewport | Centered content, no horizontal scroll |
| Unauthenticated | Visit `/` without login | SignIn component visible, program info |
| Pending user | Login as pending coach | "Continue Onboarding" CTA visible |
| Submitted user | Login as submitted coach | "Under review" message |
| Admin user | Login as admin | "Go to Admin Dashboard" button |
| Approved coach | Login as done coach | Redirect to `/coach` |
| Race condition | `convexUser` is null | "Setting up your account..." message |
| No profile details | Any authenticated state | Name/email/role data NOT shown |

---

## State Rendering Reference

```astro
<SignedOut>
  <!-- Program info + SignIn component -->
</SignedOut>

<SignedIn>
  {!convexUser && (
    <!-- Setting up account... -->
  )}

  {convexUser?.role === "admin" && (
    <!-- Admin: Go to Dashboard button -->
  )}

  {convexUser && convexUser.role !== "admin" && convexUser.onboardStatus === "pending" && (
    <!-- Pending: Continue Onboarding CTA -->
  )}

  {convexUser && convexUser.role !== "admin" && convexUser.onboardStatus === "in_progress" && (
    <!-- In Progress: Continue Onboarding CTA -->
  )}

  {convexUser && convexUser.role !== "admin" && convexUser.onboardStatus === "submitted" && (
    <!-- Submitted: Under review message -->
  )}

  {convexUser && convexUser.role !== "admin" && convexUser.onboardStatus === "done" && (
    <!-- Fallback redirect handled in frontmatter; show nothing or spinner -->
  )}
</SignedIn>
```
