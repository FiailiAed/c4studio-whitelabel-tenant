# Project Structure
| App
    | Organization One
        | League One
            | Town 1
                | Team 1
                | Team 2
                | Team N
            | Town 2
                | Team 1
                | Team 2
                | Team N
            | Town N
                | Team 1
                | Team 2
                | Team N
        | League Two
            | Town 1
                | Team 1
                | Team 2
                | Team N
            | Town 2
                | Team 1
                | Team 2
                | Team N
            | Town N
                | Team 1
                | Team 2
                | Team N

## Known Tenants
Cherry Hill
Cinnaminson
Clearview
Delran
Gloucester Twp
Haddon Twp
Haddonfield
Kingsway
Mainland
Marlton
Medford
Monroe
Moorestown
Mount Laurel
Northern Burlington
Rancocas Valley
Seneca
Tarkill
Voorhees
Washington Twp
West Deptford
Woodstown

# Project Tree (proposed)
├──.cursorrules             # The "Vibe Coding" protocol for Lacrosse-specific mechanics
├── bun.lockb                # Speed is a feature. Bun is the only runtime.
├── package.json             # Astro SSR + Convex + Clerk + Stripe (Inbound only) + Resend
├── astro.config.mjs         # Vercel adapter + Tailwind + Clerk integrations
├── tailwind.config.ts       # High-density theme (Ping.gg/Image 4 layout specs)
│
├── convex/                  # THE REACTIVE CORE (The Graph)
│   ├── _generated/          # Generated Types
│   ├── schema.ts            # SOURCE OF TRUTH (Leagues, Crews, Fields, Documents)
│   ├── auth.config.ts       # Clerk -> Convex Multi-tenant Auth
│   │
│   ├── scheduling/          # NEW: Schedule Building Engine
│   │   ├── roundRobin.ts    # Logic for circular rotation matchups
│   │   ├── oneOff.ts        # Single game assignment & conflict logic 
│   │   └── constraints.ts   # Crew size validation (2-man vs 3-man)
│   │
│   ├── compliance/          # NEW: Manual USAL Verification Flow
│   │   ├── documents.ts     # Metadata for uploaded USAL cards (Image 7 pattern)
│   │   └── verification.ts  # Admin mutations to "Verify" and toggle eligibility
│   │
│   ├── ledger/              # NEW: Cash Payout Tracking
│   │   ├── payouts.ts       # Records of cash-in-hand transactions for referees
│   │   └── debt.ts          # Reactive queries for "Total Owed to Officials"
│   │
│   ├── mutations/           # ACID State Changes
│   │   ├── registration.ts  # Program signup + Stripe fee collection (inbound) 
│   │   └── resources.ts     # Field/Venue reservation locking 
│   │
│   └── queries/             # Reactive Subscriptions
│       ├── dashboard.ts     # High-density counts for Sidebar (Image 5)
│       ├── officials.ts     # Availability & Haversine distance scoring 
│       └── sitemap.ts       # Venue markings (GLE, Arc, Restraining Line)
│
├── src/                     # THE INTERFACE (Astro SSR)
│   ├── components/
│   │   ├── dashboard/       # High-Density UI Modules
│   │   │   ├── Sidebar.tsx         # Org switcher + reactive counters (Image 5)
│   │   │   ├── ScheduleBuilder.tsx # Drag-and-drop Round Robin generator
│   │   │   └── CashLedger.tsx      # Table for tracking manual payments
│   │   │
│   │   ├── compliance/      # Manual Verification (Image 7 pattern)
│   │   │   ├── USALUploader.tsx    # UploadThing integration for membership cards
│   │   │   └── AdminVerifyGrid.tsx # Batch-verification interface for admins
│   │   │
│   │   └── shared/          # Base T3 Primitives (Tailwind only)
│   │       ├── Button.tsx
│   │       └── DataTable.tsx       # Reusable high-density grids
│   │
│   ├── layouts/
│   │   ├── DashboardLayout.astro   # Persistent sidebar shell (Image 4)
│   │   └── RootLayout.astro        # Standard SEO/Font/Clerk wrapper
│   │
│   ├── lib/                 # Typesafe Logic
│   │   ├── stripe.ts        # Inbound payment processing (Fees/Registration)
│   │   ├── uploadthing.ts   # Edge storage for USAL verification documents
│   │   └── schedule_utils.ts # Round-robin math helpers (One-factorization)
│   │
│   ├── middleware.ts        # Clerk Multi-tenant org isolation 
│   │
│   └── pages/               # SSR Route Handlers
│       ├── index.astro             # High-performance landing
│       ├── select-org.astro        # Multi-tenant routing
│       └── / /           # WORKSPACE (The Ping.gg Experience)
│           ├── schedule/           # Builder (Round Robin + One-off)
│           │   ├── builder.astro
│           │   └── index.astro
│           ├── officials/          # Assigning & Cash Ledger
│           ├── compliance/         # USAL Upload/Manual Verification
│           └── documents/          # Waivers & Resources
│
├── public/                  # Static Assets
└── tsconfig.json            # Strict Typesafety (Non-negotiable)
