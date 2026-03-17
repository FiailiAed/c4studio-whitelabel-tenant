# Spec 09 — Admin Player Management (`/admin/players`)

**Phase:** E (Admin)
**Depends on:** spec-01 (schema — `players` table)
**Blocks:** Nothing

---

## Primitive 1: Self-Contained Problem Statement

Coaches select players from a dropdown when logging reps (spec-07), but someone
has to create and manage the player roster. That is an admin function.

This spec adds a new admin page at `/admin/players` that lets admins:
1. View the full player roster (all age groups)
2. Add a new player (name, jersey number, age group)
3. Deactivate a player (sets `isActive: false`)
4. Reactivate a player

Player creation and deactivation use standard Astro SSR form POSTs. No CSV
import in this version (deferred).

---

## Primitive 2: Acceptance Criteria

### List Page (`/admin/players`)
- ✅ Uses `AdminDashboardLayout` with `currentPage="players"`
- ✅ Update `AdminDashboardLayout.astro` navLinks array to include Players entry: `{ label: "Players", href: "/admin/players", key: "players" }`
- ✅ Shows all players grouped by age group (U6, U8, U12, U14)
- ✅ Each player row shows: jersey number, name, age group, active status, deactivate/reactivate button
- ✅ Active players: full opacity; inactive players: muted/strikethrough name
- ✅ "Add Player" button at top of page opens a form (inline on same page, or link to `/admin/players/new`)
- ✅ Add Player form fields: name (required), jerseyNumber (optional number), ageGroup (required select)
- ✅ On add POST: insert new `players` record, redirect back to `/admin/players`
- ✅ On deactivate POST: patch `isActive: false`, redirect back
- ✅ On reactivate POST: patch `isActive: true`, redirect back
- ✅ Renders correctly on mobile AND desktop
- ✅ Zero TypeScript `any` types
- ❌ DENY: Coaches can access `/admin/players` (protected by existing admin middleware)
- ❌ DENY: CSV import UI (out of scope)
- ❌ DENY: Deleting players (deactivate only — preserves historical rep log data)

---

## Primitive 3: Constraint Architecture

**MUST:**
- Use `AdminDashboardLayout` — not `CoachLayout`
- Use existing admin middleware (all `/admin/*` routes already require `role: "admin"`)
- Implement add and deactivate as separate `<form method="POST">` blocks with hidden `_action` fields to distinguish which operation is being performed
- Create `convex/players.ts` with: `listAllPlayers`, `createPlayer`, `setPlayerActive` functions
- On form POST in Astro frontmatter, parse `_action` field: `"add"` | `"deactivate"` | `"reactivate"`

**MUST NOT:**
- Add a player edit form (out of scope — deactivate/reactivate only)
- Expose `players` data to unauthenticated routes
- Add a global delete mutation (preserve data integrity for `player_reps_log` references)

**PREFERENCE:**
- Group players by age group using `Object.groupBy` or manual grouping (TypeScript 5.4+ `Object.groupBy` may not be available — use `reduce` for safety)
- Inactive players: `opacity-50 line-through` on name
- "Add Player" form: inline at top of page, collapsible with `<details>` to save space
- Deactivate button: `text-red-600 text-sm`, reactivate button: `text-green-600 text-sm`

**ESCALATION TRIGGER:**
- If Convex `players` table doesn't exist yet (spec-01 not run), show a clear error message and document the dependency

---

## Primitive 4: Task Decomposition

1. **Create `convex/players.ts`**
   - `listAllPlayers()` → all players, sorted by ageGroup then name
   - `createPlayer(args: { name, jerseyNumber?, ageGroup, isActive })` → insert
   - `setPlayerActive(args: { playerId: Id<"players">; isActive: boolean })` → patch

2. **Update `src/layouts/AdminDashboardLayout.astro`**
   - Add `{ label: "Players", href: "/admin/players", key: "players" }` to `navLinks`

3. **Create `src/pages/admin/players.astro`**
   - Frontmatter: auth (admin check via existing middleware), Convex queries, POST handlers
   - Template: grouped player list, add player form, deactivate/reactivate buttons

4. **Run verification** — `bun run build && bunx tsc --noEmit`

---

## Primitive 5: Evaluation Design

| Check | Method | Expected |
|-------|--------|----------|
| Build passes | `bun run build` | Exit 0 |
| TypeScript | `bunx tsc --noEmit` | Exit 0 |
| Admin nav updated | Visit `/admin` | "Players" link visible in nav |
| Non-admin blocked | Visit `/admin/players` as coach | Redirect to `/` |
| Players grouped | 3 U12 players, 2 U8 players | Two groups with headings |
| Add player | Submit add form | Player appears in list |
| Deactivate | Click deactivate | Player name is muted/strikethrough |
| Reactivate | Click reactivate on inactive | Player returns to active styling |
| Delete not available | Inspect page | No delete button anywhere |

---

## Convex Functions Reference

```typescript
// convex/players.ts

export const listAllPlayers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("players").collect();
  },
});

export const createPlayer = mutation({
  args: {
    name: v.string(),
    jerseyNumber: v.optional(v.number()),
    ageGroup: ageGroupValidator,
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("players", {
      ...args,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const setPlayerActive = mutation({
  args: {
    playerId: v.id("players"),
    isActive: v.boolean(),
  },
  handler: async (ctx, { playerId, isActive }) => {
    await ctx.db.patch(playerId, { isActive, updatedAt: Date.now() });
  },
});
```

## Form Action Pattern

```astro
---
if (Astro.request.method === "POST") {
  const form = await Astro.request.formData();
  const action = form.get("_action") as string;
  const client = new ConvexHttpClient(import.meta.env.PUBLIC_CONVEX_URL);

  if (action === "add") {
    await client.mutation(api.players.createPlayer, {
      name: form.get("name") as string,
      jerseyNumber: form.get("jerseyNumber") ? Number(form.get("jerseyNumber")) : undefined,
      ageGroup: form.get("ageGroup") as "U6" | "U8" | "U12" | "U14",
    });
  } else if (action === "deactivate" || action === "reactivate") {
    await client.mutation(api.players.setPlayerActive, {
      playerId: form.get("playerId") as Id<"players">,
      isActive: action === "reactivate",
    });
  }

  return Astro.redirect("/admin/players");
}
---
```
