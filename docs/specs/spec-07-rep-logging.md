# Spec 07 — Rep Logging (`/coach/log/[eventId]`)

**Phase:** D (Logging)
**Depends on:** spec-01 (schema — `reps_log`, `player_reps_log`, `players`), spec-03 (CoachLayout), spec-05 (practice plan view, for context)
**Blocks:** Nothing

---

## Primitive 1: Self-Contained Problem Statement

During or after practice, a coach navigates to `/coach/log/[eventId]` to record
how many reps were completed at their station for each drill. Optionally, they
can log reps per individual player.

The page shows only the drills from the coach's assigned station for this event.
The coach enters a rep count per drill, optionally adds notes, and submits. The
submission creates a `reps_log` record in Convex. Per-player logging is optional
and creates `player_reps_log` records.

If the coach has already submitted reps for a drill, the existing entry is shown
and can be updated (upsert behavior).

---

## Primitive 2: Acceptance Criteria

### Page Rendering
- ✅ Route: `src/pages/coach/log/[eventId].astro`
- ✅ `[eventId]` is the Convex `events` document `_id`
- ✅ Fetches event, practice plan, coach assignment, and existing rep logs
- ✅ If event not found or not published: "Event not found." with back link
- ✅ If no practice plan: "No practice plan for this event." with back link
- ✅ If coach has no assignment: shows all drills (no filter)
- ✅ Drills filtered to coach's station (same logic as spec-05)
- ✅ Each drill shows: name, section, duration, target reps (calculated)
- ✅ Each drill has a number input for `totalRepsCompleted`
- ✅ Input pre-populated if existing `reps_log` entry found for this coach + event + drill
- ✅ Optional notes textarea per drill
- ✅ Uses `CoachLayout` with `currentTab="log"`
- ✅ Renders at 375px with no horizontal scroll

### Per-Player Logging (Optional Section)
- ✅ Below each drill's rep input: expandable section "Log per player" (`<details>`)
- ✅ Inside: dropdown to select a player from the `players` table filtered by coach's age group
- ✅ Number input for reps per player
- ✅ "Add player" button adds another player row (client-side JS, adds another select + input)
- ✅ Per-player rows included in the same POST form

### Form Submission
- ✅ Form uses `method="POST"`
- ✅ On POST: for each drill with a non-empty `totalRepsCompleted` value, upsert a `reps_log` record
- ✅ For each player row with valid playerId + repsCompleted: insert a `player_reps_log` record
- ✅ After successful POST: redirect to `/coach/practice/[eventId]` (PRG pattern)
- ✅ Zero TypeScript `any` types
- ❌ DENY: Client-side Convex mutations
- ❌ DENY: Showing or modifying other coaches' logs
- ❌ DENY: Deleting existing log entries (out of scope — upsert only)

---

## Primitive 3: Constraint Architecture

**MUST:**
- POST handler runs in Astro frontmatter (`if (Astro.request.method === "POST")`)
- Upsert logic for `reps_log`: query for existing record matching `eventId + clerkId + drillId`, patch if found, insert if not
- `loggedAt` = `Date.now()` on every submit (update timestamp)
- Validate that `totalRepsCompleted` is a positive integer before inserting
- Fetch players filtered by `ageGroup` matching coach's assigned age group (or all players if no age group assignment)
- Form field naming convention:
  - `reps_[drillId]` for total reps per drill
  - `notes_[drillId]` for notes per drill
  - `player_drillId_[drillId]_[index]` and `player_reps_[drillId]_[index]` for per-player rows

**MUST NOT:**
- Allow negative or zero reps to be submitted
- Allow submission for drills not in the coach's station (server-side validation)
- Modify the `reps_log` of another coach

**PREFERENCE:**
- Number inputs: `type="number" min="0" step="1"` with `inputmode="numeric"` for mobile keyboard
- Large tap targets: `min-h-11` on all inputs and buttons
- Submit button: `w-full bg-green-600 text-white py-3 rounded-xl font-bold text-base`
- "Already logged" indicator: green checkmark badge on drill card if `reps_log` entry exists

**ESCALATION TRIGGER:**
- If `convex/repsLog.ts` does not exist, create it with `upsertStationLog` mutation and `getMyLogsForEvent` query as part of this spec
- If `convex/players.ts` does not exist, create it with `listPlayersByAgeGroup` query

---

## Primitive 4: Task Decomposition

1. **Create `convex/repsLog.ts`**
   - `getMyLogsForEvent(args: { eventId: Id<"events">; clerkId: string })` → returns all `reps_log` docs for this coach+event
   - `upsertStationLog(args: { eventId, clerkId, drillId, station, ageGroup?, totalRepsCompleted, notes? })` → upsert
   - `logPlayerReps(args: { eventId, clerkId, playerId, drillId, station, repsCompleted })` → insert

2. **Create `convex/players.ts`**
   - `listPlayersByAgeGroup(args: { ageGroup?: "U6" | "U8" | "U12" | "U14" })` → returns active players filtered by age group (or all if omitted)
   - `listAllPlayers(args: {})` → returns all players (for admin use in spec-09)

3. **Create `src/pages/coach/log/[eventId].astro`**
   - Frontmatter: auth, params, Convex queries (event, plan, assignment, existing logs, players), POST handler
   - Template: drill cards with rep inputs, per-player expansion, submit button

4. **Run verification** — `bun run build && bunx tsc --noEmit`

---

## Primitive 5: Evaluation Design

| Check | Method | Expected |
|-------|--------|----------|
| Build passes | `bun run build` | Exit 0 |
| TypeScript | `bunx tsc --noEmit` | Exit 0 |
| Renders at 375px | Mobile viewport | Vertical form, no horizontal scroll |
| Drills filtered | Coach with offense/U12 assignment | Only stretch, warmup, offense/U12 drills |
| Input pre-population | Coach with existing log | Input shows previous rep count |
| Submit logs reps | Fill in rep count, submit | `reps_log` record created in Convex |
| Redirect after submit | Successful POST | Redirects to `/coach/practice/[eventId]` |
| Per-player section | Open `<details>` | Player select + reps input visible |
| Player dropdown | Players in correct age group | Only U12 players if coach is U12 |
| Zero reps rejected | Submit with 0 reps | Validation error or field ignored |
| Upsert behavior | Submit twice for same drill | Only one `reps_log` record per coach+event+drill |

---

## New Convex Functions Reference

```typescript
// convex/repsLog.ts

export const getMyLogsForEvent = query({
  args: { eventId: v.id("events"), clerkId: v.string() },
  handler: async (ctx, { eventId, clerkId }) => {
    return await ctx.db
      .query("reps_log")
      .withIndex("by_event_clerk", (q) =>
        q.eq("eventId", eventId).eq("clerkId", clerkId)
      )
      .collect();
  },
});

export const upsertStationLog = mutation({
  args: {
    eventId: v.id("events"),
    clerkId: v.string(),
    drillId: v.id("drills"),
    station: sectionValidator,
    ageGroup: v.optional(ageGroupValidator),
    totalRepsCompleted: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("reps_log")
      .withIndex("by_event_clerk", (q) =>
        q.eq("eventId", args.eventId).eq("clerkId", args.clerkId)
      )
      .filter((q) => q.eq(q.field("drillId"), args.drillId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        totalRepsCompleted: args.totalRepsCompleted,
        notes: args.notes,
        loggedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("reps_log", { ...args, loggedAt: Date.now() });
  },
});
```
