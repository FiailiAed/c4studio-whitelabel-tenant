# Spec 06 — Drill Library (`/coach/drills`, `/coach/drills/[id]`)

**Phase:** C (Core Views)
**Depends on:** spec-03 (CoachLayout)
**Blocks:** Nothing

---

## Primitive 1: Self-Contained Problem Statement

Coaches need to browse and search the drill library — the same drills that appear
in practice plans. Two pages:

1. `/coach/drills` — searchable list of all active drills, filterable by section
2. `/coach/drills/[id]` — full drill detail: description, diagram, video, reps math

The admin drill library at `/admin/drills` already exists and should NOT be
modified. The coach views are read-only and mobile-first.

---

## Primitive 2: Acceptance Criteria

### List Page (`/coach/drills`)
- ✅ Server-rendered list of all drills (no filter by active state — all drills shown)
- ✅ Drill cards show: name, default section (display name), default duration (e.g., "8 min"), age groups (comma-separated or "All ages")
- ✅ Client-side search by drill name using a text `<input>` (filters the visible cards without a page reload)
- ✅ Section filter: row of pill buttons for each section + "All" — clicking a pill filters the card list
- ✅ If no drills match: "No drills found." message
- ✅ Each card links to `/coach/drills/[id]`
- ✅ Uses `CoachLayout` with `currentTab="practice"` (drill library is practice-adjacent)
- ✅ Renders at 375px with no horizontal scroll
- ✅ Zero TypeScript `any` types

### Detail Page (`/coach/drills/[id]`)
- ✅ Route: `src/pages/coach/drills/[id].astro`
- ✅ Fetches drill via `api.drills.getDrill`
- ✅ Shows: name, description (or "No description"), default section, default duration, reps per minute
- ✅ Shows suitable age groups (or "All age groups" if empty)
- ✅ If `diagramSvg` exists: renders the SVG inline in a bordered container
- ✅ If `videoUrl` exists: shows a "Watch Video" link button that opens in a new tab
- ✅ Shows reps math: "At [X] reps/min over [Y] min = [Z] total reps"
- ✅ Back button: "← Back to Drills" links to `/coach/drills`
- ✅ Uses `CoachLayout` with `currentTab="practice"`
- ✅ Zero TypeScript `any` types
- ❌ DENY: Edit, delete, or create drill actions in coach views
- ❌ DENY: Client-side Convex fetch — all data loaded server-side in frontmatter
- ❌ DENY: Data tables, horizontal scrolling tables

---

## Primitive 3: Constraint Architecture

**MUST:**
- List page: fetch all drills once server-side; client-side filtering uses only JavaScript DOM manipulation (no fetch calls) — acceptable as it operates on already-rendered HTML
- Use `api.drills.listDrills` for the list; if this function doesn't exist in `convex/drills.ts`, create it as part of this spec
- Use `api.drills.getDrill` for the detail page (already exists)
- Client-side search: use `<input type="search">` with an `oninput` or `is:inline` script that toggles `hidden` class on card elements by matching `data-name` attribute
- The `<script is:inline>` approach prevents Astro from processing the script and is appropriate for simple DOM manipulation without data passing

**MUST NOT:**
- Import or use React
- Load Convex data client-side via `useQuery` or `fetch`
- Show drill internal IDs to coaches
- Use an external search library

**PREFERENCE:**
- Section pills: `rounded-full px-3 py-1 text-sm` with active state `bg-green-600 text-white`, inactive `bg-gray-100 text-gray-600`
- Drill card: `rounded-xl border border-gray-100 bg-white p-4 shadow-sm flex flex-col gap-1`
- Section badge on card: small pill with section display name
- Detail page SVG container: `border border-gray-200 rounded-xl p-4 overflow-hidden`

**ESCALATION TRIGGER:**
- If `convex/drills.ts` does not have a `listDrills` query, create one that returns `ctx.db.query("drills").collect()` sorted by name alphabetically

---

## Primitive 4: Task Decomposition

1. **Check/create `api.drills.listDrills` in `convex/drills.ts`** — if missing, add it

2. **Create `src/pages/coach/drills/index.astro`**
   - Frontmatter: auth, fetch all drills
   - Template: search input, section filter pills, drill card grid (1 column on mobile)
   - Inline script for client-side search + filter

3. **Create `src/pages/coach/drills/[id].astro`**
   - Frontmatter: auth, fetch single drill by `Astro.params.id`
   - Template: back button, drill header, metadata, SVG diagram (if present), video link (if present), reps math

4. **Run verification** — `bun run build && bunx tsc --noEmit`

---

## Primitive 5: Evaluation Design

| Check | Method | Expected |
|-------|--------|----------|
| Build passes | `bun run build` | Exit 0 |
| TypeScript | `bunx tsc --noEmit` | Exit 0 |
| List renders | Load `/coach/drills` at 375px | Card stack, no horizontal scroll |
| Search filters | Type in search box | Cards without matching name disappear |
| Section filter | Click "Offense" pill | Only offense drills shown |
| Card links | Tap a drill card | Navigates to `/coach/drills/[id]` |
| Detail renders | Load `/coach/drills/[id]` | Name, duration, reps visible |
| SVG shows | Drill with `diagramSvg` | SVG renders inline |
| Video link | Drill with `videoUrl` | Link present, `target="_blank"` |
| Reps math | 5 reps/min × 8 min | "= 40 total reps" |
| Back button | Tap "← Back to Drills" | Returns to `/coach/drills` |

---

## Client-Side Filter Script Pattern

```html
<script is:inline>
  const searchInput = document.getElementById('drill-search');
  const sectionButtons = document.querySelectorAll('[data-section-filter]');
  const cards = document.querySelectorAll('[data-drill-card]');
  let activeSection = 'all';

  function applyFilters() {
    const query = searchInput.value.toLowerCase();
    cards.forEach((card) => {
      const name = card.dataset.name.toLowerCase();
      const section = card.dataset.section;
      const matchesSearch = name.includes(query);
      const matchesSection = activeSection === 'all' || section === activeSection;
      card.classList.toggle('hidden', !(matchesSearch && matchesSection));
    });
  }

  searchInput.addEventListener('input', applyFilters);
  sectionButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      activeSection = btn.dataset.sectionFilter;
      sectionButtons.forEach(b => b.classList.remove('bg-green-600', 'text-white'));
      sectionButtons.forEach(b => b.classList.add('bg-gray-100', 'text-gray-600'));
      btn.classList.add('bg-green-600', 'text-white');
      btn.classList.remove('bg-gray-100', 'text-gray-600');
      applyFilters();
    });
  });
</script>
```
