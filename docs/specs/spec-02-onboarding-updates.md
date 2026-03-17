# Spec 02 — Onboarding Schema & UI Updates

**Phase:** A (Foundation)
**Depends on:** Nothing (independent of spec-01)
**Blocks:** spec-03, spec-04 (middleware routing uses `onboardStatus`)

---

## Primitive 1: Self-Contained Problem Statement

The current `onboarding.practiceAvailability` field is `v.array(v.id("events"))` —
an array of specific event IDs. This is wrong. Coaches don't sign up for specific
events during onboarding; they indicate which days of the week they're generally
available. The field must be replaced with a day-of-week array.

Additionally, the Step 1 onboarding UI at `/get-started` currently renders an
event picker for `practiceAvailability`. That must be replaced with a day-of-week
checkbox group.

Two files change:
1. `convex/schema.ts` — change the `onboarding.practiceAvailability` field type
2. `src/pages/get-started/index.astro` — replace event picker with day-of-week checkboxes

---

## Primitive 2: Acceptance Criteria

### Schema
- ✅ `onboarding.practiceAvailability` changes from `v.array(v.id("events"))` to `v.array(dayOfWeekValidator)`
- ✅ `dayOfWeekValidator` = `v.union(v.literal("monday"), v.literal("wednesday"), v.literal("friday"), v.literal("saturday"))`
- ✅ New optional field `practiceAvailabilityEventIds: v.optional(v.array(v.id("events")))` added to `onboarding` table (preserves ability to link specific events later)
- ✅ `npx convex dev --once` exits 0

### Convex Mutation (`convex/onboarding.ts`)
- ✅ `saveStep1` mutation updated to accept `practiceAvailability: v.array(dayOfWeekValidator)` instead of `v.array(v.id("events"))`
- ✅ `practiceAvailabilityEventIds` arg is optional and passed through unchanged

### Astro Page (`/get-started`)
- ✅ Removes the event ID multi-select or picker for availability
- ✅ Adds checkboxes for: Monday, Wednesday, Friday, Saturday
- ✅ Form submits `practiceAvailability` as an array of selected day strings
- ✅ On POST, parses `form.getAll("practiceAvailability")` as `string[]`
- ✅ Validates each value is one of the four allowed days before calling Convex mutation
- ✅ Page loads existing saved days and pre-checks the appropriate boxes
- ✅ Page renders correctly at 375px viewport with no horizontal scroll
- ✅ Touch targets for checkboxes are ≥ 44px
- ❌ DENY: Form submits event IDs
- ❌ DENY: Onboarding step 2 (`/get-started/compliance`) is modified

---

## Primitive 3: Constraint Architecture

**MUST:**
- Define `dayOfWeekValidator` as a `const` at the top of `schema.ts` alongside `ageGroupValidator` and `sectionValidator`
- Accept the possibility that existing `onboarding` documents in production have the old `v.array(v.id("events"))` data — the schema change will cause a Convex migration warning; document this in a comment in `schema.ts`
- Handle the case where `onboarding.practiceAvailability` is an empty array (show all checkboxes unchecked)

**MUST NOT:**
- Change the `onboarding` step 2 fields (`usaLacrosseId`, `certifications`, `documentAcknowledgments`)
- Change the `onboardStatus` field on the `users` table
- Add any new Convex tables (that is spec-01)
- Modify `submittedAt` or `approvedAt` logic

**PREFERENCE:**
- Use a `<fieldset>` with `<legend>` for the day-of-week checkbox group
- Label each checkbox with the full day name ("Monday", not "mon")
- Use `checked={existingDays.includes("monday")}` pattern for pre-population

**ESCALATION TRIGGER:**
- If Convex reports a schema migration conflict due to existing data, add a comment above the field noting "migration required — existing data uses v.id('events') format" and proceed; do NOT attempt to write a migration script (out of scope)

---

## Primitive 4: Task Decomposition

1. **Schema change in `convex/schema.ts`:**
   - Add `dayOfWeekValidator` constant
   - Replace `practiceAvailability: v.array(v.id("events"))` with `v.array(dayOfWeekValidator)`
   - Add `practiceAvailabilityEventIds: v.optional(v.array(v.id("events")))`
   - Run `npx convex dev --once`

2. **Mutation update in `convex/onboarding.ts`:**
   - Update `saveStep1` (or equivalent) mutation's `practiceAvailability` arg type
   - Add optional `practiceAvailabilityEventIds` arg

3. **UI update in `src/pages/get-started/index.astro`:**
   - Load existing onboarding record to pre-populate days
   - Replace event picker with day-of-week checkboxes
   - Update POST handler to parse and validate day strings
   - Call updated mutation with `practiceAvailability: string[]`

4. **Verification:**
   - `npx convex dev --once`
   - `bun run build`
   - `bunx tsc --noEmit`

---

## Primitive 5: Evaluation Design

| Check | Command / Action | Expected |
|-------|-----------------|----------|
| Schema valid | `npx convex dev --once` | Exit 0 |
| Build passes | `bun run build` | Exit 0 |
| TypeScript | `bunx tsc --noEmit` | Exit 0 |
| Day checkboxes render | Load `/get-started` on 375px viewport | 4 checkboxes visible: Monday, Wednesday, Friday, Saturday |
| Pre-population | Load with existing `["monday", "friday"]` record | Monday and Friday pre-checked |
| Form submission | Submit with Wednesday + Saturday selected | Mutation called with `["wednesday", "saturday"]` |
| Invalid day rejected | POST with `practiceAvailability=tuesday` | Page re-renders with validation error |

---

## Day-of-Week Validator Reference

```typescript
const dayOfWeekValidator = v.union(
  v.literal("monday"),
  v.literal("wednesday"),
  v.literal("friday"),
  v.literal("saturday"),
);
```

## Updated `onboarding` Table Reference

```typescript
onboarding: defineTable({
  clerkId: v.string(),
  // Step 1: About You
  positions: v.array(v.union(
    v.literal("head_coach"),
    v.literal("assistant_coach"),
    v.literal("trainer"),
    v.literal("practice_helper"),
    v.literal("game_day_helper"),
    v.literal("scorekeeper"),
    v.literal("media_team"),
  )),
  ageGroups: v.array(ageGroupValidator),
  // Updated: day-of-week availability (was: v.array(v.id("events")))
  practiceAvailability: v.array(dayOfWeekValidator),
  // Optional: specific event IDs for future use
  practiceAvailabilityEventIds: v.optional(v.array(v.id("events"))),
  // Step 2: Compliance
  usaLacrosseId: v.optional(v.string()),
  certifications: v.array(v.object({
    url: v.string(),
    name: v.string(),
    uploadedAt: v.number(),
  })),
  documentAcknowledgments: v.array(v.object({
    documentId: v.id("documents"),
    acknowledgedAt: v.number(),
  })),
  submittedAt: v.optional(v.number()),
  approvedAt: v.optional(v.number()),
}).index("by_clerk_id", ["clerkId"]),
```
