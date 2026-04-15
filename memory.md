# Project Memory: TaskMaster
*Source of truth for all architectural decisions. Update this file before starting any new session. Always ask for permission before updating.*

---

## What This Project Is

A real-time client task management board ("TaskMaster") built **on top of** an existing whitelabel multi-tenant SaaS scaffold. The scaffold handles tenants, users, auth, roles, and impersonation. TaskMaster layers a task board feature on top of it, scoped to each tenant at `/t/[slug]/board`.

---

## The Stack (Installed & Wired)

| Technology | Version | Notes |
|---|---|---|
| **Runtime** | Bun | Always use `bun` / `bunx`, never `npm` or `npx` |
| **Framework** | Astro 5 | SSR via Vercel adapter |
| **React** | 19.2.5 | Islands only (`client:load`). `react` AND `react-dom` must both be pinned to `19.2.5` |
| **Astro React integration** | `@astrojs/react@5.0.3` | Requires `@astrojs/internal-helpers@0.8.0` — already upgraded |
| **Convex** | `^1.32.0` | Deployed at `dev:artful-marten-729` (`PUBLIC_CONVEX_URL` in `.env.local`) |
| **Clerk** | `@clerk/astro@^2.17.7` | Auth fully wired. DO NOT build custom auth. Use `@clerk/astro/components` for UI. |
| **Tailwind** | v4.2.1 | Configured via Vite plugin ONLY. No `tailwind.config.mjs`. |
| **Radix UI** | `@radix-ui/react-dialog`, `@radix-ui/react-visually-hidden` | Installed for modals |
| **Stripe** | `@convex-dev/stripe@0.1.4` | Convex component. Manages webhooks. See Stripe section below. |
| **Resend** | HTTP API only (no SDK) | Keys in `.env.local`: `RESEND_API`, `RESEND_FROM_EMAIL` |
| **Vercel** | Analytics + Speed Insights | Already in all layouts |

### What is NOT installed
- No Resend SDK — email is sent via raw `fetch` to `https://api.resend.com/emails`
- No Stripe SDK — all Stripe is handled by `@convex-dev/stripe` Convex component
- No React Query / Zustand — state is Convex hooks + URL params only

---

## Tailwind Rules (Critical)
- **NO `tailwind.config.mjs`**. Tailwind v4 is config-less. CSS-first.
- Custom utilities live in `src/styles/global.css` using `@utility stripe-shadow { ... }` syntax.
- `stripe-shadow` and `stripe-shadow-dark` are already defined there.
- **Never build dynamic Tailwind class names** (e.g., `bg-${color}`). They get purged. Use `style={{ backgroundColor: hex }}` for dynamic colors.
- Dark mode via `dark:` class modifier on `<html>`. Toggled via JS, persisted to `localStorage`.

---

## Astro Rules (Critical)
- Astro v5: use `<ClientRouter />` from `astro:transitions`. `<ViewTransitions />` is deprecated.
- All React components use `client:load` directive in `.astro` files.
- Path aliases defined in `tsconfig.json`: `@convex/*`, `@lib/*`, `@components/*`, `@layouts/*`, `@pages/*`, `@styles/*`.
- **Clerk UI in Astro layouts:** Use `import { UserButton } from "@clerk/astro/components"` — native Astro component, no React island needed.

---

## Convex Schema (All 7 Tables)

```
invoices      → clientId (id<clients>), stripeInvoiceId, amountPaid, currency, paidAt
                Index: by_client

clients       → tenantId (id<tenants>), name, abbrev, themeColor (hex), stripeCustomerId?
                Index: by_tenant

tasks         → clientId (id<clients>), title, status ("todo"|"pending"|"done"),
                createdAt (number), createdBy (clerkId string),
                resources? (array of { label: string, url: string })
                Indexes: by_client, by_client_and_status

tenants       → name, slug, customDomain?, logoUrl?, primaryColor?, status, createdAt, updatedAt
                Indexes: by_slug, by_custom_domain

users         → clerkId, email, firstName?, lastName?, platformRole ("super_admin"|"user"),
                createdAt, updatedAt
                Index: by_clerk_id

tenant_members → tenantId, clerkId, tenantRole (string), status ("active"|"inactive"|"invited"),
                 createdAt, updatedAt
                 Indexes: by_tenant, by_clerk_id, by_tenant_and_clerk
```

### Convex Files
| File | Exports |
|---|---|
| `convex/schema.ts` | Full schema (7 tables above) |
| `convex/board.ts` | `getBoard(tenantId)` — clients + nested tasks (includes resources) |
| `convex/tasks.ts` | `createTask`, `updateStatus` (schedules email when → pending), `updateTask` (title + resources), `getTask` (internal), `handleInvoicePaid` (internal) |
| `convex/clients.ts` | `createClient`, `getClient`, `listClientTasks`, `listClientInvoices` |
| `convex/emails.ts` | `sendPendingNotification` (internalAction → Resend) |
| `convex/stripe.ts` | `createInvoice` action — creates + finalizes Stripe invoice via raw fetch |
| `convex/http.ts` | Stripe webhook router at `/stripe/webhook` |
| `convex/convex.config.ts` | Registers `@convex-dev/stripe` component |
| `convex/users.ts` | `getUserByClerkId`, `upsertUser`, `deleteUser`, `updatePlatformRole` |
| `convex/tenants.ts` | CRUD for tenants — `updateTenant` called directly from React via `useMutation` (NOT via HTTP API which requires super_admin) |
| `convex/tenantMembers.ts` | Membership queries/mutations |

**After any schema change: run `bunx convex dev` to regenerate `convex/_generated/`.**

---

## File Structure (TaskMaster additions)

```
src/
  lib/
    convex.ts                   ← singleton ConvexReactClient (shared by all islands)
  components/
    UserButtonIsland.tsx        ← UNUSED. Replaced by @clerk/astro/components UserButton.
    board/
      BoardApp.tsx              ← Root island: ConvexProvider + filter/search state + layout
      Sidebar.tsx               ← Filter nav ("Views": All/Todo/Pending/Done) + Add Client btn
                                   bg: #f7f9fc / dark: #111827. Icons per filter. Active: ring style.
      ClientBoard.tsx           ← useQuery(getBoard), filters by URL state, CSS grid layout
      ClientCard.tsx            ← Client card: header band (themeColor avatar), task list, add task
                                   Invoice btn visible when stripeCustomerId set.
      TaskItem.tsx              ← Click opens TaskEditModal. Shows resource chips. Optimistic via modal.
      TaskEditModal.tsx         ← Radix Dialog: edit title, status toggle, dynamic resources list
      AddClientModal.tsx        ← Radix UI Dialog for creating clients
      CreateInvoiceModal.tsx    ← Radix Dialog: create Stripe invoice (description + amount)
      ClientDetail.tsx          ← React island: full task history + invoice history
      TenantSettingsIsland.tsx  ← Standalone island (own ConvexProvider): gear icon → edit tenant
  layouts/
    DashboardLayout.astro       ← Board shell. Props: title, tenantName, tenantSlug, tenantLogo?,
                                   tenantColor?, isImpersonating?, convexTenantId?, showSettings?
                                   Gear icon shown when showSettings=true. UserButton from @clerk/astro/components.
    TenantLayout.astro          ← Tenant shell: bottom nav Home + Board + Members + Settings
  pages/
    t/[slug]/
      board.astro               ← Mounts <BoardApp client:load>. Passes showSettings to layout.
      client/[id].astro         ← Mounts <ClientDetail client:load>. Passes showSettings to layout.
```

---

## Routing & URLs

| Route | Description | Auth |
|---|---|---|
| `/t/[slug]/board` | Main task board | Any tenant member |
| `/t/[slug]/client/[id]` | Client detail (tasks + invoices) | Any tenant member |
| `/t/[slug]/members` | Manage members | Tenant admin only |
| `/t/[slug]/settings` | Tenant branding | Tenant admin only |
| `/super-admin/*` | Platform management | super_admin role only |
| `/sign-in`, `/sign-up` | Public auth pages | Public |

**All auth is enforced by `src/middleware.ts`. Never add auth logic to pages.**

---

## Board Layout

```
+--[DashboardLayout: sticky z-50 header]--[TenantLogo]--[GearIcon?]--[DarkToggle]--[UserButton]--+
|                                                                                                  |
| [Sidebar 224px]    |  [Search bar]                                                              |
| VIEWS              |  +----------+----------+----------+                                        |
| 📋 All Tasks  (n)  |  | Client   | Client   | Client   |  ← CSS grid                           |
| ○  To Do      (n)  |  |  Card    |  Card    |  Card    |    1col / md:2col / xl:3col            |
| 🕐 Pending    (n)  |  +----------+----------+----------+                                        |
| ✓  Done       (n)  |                                                                             |
|                    |                                                                             |
| [+ Add Client]     |                                                                             |
```

- **Mobile:** Sidebar collapses to horizontal filter pill strip above cards.
- **Gear icon** in top nav: only shown to tenant admins (`membership.tenantRole === "admin"`) or impersonators.
- **Card header:** `bg-slate-50/50 dark:bg-slate-800/50` band, themeColor avatar, client name, optional invoice button.
- **Tasks:** Click opens `TaskEditModal`. Resource chips render below task title.

---

## State Management Rules

- **Filter state:** URL query param `?filter=todo|pending|done`. BoardApp reads on mount, syncs on change via `history.replaceState`. Sidebar buttons call `onFilterChange`.
- **Search state:** URL query param `?q=searchterm`. Same sync pattern.
- **No Redux/Zustand/Context** for board state — it all lives in URL + Convex `useQuery`.
- **Optimistic UI:** `updateStatus` mutation in `TaskEditModal` uses `.withOptimisticUpdate()` to update `getBoard` query cache instantly.

---

## Design System (See `design.md` for Full Spec)

- **Font:** Inter, `tracking-tight font-bold` for headings
- **Brand:** `#635bff` (light) / `#7a73ff` (dark) — blurple
- **Page bg:** `bg-slate-50` / `dark:bg-[#0a0e17]`
- **Card bg:** `bg-white` / `dark:bg-[#1e293b]`
- **Sidebar bg:** `bg-[#f7f9fc]` / `dark:bg-[#111827]`
- **Borders:** `border-slate-200` / `dark:border-slate-800`
- **Status:** Todo=`slate-400`, Pending=`amber-400`, Done=`emerald-400`
- **Shadows:** `stripe-shadow` / `dark:stripe-shadow-dark` (defined in `global.css` via `@utility`)
- **themeColor:** Hex string on client records. Apply ONLY via `style={{ backgroundColor: hex }}`.

---

## Stripe

- **DO NOT** write custom Stripe webhook handlers in Astro API routes.
- `@convex-dev/stripe` handles webhook routing.
- Webhook endpoint: `https://artful-marten-729.convex.site/stripe/webhook` (set in Stripe Dashboard).
- Required Stripe webhook events: `checkout.session.completed`, `customer.*`, `invoice.*`, `payment_intent.*`.
- `invoice.paid` flow: Stripe → Convex HTTP → `handleInvoicePaid` → find client by `stripeCustomerId` → insert invoice record → mark pending tasks done.
- `createInvoice` action in `convex/stripe.ts`: raw fetch to Stripe API (invoice item → invoice → finalize). Requires `STRIPE_SECRET_KEY` in Convex Dashboard env.
- Convex env vars (in **Convex Dashboard**, not `.env.local`): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

---

## Email

- Trigger: `updateStatus` mutation schedules `internal.emails.sendPendingNotification` when status → `"pending"`.
- Lookup chain: `task.createdBy` (clerkId) → `users` table → `user.email` → Resend API.
- Resend env vars in `.env.local`: `RESEND_API`, `RESEND_FROM_EMAIL`.

---

## Current Sprint

Sprint 2 complete. See `prompt-instructions.md` for full task list. All 6 tasks shipped.

---

## Known Gotchas

1. **React version pinning:** `react` and `react-dom` MUST be the same version. Currently `19.2.5`. Bun can resolve them to different patch versions — always pin explicitly.
2. **`@astrojs/internal-helpers`:** Must be `0.8.0` (upgraded manually). `@astrojs/react@5.0.3` breaks with `0.7.x`.
3. **Vite dep cache:** After installing new packages, clear `.astro/` and `node_modules/.vite/` and restart the dev server to avoid `504 Outdated Optimize Dep` errors.
4. **`bunx convex dev`:** Must be run after any schema change to regenerate `convex/_generated/`. The `components` object (for Stripe) only appears in generated types after this run.
5. **Path alias `@lib/*`:** Points to `src/lib/`. Added in `tsconfig.json`. Use `import { convex } from "@lib/convex"` in React components.
6. **Tailwind v4 `@ts-ignore`:** The `tailwindcss()` Vite plugin has a type mismatch with Astro's internal Vite version. Suppressed with `// @ts-ignore` in `astro.config.mjs`. This is cosmetic — it works at runtime.
7. **Dark mode toggle:** Use event delegation on `document` (not `astro:page-load`). `astro:page-load` has timing race on first load — module script may execute after event fires. Delegation pattern: `document.addEventListener('click', e => { if (e.target.closest('#theme-toggle')) { ... } })`.
8. **Clerk UserButton in Astro layouts:** Use `import { UserButton } from "@clerk/astro/components"` directly — NOT a React island. The `UserButtonIsland.tsx` file is now unused/dead code.
9. **TenantSettingsIsland:** Standalone island (outside BoardApp's ConvexProvider) — wraps its own `<ConvexProvider client={convex}>`. Calls `api.tenants.updateTenant` directly via `useMutation`. The HTTP API endpoint `/api/super-admin/tenants/update` requires `platformRole === "super_admin"` and cannot be used by tenant admins.
