# C4 Studio — Whitelabel Multi-Tenant Platform

A production-ready SaaS scaffold for deploying whitelabel tenant portals. Built for NJ youth lacrosse organizations (school districts as tenants), this platform provides full multi-tenancy with per-tenant branding, role-based access control, and a super-admin control plane.

> **Status:** Core scaffold complete. Stripe, Resend, and UploadThing are configured in the environment but not yet wired into the application logic.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Runtime | [Bun](https://bun.sh) | Latest |
| Framework | [Astro](https://astro.build) (SSR) | 5.x |
| Database / Backend | [Convex](https://convex.dev) | 1.32.x |
| Authentication | [Clerk](https://clerk.com) (`@clerk/astro`) | 2.x |
| Styling | [Tailwind CSS](https://tailwindcss.com) v4 | 4.x |
| Payments | [Stripe](https://stripe.com) | Configured |
| Email | [Resend](https://resend.com) | Configured |
| File Storage | [UploadThing](https://uploadthing.com) | Configured |
| Deployment | [Vercel](https://vercel.com) | — |
| Analytics | Vercel Analytics + Speed Insights | 2.x |
| Webhook Verification | [Svix](https://svix.com) | 1.x |
| Language | TypeScript (strict mode) | 5.x |

---

## Architecture Overview

### Multi-Tenancy Model

Tenants are accessed via URL slug: `/t/[slug]/`. Each tenant has its own:
- Isolated data context (enforced in middleware)
- Custom branding (name, logo URL, primary color injected as CSS variable)
- Member roster with roles

There is no subdomain routing. All tenant routes share the same domain under `/t/`.

### Role System (Two-Tier)

**Platform Roles** (stored in `users.platformRole`):
- `super_admin` — Full platform access, can manage all tenants and users, can impersonate tenants
- `user` — Standard user, can only access tenants they are a member of

**Tenant Roles** (stored in `tenant_members.tenantRole`, free string):
- `admin` — Can manage tenant members and branding settings
- `member` — Read access to tenant workspace
- Any custom string is valid — no enum enforcement at the DB level

### Data Flow

```
Browser → Astro SSR (Vercel Edge) → Convex HTTP Client → Convex Backend
                ↑
          Clerk Middleware (auth)
          src/middleware.ts (authz + tenant isolation)
```

All database reads/writes go through Convex using `ConvexHttpClient` in Astro pages and API routes. There is no direct database connection — Convex is the sole backend.

---

## Project Structure

```
/
├── convex/                         # Convex backend (schema + functions)
│   ├── schema.ts                   # Source of truth for all DB tables
│   ├── tenants.ts                  # Tenant queries & mutations
│   ├── users.ts                    # User queries & mutations
│   ├── tenantMembers.ts            # Membership queries & mutations
│   └── _generated/                 # Auto-generated Convex types (do not edit)
│
├── src/
│   ├── middleware.ts               # Auth enforcement + tenant isolation + impersonation
│   ├── env.d.ts                    # Astro.locals type definitions
│   │
│   ├── styles/
│   │   └── global.css             # Single line: @import "tailwindcss"
│   │
│   ├── components/
│   │   ├── Breadcrumb.astro        # Breadcrumb nav with animated active state
│   │   └── SiteBanner.astro        # Promotional banner with gradient
│   │
│   ├── layouts/
│   │   ├── Layout.astro            # Base wrapper (Vercel analytics + Speed Insights)
│   │   ├── TenantLayout.astro      # Tenant portal shell (branding, bottom nav, impersonation banner)
│   │   └── SuperAdminLayout.astro  # Platform admin shell (3-tab nav: Analytics/Tenants/Users)
│   │
│   └── pages/
│       ├── index.astro             # Public homepage + tenant selector for logged-in users
│       ├── sign-in.astro           # Clerk SignIn component
│       ├── sign-up.astro           # Clerk SignUp component
│       ├── profile.astro           # User profile + list of tenant memberships
│       │
│       ├── t/[slug]/               # Tenant workspace (requires active membership)
│       │   ├── index.astro         # Tenant dashboard
│       │   ├── members/
│       │   │   └── index.astro     # Member management (tenant admin only)
│       │   └── settings/
│       │       └── index.astro     # Branding settings — logo, color (tenant admin only)
│       │
│       ├── super-admin/            # Platform control plane (super_admin only)
│       │   ├── index.astro         # Platform analytics dashboard
│       │   ├── tenants/
│       │   │   ├── index.astro     # All tenants list
│       │   │   ├── new.astro       # Create tenant form
│       │   │   └── [id].astro      # Tenant detail: edit, members, impersonate
│       │   └── users/
│       │       └── index.astro     # All platform users + role toggle
│       │
│       └── api/
│           ├── webhooks/
│           │   └── clerk.ts        # Clerk webhook: user.created/updated/deleted → Convex sync
│           └── super-admin/
│               ├── tenants/
│               │   ├── create.ts   # POST: Create tenant
│               │   ├── update.ts   # POST: Update tenant fields
│               │   └── delete.ts   # POST: Delete tenant (cascades members)
│               ├── members/
│               │   ├── add.ts      # POST: Add user to tenant
│               │   ├── remove.ts   # POST: Remove user from tenant
│               │   └── update-role.ts  # POST: Change tenantRole or status
│               ├── users/
│               │   └── update-role.ts  # POST: Toggle platformRole (super_admin ↔ user)
│               └── impersonation/
│                   ├── start.ts    # POST: Set HMAC-signed impersonation cookie
│                   └── exit.ts     # POST: Clear impersonation cookie
│
├── public/                         # Static assets (favicon, robots.txt)
├── astro.config.mjs                # Astro config: SSR, Vercel adapter, Clerk, Tailwind
├── tsconfig.json                   # Strict TypeScript + path aliases
└── package.json
```

---

## Database Schema

All tables defined in `convex/schema.ts`. Convex generates fully typed API from this file.

### `tenants`

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Display name of the tenant organization |
| `slug` | `string` | URL identifier — lowercase letters, numbers, hyphens only |
| `customDomain` | `string?` | Optional custom domain (not routing-enforced yet) |
| `logoUrl` | `string?` | URL for tenant logo image |
| `primaryColor` | `string?` | Hex color code for tenant branding (`--color-primary` CSS var) |
| `status` | `"active" \| "inactive"` | Inactive tenants block all access at middleware level |
| `createdAt` | `number` | Unix timestamp |
| `updatedAt` | `number` | Unix timestamp |

**Indexes:** `by_slug` (unique lookup), `by_custom_domain`

### `users`

| Field | Type | Description |
|---|---|---|
| `clerkId` | `string` | Clerk user ID — primary external key |
| `email` | `string` | User's email address |
| `firstName` | `string?` | First name (synced from Clerk) |
| `lastName` | `string?` | Last name (synced from Clerk) |
| `platformRole` | `"super_admin" \| "user"` | Platform-wide role |
| `createdAt` | `number` | Unix timestamp |
| `updatedAt` | `number` | Unix timestamp |

**Indexes:** `by_clerk_id`

### `tenant_members`

| Field | Type | Description |
|---|---|---|
| `tenantId` | `Id<"tenants">` | Foreign key to tenants table |
| `clerkId` | `string` | Clerk user ID of the member |
| `tenantRole` | `string` | Free-form role string (e.g., `"admin"`, `"member"`) |
| `status` | `"active" \| "inactive" \| "invited"` | Only `active` grants access |
| `createdAt` | `number` | Unix timestamp |
| `updatedAt` | `number` | Unix timestamp |

**Indexes:** `by_tenant`, `by_clerk_id`, `by_tenant_and_clerk` (composite — used for membership lookup)

---

## Authentication Flow

Authentication is handled entirely by Clerk. The flow is:

1. User signs up or signs in via `/sign-in` or `/sign-up` (Clerk hosted UI components)
2. Clerk fires a webhook to `/api/webhooks/clerk` on `user.created`, `user.updated`, or `user.deleted`
3. The webhook handler (verified via Svix) upserts the user record into the Convex `users` table
4. On every authenticated request, `src/middleware.ts` reads `Astro.locals.auth()` from Clerk
5. **Fallback:** If the Clerk webhook hasn't fired yet (race condition), the middleware auto-creates the Convex user record on the first authenticated page load

### Locals Set by Middleware

These are available as `Astro.locals.*` in all protected pages:

```typescript
platformUser    // Full user record from Convex (users table)
tenant          // Tenant record (on /t/[slug]/* routes)
tenantId        // Convex Id<"tenants"> (on /t/[slug]/* routes)
membership      // tenant_members record for current user (on /t/[slug]/* routes)
isImpersonating // boolean — true if super_admin is using impersonation
```

---

## Routing & Access Control

| Route Pattern | Auth Required | Role Required | Tenant Membership Required |
|---|---|---|---|
| `/` | No | — | — |
| `/sign-in`, `/sign-up` | No | — | — |
| `/api/webhooks/clerk` | No (Svix verified) | — | — |
| `/profile` | Yes | — | — |
| `/t/[slug]/*` | Yes | — | Active member of that tenant |
| `/t/[slug]/members/*` | Yes | `tenantRole: "admin"` | Yes |
| `/t/[slug]/settings/*` | Yes | `tenantRole: "admin"` | Yes |
| `/super-admin/*` | Yes | `platformRole: "super_admin"` | — |
| `/api/super-admin/*` | Yes | `super_admin` or tenant admin | Varies per endpoint |

Access control is enforced in `src/middleware.ts` before any page handler runs. Unauthorized requests redirect to `/` or `/sign-in`.

---

## Middleware Logic

`src/middleware.ts` wraps Clerk's middleware and adds application-level authorization:

```
Request arrives
  ↓
clerkMiddleware() — validates Clerk session
  ↓
Is route /t/[slug]/*?
  → Get tenant by slug from Convex
  → Tenant must exist and be "active"
  → Check for impersonation cookie (super_admin bypass)
  → Otherwise: verify user has active membership in this tenant
  → Check tenantRole for admin-only sub-routes (/members, /settings)
  → Set locals: tenant, tenantId, membership, isImpersonating
  ↓
Is route /super-admin/*?
  → User must have platformRole === "super_admin"
  ↓
Is route /profile?
  → User must be authenticated
  ↓
Proceed to page handler
```

---

## Super Admin Features

All features at `/super-admin/*` require `platformRole === "super_admin"`.

### Platform Dashboard (`/super-admin/`)
Real-time analytics: total tenants, total users, active members count.

### Tenant Management (`/super-admin/tenants/`)
- List all tenants with status, member count, and slug
- Create new tenants (name + slug required; slug validated: `^[a-z0-9-]+$`)
- Edit tenant: name, slug, status, primary color, logo URL, custom domain
- Delete tenant (cascades: removes all `tenant_members` records)

### User Management (`/super-admin/users/`)
- List all platform users with their current `platformRole`
- Toggle any user between `super_admin` and `user`

### Impersonation System

Super admins can enter any tenant portal as if they were a tenant admin, without needing actual membership.

**How it works:**
1. Super admin clicks "Impersonate" on `/super-admin/tenants/[id]`
2. POST to `/api/super-admin/impersonation/start` creates an HMAC-SHA256 signed cookie:
   - Payload: `${tenantId}:${timestamp}`
   - Signed with `IMPERSONATION_SECRET` environment variable
   - Cookie expires in 3600 seconds (1 hour)
   - Cookie is `HttpOnly`, `Secure`, `SameSite=Lax`
3. Middleware on `/t/[slug]/*` detects the cookie, verifies the HMAC signature and timestamp
4. If valid: grants access as `tenantRole: "admin"`, sets `isImpersonating: true`
5. `TenantLayout.astro` shows a yellow banner: "You are impersonating this tenant"
6. Exit via POST to `/api/super-admin/impersonation/exit` — clears cookie, redirects to super-admin

---

## Tenant Features

### Tenant Dashboard (`/t/[slug]/`)
Tenant home page. Shows tenant name and branding. All members can access.

### Member Management (`/t/[slug]/members/`)
Tenant admin only. View all members with their roles and status. Add new members by Clerk ID, change roles, toggle active/inactive, remove members.

### Branding Settings (`/t/[slug]/settings/`)
Tenant admin only. Set:
- **Logo URL** — displayed in `TenantLayout.astro` header
- **Primary Color** — stored as hex, injected as `--color-primary` CSS variable in `<head>`. A computed hover variant (`--color-primary-hover`) is also injected at 10% darker.

---

## API Endpoints Reference

All API routes return JSON. Auth failures return `401`. Permission failures return `403`.

### Webhooks

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/webhooks/clerk` | Svix signature | Sync Clerk user events to Convex |

### Tenant Management (super_admin only)

| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/api/super-admin/tenants/create` | `{ name, slug, primaryColor?, logoUrl?, customDomain?, status? }` | Create tenant |
| POST | `/api/super-admin/tenants/update` | `{ id, name?, slug?, primaryColor?, logoUrl?, customDomain?, status? }` | Update tenant |
| POST | `/api/super-admin/tenants/delete` | `{ id }` | Delete tenant + all members |

### Member Management (super_admin OR tenant admin OR impersonating)

| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/api/super-admin/members/add` | `{ tenantId, clerkId, tenantRole }` | Add member to tenant |
| POST | `/api/super-admin/members/remove` | `{ tenantId, clerkId }` | Remove member from tenant |
| POST | `/api/super-admin/members/update-role` | `{ tenantId, clerkId, tenantRole?, status? }` | Change role or status |

### User Management (super_admin only)

| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/api/super-admin/users/update-role` | `{ clerkId, platformRole }` | Set platform role |

### Impersonation (super_admin only)

| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/api/super-admin/impersonation/start` | `{ tenantId }` | Set signed impersonation cookie, redirect to tenant |
| POST | `/api/super-admin/impersonation/exit` | — | Clear cookie, redirect to super-admin |

---

## Environment Variables

Copy `.env.local` and fill in your values. Variables prefixed with `PUBLIC_` or `VITE_` are exposed to the client.

### Required

```bash
# Convex
PUBLIC_CONVEX_URL=          # Convex deployment URL (e.g. https://artful-marten-729.convex.cloud)
CONVEX_DEPLOYMENT=          # Convex deployment identifier (e.g. dev:artful-marten-729)

# Clerk
PUBLIC_CLERK_PUBLISHABLE_KEY=   # Clerk publishable key (pk_test_... or pk_live_...)
CLERK_SECRET_KEY=               # Clerk secret key (sk_test_... or sk_live_...)
CLERK_WEBHOOK_SECRET=           # Svix webhook signing secret (whsec_...)

# Impersonation
IMPERSONATION_SECRET=           # Random secret for HMAC-SHA256 cookie signing (generate with: openssl rand -hex 32)
```

### Optional (configured, implementation pending)

```bash
# Stripe
STRIPE_PUBLISHABLE_KEY=         # Stripe publishable key
STRIPE_SECRET_KEY=              # Stripe secret key
STRIPE_WEBHOOK_SECRET=          # Stripe webhook signing secret

# Resend
RESEND_API=                     # Resend API key
RESEND_FROM_EMAIL=              # Verified sender email address

# UploadThing
UPLOADTHING_TOKEN=              # UploadThing API token (base64 encoded)

# Vercel (auto-set by Vercel, used in astro.config.mjs for site URL)
VERCEL_URL=                     # Set automatically in Vercel deployments
```

---

## Local Development Setup

### Prerequisites
- [Bun](https://bun.sh) installed
- [Convex CLI](https://docs.convex.dev/cli) (`bun add -g convex`)
- Clerk account and application configured
- Convex account and project created

### Steps

1. **Clone and install dependencies**
   ```bash
   git clone <repo-url>
   cd c4studio-whitelabel-tenant
   bun install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local   # if example exists, otherwise create .env.local
   # Fill in all Required variables listed above
   ```

3. **Start the Convex development server**
   ```bash
   bunx convex dev
   ```
   This watches `convex/` for changes, pushes schema and functions, and keeps `convex/_generated/` up to date. Keep this running in a separate terminal.

4. **Start the Astro development server**
   ```bash
   bun dev
   ```
   App runs at `http://localhost:4321`

5. **Configure Clerk webhooks (local)**
   Use [ngrok](https://ngrok.com) or the [Clerk CLI](https://clerk.com/docs/webhooks/overview) to forward Clerk webhook events to `http://localhost:4321/api/webhooks/clerk`.
   Required events: `user.created`, `user.updated`, `user.deleted`

### Available Commands

| Command | Action |
|---|---|
| `bun dev` | Start local dev server at `localhost:4321` |
| `bun build` | Type-check + build production site to `./dist/` |
| `bun preview` | Preview the production build locally |
| `bunx convex dev` | Start Convex dev backend (watch mode) |
| `bunx convex deploy` | Deploy Convex functions to production |

---

## Deployment

This project deploys to Vercel with Astro's Vercel adapter (`@astrojs/vercel`).

### Vercel Setup

1. Connect the GitHub repo to a new Vercel project
2. Set **Framework Preset** to `Astro`
3. Set **Install Command** to `bun install`
4. Set **Build Command** to `bun run build`
5. Add all **Required** environment variables in Vercel's dashboard (Settings > Environment Variables)

### Convex Production Deployment

```bash
bunx convex deploy
```

This deploys Convex schema and functions to your production Convex deployment. Set `CONVEX_DEPLOYMENT` in Vercel to the production deployment ID.

### Clerk Webhook (Production)

In the Clerk dashboard, create a webhook endpoint pointing to:
```
https://your-production-domain.com/api/webhooks/clerk
```

Subscribe to: `user.created`, `user.updated`, `user.deleted`
Copy the signing secret into `CLERK_WEBHOOK_SECRET`.

---

## Conventions & Coding Rules

These rules are non-negotiable in this codebase:

1. **TypeScript strict everywhere.** No `any`, no type assertions without justification. Convex generates types from `schema.ts` — use `Id<"tableName">` for all document references.

2. **Tailwind utilities only.** Never write custom CSS. If Tailwind can do it, use Tailwind. The only CSS file is `src/styles/global.css` which contains a single `@import "tailwindcss"` line.

3. **Bun is the only runtime.** Do not use `npm`, `npx`, or `yarn`. Always use `bun` and `bunx`.

4. **All data mutations go through Convex.** No direct database calls, no REST APIs to external databases. `ConvexHttpClient` is the only data access pattern.

5. **Form submission pattern:** HTML form → inline `<script>` intercepts submit → `fetch` POST to API route → API route calls Convex mutation → returns JSON → page reloads on success or shows error banner. No partial updates, no client-side state management library.

6. **Mobile-first layouts.** All layouts use fixed bottom navigation bars for mobile. Design with small screens first.

7. **Server-side auth only.** All access control happens in `src/middleware.ts` and API route handlers. Never trust client-provided role claims.

---

## Planned Integrations

These services are configured in the environment but have no implementation yet.

### Stripe (Payments)
- **Use case:** Inbound payment collection (registration fees, program signups)
- **Pattern:** Stripe Checkout → metadata on session → webhook on `checkout.session.completed` → Convex mutation
- **Where to add:**
  - `convex/mutations/registration.ts` — record payment in DB
  - `src/pages/api/webhooks/stripe.ts` — webhook handler
  - `src/lib/stripe.ts` — Stripe client initialization

### Resend (Email)
- **Use case:** Welcome emails, notifications, invitations
- **Where to add:**
  - `src/lib/resend.ts` — Resend client
  - Call from relevant API routes or Convex actions

### UploadThing (File Storage)
- **Use case:** USAL compliance card uploads, document storage
- **Where to add:**
  - `src/lib/uploadthing.ts` — UploadThing client
  - Upload component in tenant compliance pages (future)

---

## Future Expansion: Organizational Hierarchy

The platform is designed to support a nested organizational structure. The current scaffold implements the top two levels (App and Tenant/Organization). The full planned hierarchy is:

```
Platform (App)
└── Organization (Tenant / School District)
    └── League (e.g., Boys Varsity, Girls JV)
        └── Town (geographic division)
            └── Team
```

**Known tenant organizations (NJ school districts):**
Cherry Hill, Cinnaminson, Clearview, Delran, Gloucester Twp, Haddon Twp, Haddonfield, Kingsway, Mainland, Marlton, Medford, Monroe, Moorestown, Mount Laurel, Northern Burlington, Rancocas Valley, Seneca, Tarkill, Voorhees, Washington Twp, West Deptford, Woodstown

Planned domain features (not yet implemented):
- **Scheduling engine** — round-robin game scheduling, crew assignment
- **Compliance tracking** — USAL card uploads, manual admin verification
- **Cash ledger** — tracking referee payouts
- **Officials management** — availability tracking, distance-based assignment scoring
