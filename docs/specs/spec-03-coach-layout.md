# Spec 03 — Coach Layout + Bottom Nav + Middleware Routing

**Phase:** B (Shell)
**Depends on:** spec-01 (schema, so `onboardStatus: "done"` exists)
**Blocks:** spec-04, spec-05, spec-06, spec-07, spec-08, spec-10

---

## Primitive 1: Self-Contained Problem Statement

Coaches currently have no dedicated shell or navigation. After completing
onboarding and being approved (`onboardStatus: "done"`), they are dropped back
at `/` with no direction.

Three things must be built:
1. `src/layouts/CoachLayout.astro` — mobile-first shell with bottom nav (4 tabs)
2. `src/middleware.ts` — updated to protect `/coach/*` and redirect authenticated
   approved coaches from `/` to `/coach`
3. `src/pages/coach/index.astro` — placeholder page (spec-04 will fill this in)
   so the layout and routing can be tested independently

The bottom nav has 4 tabs: **Home** (`/coach`), **Practice** (`/coach/practice`),
**Log** (`/coach/log`), **Profile** (`/profile`).

---

## Primitive 2: Acceptance Criteria

### CoachLayout (`src/layouts/CoachLayout.astro`)
- ✅ Accepts `Props: { title: string; currentTab: "home" | "practice" | "log" | "profile" }`
- ✅ Bottom nav bar is fixed to viewport bottom with 4 equal-width tabs
- ✅ Each tab has an SVG icon (inline, no external assets) + label
- ✅ Active tab is visually distinct (e.g., text-green-600, icon filled)
- ✅ Inactive tabs use muted color (text-gray-500)
- ✅ Bottom nav has `pb-safe` equivalent padding: `padding-bottom: env(safe-area-inset-bottom)`
- ✅ Main content area has `padding-bottom: 80px` (or equivalent Tailwind) so content is not hidden behind the nav bar
- ✅ Page title is shown in a top bar (white background, border-bottom)
- ✅ All touch targets ≥ 44px (`min-h-11`)
- ✅ No horizontal scroll at 375px viewport
- ✅ Layout works on desktop: bottom nav becomes a sidebar or collapses gracefully (does not break)

### Middleware Updates (`src/middleware.ts`)
- ✅ `/coach/*` routes require: (a) authenticated user, (b) `onboardStatus === "done"` in Convex `users` table
- ✅ Unauthenticated user visiting `/coach/*` → redirect to `/`
- ✅ Authenticated user with `onboardStatus !== "done"` visiting `/coach/*` → redirect to `/get-started`
- ✅ Authenticated user with `onboardStatus === "done"` visiting `/` → redirect to `/coach`
- ✅ Admin users are NOT redirected from `/` (they go to `/admin` manually)
- ✅ Existing `/admin/*` and `/get-started/*` route guards are unchanged
- ✅ All middleware paths end with `return next()` (never bare `next()`)

### Placeholder Coach Home (`src/pages/coach/index.astro`)
- ✅ Uses `CoachLayout` with `currentTab="home"`
- ✅ Renders a simple "Coming soon" or "Coach Home" placeholder
- ✅ Fetches the authenticated user from `Astro.locals.auth()`
- ✅ `bun run build` passes

- ❌ DENY: CoachLayout imports React
- ❌ DENY: Bottom nav uses an external icon library (all SVGs must be inline)
- ❌ DENY: Middleware uses `auth().protect()` — must use the clerkMiddleware callback pattern
- ❌ DENY: `/` redirect applies to admin users (would break admin access)

---

## Primitive 3: Constraint Architecture

**MUST:**
- Middleware must query Convex `users` table (using `api.users.getUserByClerkId`) to check `onboardStatus` for the `/coach/*` guard — same pattern as the existing admin role check
- Use `clerkMiddleware(async (auth, context, next) => { ... return next(); })` — three arguments, always return `next()`
- Bottom nav icons: use simple, recognizable SVG paths. Suggested:
  - Home: house icon
  - Practice: clipboard/list icon
  - Log: pencil/check icon
  - Profile: person/user circle icon
- CoachLayout must import `../styles/global.css` (same as existing layouts)
- Use `env(safe-area-inset-bottom)` via an inline style on the bottom nav for iOS notch safety

**MUST NOT:**
- Add a top hamburger menu — mobile navigation is bottom-only
- Use `<details>` dropdowns in coach layout (admin pattern, not coach pattern)
- Add a notifications bell (out of scope)
- Apply the coach redirect to users whose `onboardStatus` is `null` or `undefined` (treat as non-done, redirect to `/get-started`)

**PREFERENCE:**
- Bottom nav background: `bg-white border-t border-gray-200`
- Active state: `text-green-600` with filled icon variant
- Tab label font: `text-xs font-medium`
- Page title bar: `bg-white border-b border-gray-100 px-4 py-3`

**ESCALATION TRIGGER:**
- If the Convex `users` table lookup in middleware fails for a valid user, log the issue and redirect to `/` (fail safe, not fail open)

---

## Primitive 4: Task Decomposition

1. **Create `src/layouts/CoachLayout.astro`**
   - Props interface
   - `<head>` with viewport, charset, title
   - Top title bar
   - `<slot />` with bottom padding
   - Fixed bottom nav with 4 tabs

2. **Update `src/middleware.ts`**
   - Add `/coach/*` route protection (auth + onboardStatus check)
   - Add `/` redirect for approved coaches
   - Preserve existing admin and get-started guards

3. **Create `src/pages/coach/index.astro`** (placeholder)
   - Auth check via `Astro.locals.auth()`
   - Renders with `CoachLayout currentTab="home"`

4. **Run verification** — `npx convex dev --once && bun run build && bunx tsc --noEmit`

---

## Primitive 5: Evaluation Design

| Check | Method | Expected |
|-------|--------|----------|
| Build passes | `bun run build` | Exit 0 |
| TypeScript | `bunx tsc --noEmit` | Exit 0 |
| Unauthenticated `/coach` | Visit without login | Redirect to `/` |
| Pending user `/coach` | Login as `onboardStatus: "pending"` user | Redirect to `/get-started` |
| Approved user `/` | Login as `onboardStatus: "done"` user | Redirect to `/coach` |
| Admin user `/` | Login as `role: "admin"` user | NOT redirected (stays at `/`) |
| Layout renders at 375px | Dev tools mobile view | No horizontal scroll, bottom nav visible |
| Active tab | Visit `/coach` | Home tab is highlighted |
| Touch targets | Inspect element on tab | Height ≥ 44px |

---

## Tab Reference

```
Tab 1: Home     → /coach         icon: house
Tab 2: Practice → /coach/practice  icon: clipboard list
Tab 3: Log      → /coach/log     icon: pencil + check
Tab 4: Profile  → /profile       icon: user circle
```

## Middleware Logic Pseudocode

```
if pathname starts with "/coach":
  if not authenticated → redirect to "/"
  lookup user in Convex by clerkId
  if user.onboardStatus !== "done" → redirect to "/get-started"

if pathname === "/" AND authenticated:
  lookup user in Convex by clerkId
  if user exists AND user.onboardStatus === "done" AND user.role !== "admin":
    redirect to "/coach"

[existing admin + get-started guards unchanged]

return next()
```
