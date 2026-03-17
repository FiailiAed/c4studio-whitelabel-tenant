# Spec 08 — Profile Migration (`/profile`)

**Phase:** C (Core Views)
**Depends on:** spec-03 (CoachLayout — Profile tab links here)
**Blocks:** Nothing

---

## Primitive 1: Self-Contained Problem Statement

The current `src/pages/index.astro` serves two purposes: it is the landing page
for unauthenticated users (showing `<SignIn />`) AND the profile/account page for
authenticated users. After spec-03 and spec-10, `/` becomes a clean landing page
for unauthenticated users only. The authenticated profile content must move to
`/profile`.

The new `/profile` page:
- Shows the authenticated coach's Clerk account info (name, email, member since)
- Shows their Convex `users` record (role, onboardStatus)
- Shows their onboarding status with a CTA if not done
- Has a Sign Out button
- Is accessible via the Profile tab in the bottom nav

---

## Primitive 2: Acceptance Criteria

- ✅ New file: `src/pages/profile.astro`
- ✅ Uses `CoachLayout` with `currentTab="profile"`
- ✅ Requires authentication — middleware redirects unauthenticated users to `/`
- ✅ Shows: full name, email address, account created date
- ✅ Shows: role, onboarding status (human-readable label + colored badge)
- ✅ Shows: `<UserButton />` from `@clerk/astro/components` for account management
- ✅ Shows: Sign out button (`<SignOutButton />`)
- ✅ If `onboardStatus === "pending"` or `"in_progress"`: CTA button linking to `/get-started`
- ✅ If `onboardStatus === "submitted"`: shows "Under review — an admin will contact you"
- ✅ If `onboardStatus === "done"`: shows green "Active" badge
- ✅ Renders at 375px with no horizontal scroll
- ✅ Zero TypeScript `any` types
- ✅ After this spec: `/` no longer renders authenticated user profile content (spec-10 handles that)
- ❌ DENY: `/profile` accessible without authentication
- ❌ DENY: Showing the raw debug badge grid from the old `index.astro` (the rainbow badge row — remove it)
- ❌ DENY: Showing Convex internal IDs or timestamps in raw format

---

## Primitive 3: Constraint Architecture

**MUST:**
- Use `Astro.locals.auth()` to get `userId`
- Use `Astro.locals.currentUser()` to get Clerk user details (name, email, createdAt)
- Use `ConvexHttpClient` to fetch Convex `users` record
- Format `user.createdAt` (Unix ms) with `new Date(user.createdAt).toLocaleDateString(...)`
- Use `CoachLayout` — NOT `AdminDashboardLayout`

**MUST NOT:**
- Modify `src/pages/index.astro` in this spec — that is spec-10's responsibility
- Show the rainbow debug badge row from the old `index.astro`
- Show `convexUser.createdAt` or `updatedAt` raw timestamps to the user

**PREFERENCE:**
- Profile card: white background, rounded-2xl, shadow-sm, `divide-y divide-gray-100`
- Status badge colors match existing convention:
  - pending: `bg-red-400/10 text-red-400`
  - in_progress: `bg-yellow-400/10 text-yellow-500`
  - submitted: `bg-blue-400/10 text-blue-500`
  - done: `bg-green-400/10 text-green-400`
- Sign out button: full-width, gray, bottom of page

**ESCALATION TRIGGER:**
- If `Astro.locals.currentUser()` returns `null` (should not happen due to middleware), redirect to `/`

---

## Primitive 4: Task Decomposition

1. **Create `src/pages/profile.astro`**
   - Frontmatter: auth, `currentUser()`, `ConvexHttpClient` query for convexUser
   - Template: profile info card, status section, sign out

2. **Update `src/middleware.ts`** — add `/profile` to the list of routes requiring authentication (redirect unauthenticated to `/`)

3. **Run verification** — `bun run build && bunx tsc --noEmit`

No Convex function changes needed — uses `api.users.getUserByClerkId` already.

---

## Primitive 5: Evaluation Design

| Check | Method | Expected |
|-------|--------|----------|
| Build passes | `bun run build` | Exit 0 |
| TypeScript | `bunx tsc --noEmit` | Exit 0 |
| Renders at 375px | Mobile viewport | Card layout, no horizontal scroll |
| Requires auth | Visit `/profile` unauthenticated | Redirect to `/` |
| Name shown | Logged in as John Doe | "John Doe" displayed |
| Status: done | `onboardStatus: "done"` user | Green "Active" badge |
| Status: pending | `onboardStatus: "pending"` user | Red badge + "Get Started" CTA |
| Status: submitted | `onboardStatus: "submitted"` user | Blue badge + "Under review" text |
| Bottom nav active | Visit `/profile` | Profile tab highlighted |
| Sign out works | Tap Sign Out | User logged out, redirected to `/` |
