# Spec 05 — Practice Plan View (`/coach/practice/[id]`)

**Phase:** C (Core Views)
**Depends on:** spec-01 (schema), spec-03 (CoachLayout)
**Blocks:** spec-07 (rep logging links back here)

---

## Primitive 1: Self-Contained Problem Statement

A coach taps "View Practice Plan" from the home screen and lands on
`/coach/practice/[id]` where `[id]` is the event ID.

The page shows the full practice plan for that event, automatically filtered to
show only the sections relevant to the coach's assigned station. If the coach is
assigned to `offense / U12`, they see the stretch and warmup (shared sections)
plus the offense drills for U12. They do NOT see defense, ground balls, etc.

If the coach has no assignment, all sections are shown (head coach view).
If there is no published plan, show "Practice plan not yet available."

---

## Primitive 2: Acceptance Criteria

- ✅ Page is server-rendered via `ConvexHttpClient`
- ✅ Route: `src/pages/coach/practice/[id].astro` where `id` = event `_id`
- ✅ Fetches event via `api.events.getEvent`
- ✅ Fetches practice plan via `api.plans.getPlanForEvent`
- ✅ Fetches coach's assignment for this event via `api.assignments.getAssignmentsForEvent` filtered to `clerkId`
- ✅ If event not found or not published: show "Event not found." with link back to `/coach`
- ✅ If no practice plan: show "Practice plan not yet available." with link back to `/coach`
- ✅ Shows event title, date (formatted), location, duration
- ✅ Shows coach's station assignment in a highlighted banner ("You're at: Offense / U12")
- ✅ Sections are filtered: shared sections (`stretch`, `warmup`) always shown; other sections only shown if they match coach's station; if no assignment, show all
- ✅ Each section shows its display name as a heading
- ✅ Each drill card shows: drill name, duration (e.g., "8 min"), total reps (calculated), per-player reps (if `playerCountAtStation` is set), optional notes
- ✅ If drill has `diagramSvg`: show a collapsible "View Diagram" disclosure (`<details>`)
- ✅ If drill has `videoUrl`: show a link "Watch Video" (opens in new tab)
- ✅ "Log Reps" button at bottom of each section: links to `/coach/log/[eventId]`
- ✅ Uses `CoachLayout` with `currentTab="practice"`
- ✅ Zero TypeScript `any` types
- ❌ DENY: Editing or modifying the plan
- ❌ DENY: Showing other coaches' assignments
- ❌ DENY: Client-side filtering of sections

---

## Primitive 3: Constraint Architecture

**MUST:**
- Use `Astro.params.id as Id<"events">` for the event ID
- Reps calculation: `totalReps = durationMinutes * drill.repsPerMinute`; use `repsOverride` if set
- `perPlayerReps = Math.ceil(totalReps / playerCountAtStation)` — only show if `playerCountAtStation` is set
- Shared sections: `["stretch", "warmup"]` — always included in filtered view
- Section filter logic: if coach has assignment with `station = "offense"` and `ageGroup = "U12"`, include drills where `section === "offense" && ageGroup === "U12"` OR `ageGroup === null/undefined`

**MUST NOT:**
- Fetch Clerk user data (only Convex data needed on this page)
- Show the practice plan name or template metadata to coaches (internal admin concept)
- Use `<table>` for drill layout — use cards

**PREFERENCE:**
- Use `<details>` + `<summary>` for diagram disclosure (no JS required)
- Section headings: `text-sm font-semibold uppercase tracking-wide text-gray-500 mt-6 mb-2`
- Drill card: `rounded-xl border border-gray-100 bg-white p-4 shadow-sm`
- Station banner: `bg-green-50 border border-green-200 rounded-xl p-4 text-green-800`
- Reps display: show as "X total reps" and "~Y reps/player" on separate lines

**ESCALATION TRIGGER:**
- If `getPlanForEvent` returns drills without joining drill details (missing `repsPerMinute`), the page must handle `drill: null` gracefully — show drill name as "Unknown drill" and skip reps calculation

---

## Primitive 4: Task Decomposition

1. **No new Convex functions needed** — use existing `api.events.getEvent`, `api.plans.getPlanForEvent`, `api.assignments.getAssignmentsForEvent`

2. **Create `src/pages/coach/practice/[id].astro`**
   - Frontmatter: auth, params, 3 Convex queries, section filter logic, reps calculation
   - Template: event header, station banner, filtered sections, drill cards, log button

3. **TypeScript types** — define `SectionKey`, `DrillWithDetails` interfaces locally

4. **Run verification** — `bun run build && bunx tsc --noEmit`

---

## Primitive 5: Evaluation Design

| Check | Method | Expected |
|-------|--------|----------|
| Build passes | `bun run build` | Exit 0 |
| TypeScript | `bunx tsc --noEmit` | Exit 0 |
| Renders at 375px | Mobile viewport | Vertical card stack, no horizontal scroll |
| Assigned coach view | Coach with `offense/U12` assignment | Sees stretch, warmup, offense/U12 drills only |
| Unassigned coach view | Coach with no assignment for event | Sees all sections |
| No plan state | Event has no practice plan | "Practice plan not yet available" |
| Unpublished event | `published: false` | "Event not found" |
| Diagram collapsible | Drill with `diagramSvg` | `<details>` renders, SVG shows on open |
| Video link | Drill with `videoUrl` | Link opens in new tab |
| Reps calculation | Drill with 8 min × 5 repsPerMinute = 40 reps | "40 total reps" shown |
| Per-player reps | 40 reps ÷ 8 players = 5 per player | "~5 reps/player" shown |
| Log Reps button | Any section | Links to `/coach/log/[eventId]` |

---

## Section Filter Logic Reference

```typescript
type SectionKey = "stretch" | "warmup" | "offense" | "ground_balls" | "defense" | "speed_series" | "u6_practice";

const SHARED_SECTIONS: SectionKey[] = ["stretch", "warmup"];

function filterDrillsForCoach(
  drills: DrillWithDetails[],
  assignedStation: SectionKey | null,
  assignedAgeGroup: string | null,
): DrillWithDetails[] {
  if (!assignedStation) return drills; // no assignment = show all

  return drills.filter((d) => {
    if (SHARED_SECTIONS.includes(d.section as SectionKey)) return true;
    if (d.section !== assignedStation) return false;
    if (!assignedAgeGroup) return true; // station matches, no age group filter
    return !d.ageGroup || d.ageGroup === assignedAgeGroup;
  });
}
```
