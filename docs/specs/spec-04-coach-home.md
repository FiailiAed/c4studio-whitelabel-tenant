# Spec 04 — Coach Home (`/coach`)

**Phase:** C (Core Views)
**Depends on:** spec-01 (schema), spec-03 (CoachLayout + middleware)
**Blocks:** Nothing

---

## Primitive 1: Self-Contained Problem Statement

A coach visits `/coach` after sign-in and sees:
1. The next upcoming **published** event with date, time, and location
2. Their station assignment for that event (station name + age group)
3. A call-to-action to view the practice plan for that event
4. An RSVP widget (confirmed / maybe / declined) for the event

If no assignment exists, show "Not yet assigned."
If no upcoming published events, show "No upcoming practices scheduled."
If the event has no practice plan, the CTA reads "Practice plan not yet available" and is non-clickable.

---

## Primitive 2: Acceptance Criteria

- ✅ Page is server-rendered via `ConvexHttpClient` — no client-side data fetching
- ✅ Shows only events where `published === true`
- ✅ Shows the single next upcoming event (closest future `date` timestamp, `date > Date.now()`)
- ✅ Event card shows: formatted date (e.g., "Saturday, March 7"), time (e.g., "6:00 PM"), location (or "Location TBD"), duration (e.g., "90 min")
- ✅ Assignment card shows station (display name, not raw enum) + age group ("All age groups" if null)
- ✅ If no assignment: card shows "Not yet assigned" with muted styling
- ✅ If event has an attached practice plan: "View Practice Plan" button links to `/coach/practice/[eventId]`
- ✅ If no practice plan: disabled/muted text "Practice plan not yet available"
- ✅ RSVP widget: 3 buttons (Confirmed / Maybe / Declined), current status highlighted
- ✅ RSVP button click submits a POST form (no client-side JS required)
- ✅ After RSVP POST: redirect back to `/coach` (PRG pattern)
- ✅ Zero TypeScript `any` types
- ✅ Page renders without errors when coach has no Convex user record (graceful fallback)
- ✅ Page renders without errors when no published events exist
- ❌ DENY: Page shows unpublished events
- ❌ DENY: Page shows past events
- ❌ DENY: RSVP uses client-side fetch or JavaScript mutation
- ❌ DENY: Page imports React

---

## Primitive 3: Constraint Architecture

**MUST:**
- Use `Astro.locals.auth()` to get `clerkId`; `userId` is guaranteed non-null by middleware
- Query published events via `api.events.listEvents`, filter client-side for `published === true && date > Date.now()`, sort ascending, take first
- Query staff assignment via `api.assignments.getAssignmentsForEvent` filtered to `clerkId`
- Query practice plan via `api.plans.getPlanForEvent` (returns `null` if no plan)
- Query RSVP status via `api.eventRsvp.getMyRsvp` (new function — see task decomposition)
- Handle RSVP POST via `Astro.request.method === "POST"` in frontmatter
- Use `CoachLayout` with `currentTab="home"`

**MUST NOT:**
- Display more than one event card on this screen
- Show the full practice plan — only a summary card with a link
- Show other coaches' assignments

**PREFERENCE:**
- Event card: white bg, rounded-2xl, shadow-sm, green accent border-l-4
- Assignment card: same card style, icon for station type
- RSVP buttons: pill buttons, `bg-green-100 text-green-800` for confirmed active state
- Section display map: `{ stretch: "Stretch", warmup: "Warm-Up", offense: "Offense", ground_balls: "Ground Balls", defense: "Defense", speed_series: "Speed Series", u6_practice: "U6 Practice" }`

**ESCALATION TRIGGER:**
- If `api.eventRsvp.getMyRsvp` does not yet exist, create the Convex query function as part of this spec

---

## Primitive 4: Task Decomposition

1. **New Convex query: `convex/eventRsvp.ts`**
   - `getMyRsvp(args: { eventId: Id<"events">; clerkId: string })` → returns RSVP doc or `null`
   - `upsertRsvp(args: { eventId: Id<"events">; clerkId: string; status: "confirmed" | "declined" | "maybe" })` → upserts event_rsvp record

2. **Astro page: `src/pages/coach/index.astro`**
   - Frontmatter: auth, Convex queries, POST handler for RSVP
   - Template: event card, assignment card, RSVP widget
   - Empty states for each data scenario

3. **TypeScript types** — define local interface for joined event+assignment+rsvp data

4. **Run verification** — `bun run build && bunx tsc --noEmit`

---

## Primitive 5: Evaluation Design

| Check | Method | Expected |
|-------|--------|----------|
| Build passes | `bun run build` | Exit 0 |
| TypeScript | `bunx tsc --noEmit` | Exit 0 |
| Renders at 375px | Mobile viewport | No horizontal scroll, single event card |
| Published event shows | Coach with future published event | Event date, time, location visible |
| Unpublished event hidden | Event with `published: false` | Not shown |
| Past event hidden | Event with `date` in the past | Not shown |
| No events state | No published future events | "No upcoming practices scheduled" |
| Assignment shows | Coach has assignment for event | Station + age group displayed |
| No assignment state | Coach not assigned | "Not yet assigned" |
| Plan link shows | Event has practice plan | "View Practice Plan" button is a link |
| No plan state | Event has no plan | "Practice plan not yet available" (disabled) |
| RSVP submit | Click "Confirmed" button | Form POSTs, redirects to `/coach`, status updated |

---

## RSVP Form Pattern

```astro
<form method="POST">
  <input type="hidden" name="eventId" value={event._id} />
  <input type="hidden" name="status" value="confirmed" />
  <button type="submit"
    class={`px-4 py-2 rounded-full text-sm font-medium min-h-11 ${
      rsvp?.status === "confirmed"
        ? "bg-green-100 text-green-800"
        : "bg-gray-100 text-gray-600"
    }`}>
    Confirmed
  </button>
</form>
```

(Repeat for "maybe" and "declined" with appropriate colors.)
