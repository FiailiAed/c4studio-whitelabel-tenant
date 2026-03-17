# Intent Engineering — Coach Portal

Encodes organizational purpose into every design decision so LLM output stays
aligned with why this product exists.

---

## Mission Statement

> "Make the volunteer's life measurably easier and their contribution tangibly visible."

Every screen, every state, every piece of copy must serve this mission. If a UI
element doesn't make the volunteer's job easier or make their contribution more
visible, it should not exist.

---

## User Personas

### Persona 1: The Practice Helper
- **Who:** Shows up 30 minutes before practice, often unsure where to go
- **Device:** iPhone, 1 hand free, parking lot lighting
- **Primary need:** "You're at Offense / U12 today. Here are your 3 drills."
- **Secondary need:** Know how many reps to run and when the next drill starts
- **Failure mode:** They see a menu of options and leave the app

### Persona 2: The Head Coach
- **Who:** Reviews the plan the night before from their couch
- **Device:** Mobile, good WiFi
- **Primary need:** Full plan for all stations, drill diagrams, reps breakdown
- **Secondary need:** Log what actually happened during/after practice
- **Failure mode:** They can't see the plan because it requires too many taps

### Persona 3: The Nervous First-Timer
- **Who:** Never volunteered before. No lacrosse background. Anxious.
- **Device:** Android, default font size increased
- **Primary need:** One thing on the screen. Simple language. No jargon.
- **Secondary need:** Confidence that they're in the right place doing the right thing
- **Failure mode:** They see a complex interface and call the director for help

---

## Design Principles

### Principle 1: One Primary Action Per Screen
Every screen has exactly one obvious next action. The action must be impossible
to miss on a 375px viewport.

**Test:** Can the persona above complete the primary action without scrolling or
reading any label twice? If no, redesign.

### Principle 2: 5-Second Load on 3G
All Convex queries are server-side (`ConvexHttpClient`). No client-side
hydration for data fetching. Pages are HTML-first, served fully rendered.
Client-side `<script>` tags are permitted only for non-data interactions
(e.g., incrementing a counter before form submission).

**Test:** Does the page work with JavaScript disabled in the browser? If the data
doesn't appear, the implementation is wrong.

### Principle 3: No Dead Ends
Every possible data state has a message AND a next action. There are no blank
screens, no empty divs, no silent failures.

| State | Message | Next Action |
|-------|---------|-------------|
| No upcoming events | "No upcoming practices scheduled." | (none needed — check back soon) |
| No assignment for coach | "You haven't been assigned to a station yet." | "Questions? Contact your director." |
| No practice plan | "Practice plan not yet available." | "Check back closer to practice." |
| Onboarding not done | "Complete your onboarding to access this page." | Link to `/get-started` |
| No players in roster | "No players added yet." | (admin-only action, not shown to coaches) |
| No drills logged | "No reps logged for this practice." | Link to `/coach/log/[eventId]` |

### Principle 4: Information Hierarchy
Content priority order on every coach screen:

1. **What is happening NOW** (today's event, current drill, active station)
2. **What is happening NEXT** (next drill in sequence, next practice date)
3. **Everything else** (history, settings, library browsing)

Never surface "everything else" above "what is happening now."

### Principle 5: Mobile-First Non-Negotiable
- **Bottom navigation** — 4 tabs: Home | Practice | Log | Profile
- **Touch targets ≥ 44px** — use `min-h-11` (`min-height: 44px`) on all tappable elements
- **No hover-only interactions** — every hover state must also be a focus/active state
- **No horizontal scroll** — test every page at 375px viewport width
- **Safe area insets** — bottom nav must use `pb-safe` or `padding-bottom: env(safe-area-inset-bottom)`

---

## Copy Guidelines

| Do | Don't |
|----|-------|
| "Offense / U12" | "station: offense, ageGroup: U12" |
| "Your next practice is Saturday, March 7 at 6:00 PM" | "Event date: 2026-03-07T18:00:00.000Z" |
| "Warm-Up" | "warmup" |
| "Ground Balls" | "ground_balls" |
| "Log reps" | "Submit rep count mutation" |
| "Not yet assigned" | "null" or "" |
| "All age groups" | "undefined" or "N/A" |

---

## Anti-Patterns

### Anti-Pattern 1: Admin UI for Coaches
Coaches are NOT admins. They must never see:
- Staff assignment grids
- Event creation/editing forms
- Document management
- Player roster CRUD (they can only select players from dropdown when logging)
- Other coaches' rep logs

### Anti-Pattern 2: Raw Data Exposure
Never show coaches:
- Convex document IDs (e.g., `j570abc123`)
- Database field names (e.g., `practiceAvailability`, `repsPerMinute`)
- ISO 8601 timestamps without formatting
- Enum values without labels (e.g., `ground_balls` instead of "Ground Balls")

### Anti-Pattern 3: Navigation Depth
Coaches must reach their station's drills in ≤ 2 taps from Home:
1. Home → Practice plan (tap "View Plan" card)
2. Practice plan → filtered to coach's station (already filtered on load)

More than 2 taps to reach a core task is a design failure.

### Anti-Pattern 4: Data Tables on Mobile
Never use `<table>` elements or CSS grid layouts that simulate tables in the
coach interface. Use card stacks. Every item is a card with clear hierarchy
(title, subtitle, action).

### Anti-Pattern 5: Speculative Features
Do not add features that were not requested:
- No favorites, bookmarks, or notes on drills (not in scope)
- No social features, comments, or reactions
- No notifications or push alerts
- No dark mode toggle (Tailwind defaults are sufficient)
- No CSV export buttons (deferred for all tables)

---

## Tone and Copy Voice

The app speaks to volunteers who are giving their Saturday morning to help kids.
The tone is:

- **Warm, not clinical.** "Here are your drills for today" not "Station assignments loaded."
- **Confident, not tentative.** "You're all set" not "It appears your setup may be complete."
- **Brief, not wordy.** Labels are 1–3 words. Descriptions are 1 sentence max.
- **Encouraging, not demanding.** "Log reps when you're done" not "Reps must be submitted."
