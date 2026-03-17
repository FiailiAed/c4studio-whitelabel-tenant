# Spec 01 — Schema Additions

**Phase:** A (Foundation)
**Depends on:** Nothing
**Blocks:** All other specs

---

## Primitive 1: Self-Contained Problem Statement

The current `convex/schema.ts` has no tables for players, RSVPs, or rep logging.
Three new tables must be added so coaches can (a) select players from a managed
roster, (b) RSVP to events, and (c) log rep counts at the station level and
optionally per-player.

Add exactly these four tables to `convex/schema.ts`:

1. `players` — admin-managed roster of youth lacrosse players
2. `event_rsvp` — coach RSVP to a specific event (confirmed/declined/maybe)
3. `reps_log` — station-level rep log entry per coach per event
4. `player_reps_log` — per-player rep log entry linked to a `reps_log` entry

---

## Primitive 2: Acceptance Criteria

- ✅ All four tables are added to `convex/schema.ts` with correct Convex validators
- ✅ `players` has fields: `name`, `jerseyNumber`, `ageGroup`, `isActive`, `createdAt`, `updatedAt`
- ✅ `players` has index `by_age_group` on `["ageGroup"]` and `by_active` on `["isActive"]`
- ✅ `event_rsvp` has fields: `eventId` (Id<"events">), `clerkId`, `status` (union), `updatedAt`
- ✅ `event_rsvp` has index `by_event` on `["eventId"]` and `by_clerk` on `["clerkId"]`, and compound `by_event_clerk` on `["eventId", "clerkId"]`
- ✅ `reps_log` has fields: `eventId`, `clerkId`, `drillId`, `station`, `ageGroup` (optional), `totalRepsCompleted`, `notes` (optional), `loggedAt`
- ✅ `reps_log` has index `by_event` on `["eventId"]` and `by_clerk` on `["clerkId"]` and `by_event_clerk` on `["eventId", "clerkId"]`
- ✅ `player_reps_log` has fields: `eventId`, `clerkId`, `playerId`, `drillId`, `station`, `repsCompleted`, `loggedAt`
- ✅ `player_reps_log` has index `by_event` on `["eventId"]` and `by_player` on `["playerId"]` and `by_event_clerk` on `["eventId", "clerkId"]`
- ✅ All Id fields use the correct `v.id("tableName")` validator
- ✅ `npx convex dev --once` exits 0 after the change
- ✅ `bun run build` exits 0
- ✅ `bunx tsc --noEmit` exits 0
- ❌ DENY: Any existing table is modified (this spec is additive only)
- ❌ DENY: Any existing index is removed or renamed
- ❌ DENY: `practiceAvailability` field in `onboarding` table is changed (that is spec-02)

---

## Primitive 3: Constraint Architecture

**MUST:**
- Use the existing `ageGroupValidator` and `sectionValidator` defined at the top of `schema.ts` — do NOT redefine them inline
- Use `v.union(v.literal("confirmed"), v.literal("declined"), v.literal("maybe"))` for RSVP status
- Use `v.number()` for all timestamp fields (`loggedAt`, `updatedAt`, `createdAt`)
- Use `v.id("events")`, `v.id("drills")`, `v.id("players")` for cross-table references
- Run `npx convex dev --once` immediately after saving `schema.ts`

**MUST NOT:**
- Modify any existing table definition
- Add any Convex query or mutation functions in this spec (functions come in later specs)
- Add fields beyond what is listed in the acceptance criteria
- Use `v.string()` for foreign keys — use `v.id("tableName")`

**PREFERENCE:**
- Follow the comment grouping style already in `schema.ts` (each table group preceded by a `// ─── Title ──` banner comment)

**ESCALATION TRIGGER:**
- If `npx convex dev --once` reports a type error on any of the new tables, fix the validator mismatch before continuing

---

## Primitive 4: Task Decomposition

1. **Open `convex/schema.ts`** — read the full current file
2. **Add `players` table** with fields and indexes per acceptance criteria
3. **Add `event_rsvp` table** with fields and indexes per acceptance criteria
4. **Add `reps_log` table** with fields and indexes per acceptance criteria
5. **Add `player_reps_log` table** with fields and indexes per acceptance criteria
6. **Run `npx convex dev --once`** — fix any validator errors
7. **Run `bun run build`** — fix any TypeScript errors
8. **Run `bunx tsc --noEmit`** — confirm zero type errors

---

## Primitive 5: Evaluation Design

| Check | Command | Expected |
|-------|---------|----------|
| Schema valid | `npx convex dev --once` | Exit 0, no errors |
| Build passes | `bun run build` | Exit 0 |
| TypeScript | `bunx tsc --noEmit` | Exit 0 |
| players table exists | Check `convex/_generated/dataModel.d.ts` | `players` appears in `DataModel` |
| event_rsvp table exists | Check `convex/_generated/dataModel.d.ts` | `event_rsvp` appears in `DataModel` |
| reps_log table exists | Check `convex/_generated/dataModel.d.ts` | `reps_log` appears in `DataModel` |
| player_reps_log exists | Check `convex/_generated/dataModel.d.ts` | `player_reps_log` appears in `DataModel` |

---

## Complete Field Definitions (Reference)

```typescript
// ─── Players ──────────────────────────────────────────────────────────────────
players: defineTable({
  name: v.string(),
  jerseyNumber: v.optional(v.number()),
  ageGroup: ageGroupValidator,
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_age_group", ["ageGroup"])
  .index("by_active", ["isActive"]),

// ─── Event RSVP ───────────────────────────────────────────────────────────────
event_rsvp: defineTable({
  eventId: v.id("events"),
  clerkId: v.string(),
  status: v.union(
    v.literal("confirmed"),
    v.literal("declined"),
    v.literal("maybe"),
  ),
  updatedAt: v.number(),
})
  .index("by_event", ["eventId"])
  .index("by_clerk", ["clerkId"])
  .index("by_event_clerk", ["eventId", "clerkId"]),

// ─── Reps Log (station-level) ─────────────────────────────────────────────────
reps_log: defineTable({
  eventId: v.id("events"),
  clerkId: v.string(),
  drillId: v.id("drills"),
  station: sectionValidator,
  ageGroup: v.optional(ageGroupValidator),
  totalRepsCompleted: v.number(),
  notes: v.optional(v.string()),
  loggedAt: v.number(),
})
  .index("by_event", ["eventId"])
  .index("by_clerk", ["clerkId"])
  .index("by_event_clerk", ["eventId", "clerkId"]),

// ─── Player Reps Log (per-player) ─────────────────────────────────────────────
player_reps_log: defineTable({
  eventId: v.id("events"),
  clerkId: v.string(),
  playerId: v.id("players"),
  drillId: v.id("drills"),
  station: sectionValidator,
  repsCompleted: v.number(),
  loggedAt: v.number(),
})
  .index("by_event", ["eventId"])
  .index("by_player", ["playerId"])
  .index("by_event_clerk", ["eventId", "clerkId"]),
```
