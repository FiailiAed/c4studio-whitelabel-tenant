# TaskMaster Design Spec
*Authoritative reference for all UI components. No custom CSS files — Tailwind utility classes only.*

## Typography
- **Font Family:** `Inter`, sans-serif (system font stack fallback)
- **Headings:** `tracking-tight font-bold`
- **Body:** `text-slate-600` (light) / `dark:text-slate-400` (dark)

## Color Palette

### Brand (Blurple)
| Usage | Light | Dark |
|-------|-------|------|
| Primary | `#635bff` | `#7a73ff` |
| Apply via | `style={{ color: '#635bff' }}` or `text-[#635bff]` | `dark:text-[#7a73ff]` |

### Backgrounds
| Surface | Light | Dark |
|---------|-------|------|
| Page | `bg-slate-50` | `dark:bg-[#0a0e17]` |
| Card | `bg-white` | `dark:bg-[#1e293b]` |
| Sidebar / Nav | `bg-white` | `dark:bg-[#1e293b]` |

### Borders
- Light: `border-slate-200`
- Dark: `dark:border-slate-800`

### Task Status Colors
| Status | Color | Tailwind |
|--------|-------|---------|
| Todo | Slate | `text-slate-500 bg-slate-100` |
| Pending | Amber | `text-amber-500 bg-amber-50` |
| Done | Emerald | `text-emerald-500 bg-emerald-50` |

### Client themeColor
- Stored as hex string in Convex: `"#6C63FF"`
- Applied via inline style only — never construct dynamic Tailwind class names:
  ```tsx
  <div style={{ backgroundColor: client.themeColor }} />
  ```

## Shadows & Depth

### `stripe-shadow` (Phase 3 — wire in global.css via `@utility`)
```css
/* Light */
box-shadow: 0 2px 5px -1px rgba(50, 50, 93, 0.25), 0 1px 3px -1px rgba(0, 0, 0, 0.3);

/* Dark */
box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3);
```
Apply to cards: `stripe-shadow dark:stripe-shadow-dark`

## Dark Mode
- **Strategy:** Toggle the `dark` class on `<html>`. Persist to `localStorage`.
- **Init script:** Runs inline in `<head>` before paint to prevent FOUC (see `DashboardLayout.astro`).
- **Rule:** Every component must have explicit `dark:` variants for text, bg, and border.
- **Toggle:** Dark mode button in `DashboardLayout` top nav.

## Component Patterns

### Client Card
- White card with `stripe-shadow`, rounded corners (`rounded-xl`)
- Left accent bar using client `themeColor` inline style
- Client `abbrev` shown in a colored avatar circle
- Inline `<input>` at the bottom for creating tasks (fires on Enter)

### Task Item
- Row within a client card
- Status indicator dot (slate / amber / emerald)
- Click cycles status: `todo → pending → done → todo`
- Optimistic UI: update fires immediately, Convex confirms async

### Sidebar (Phase 3)
- Filter links using URL state: `/?filter=todo`, `/?filter=pending`, `/?filter=done`
- Active filter highlighted with blurple accent

### AddClientModal (Phase 3)
- Radix UI `Dialog` component
- Fields: Name, Abbrev (max 4 chars), themeColor (hex input with color preview)
- Submits via Convex `createClient` mutation (to be added in Phase 3)

## Layout Structure
- **DashboardLayout:** Board-specific shell. Top nav + dark mode toggle + user menu + `<ViewTransitions />`.
- **Board page:** `/t/[slug]/board` — full-width horizontal scroll of client cards.
- **Client detail:** `/t/[slug]/client/[id]` — deep-dive view (Phase 4).

## Routing
| Route | Purpose |
|-------|---------|
| `/t/[slug]/board` | Main task board (ClientBoard island) |
| `/t/[slug]/client/[id]` | Deep-dive client history (Phase 4) |
| `?filter=todo\|pending\|done` | URL-state board filtering (Phase 3) |
