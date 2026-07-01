# DESIGN.md — TeamOne Design System (Rocketlane-Inspired)

> Production-grade design language for the TeamOne app, reverse-engineered from the
> live **Rocketlane** application (trustybytes.rocketlane.com) and mapped onto
> TeamOne's existing **React 18 + TypeScript + Vite + Tailwind 3.4 + shadcn/Radix**
> token architecture.

## Source
- URLs (authenticated, captured live via Chrome):
  - `/dashboards/5000000002249` — dashboard / widget grid
  - `/accounts/5000000062407/overview` — record overview (two-column)
  - `/accounts/5000000062407/engagement/timeline` — activity timeline (feed)
  - `/projects` — projects list/table view
- Capture date: 2026-06-30
- Evidence: live DOM `getComputedStyle` extraction (colors, type, spacing, radius,
  shadow, borders), component-level audits (buttons, chips, tables, progress bars,
  KPI cards), full-page screenshots, Firecrawl branding scrape.
- Confidence: **High** — values are measured from the running app, not inferred.

---

## Design Summary

Rocketlane is a **calm, dense, enterprise SaaS** system built on the bones of the
**IBM Carbon Design System**: **IBM Plex Sans**, Carbon's exact blue (`#0F62FE`),
red (`#DA1E28`), and neutral gray ramp, with Carbon "tag" chip colors. It is then
**softened** for a modern feel — card corners are rounded **8px** (Carbon is 0px),
elevation comes from **very subtle shadows** rather than hard borders, and the page
background is a warm-neutral light gray (`#ECECEC`) with **pure-white content
layers** floating on top.

The personality is **professional, low-chrome, information-first**: small 14px body
text, generous whitespace inside cards, restrained color (color is reserved for
status, never decoration), a thin **48px icon-only sidebar rail**, and **black
primary action buttons** (not blue — blue is reserved for links/active state).

What an agent should recreate:
- A neutral, near-grayscale shell where **data is the hero**.
- White cards/tables on a light-gray canvas, separated by hairline borders + soft shadows.
- Color used **only** for meaning: blue = link/active/primary-info, green = on-track/success, red = overdue/danger, amber = warning, gray = neutral/secondary.
- Tight type scale, high information density, no gratuitous gradients or large hero art.

---

## Design Tokens

All tokens below are expressed as **HSL triplets** to drop directly into the existing
`src/index.css` `:root` block (Tailwind opacity modifiers like `/80` keep working).
Hex is given alongside for reference. **Measured** = read from the live app; **derived**
= computed ramp step consistent with Carbon.

### Colors — Brand & Action

| Role | Hex | HSL triplet | Source | Usage |
|---|---|---|---|---|
| `--primary` (Blue 60) | `#0F62FE` | `217 99% 53%` | measured | Links, active nav, info, focus ring, selected state |
| `--primary` hover (Blue 70) | `#0043CE` | `219 100% 40%` | measured | Link/primary hover, chip text on blue tag |
| Blue 80 (active) | `#002D9C` | `222 100% 31%` | derived | Pressed state |
| **Action / CTA** (`--foreground` black) | `#161616` | `0 0% 9%` | measured | **Primary buttons are black**, not blue |
| Action hover | `#000000` | `0 0% 0%` | measured | Primary button hover |

> ⚠️ Key rule: **Primary buttons use near-black `#161616` fill with white text.** Blue
> `#0F62FE` is an *accent/link* color, not the button color. This is the single most
> important brand decision to preserve.

### Colors — Neutral Ramp (Carbon gray)

| Token | Hex | HSL | Usage |
|---|---|---|---|
| Gray 100 `--foreground` | `#161616` | `0 0% 9%` | Primary text, headings |
| Gray 90 | `#262626` | `0 0% 15%` | Strong text |
| Gray 70 `--muted-foreground` | `#525252` | `0 0% 32%` | Secondary text, captions, column headers |
| Gray 60 | `#6F6F6F` | `0 0% 44%` | Tertiary text, icons |
| Gray 50 | `#8D8D8D` | `0 0% 55%` | Placeholder, disabled text |
| Gray 40 | `#A8A8A8` | `0 0% 66%` | Disabled, faint icons |
| Gray 30 `--input` border | `#C6C6C6` | `0 0% 78%` | Input borders, dividers (strong) |
| Gray 20 `--border` | `#E0E0E0` | `0 0% 88%` | Hairline borders, neutral chip bg |
| Gray 10 `--secondary` / field bg | `#F4F4F4` | `0 0% 96%` | Field background, secondary button bg, subtle fills |
| Gray rail `--sidebar` | `#E8E8E8` | `0 0% 91%` | Icon sidebar rail background |
| Page bg `--background` | `#ECECEC` | `0 0% 93%` | App canvas behind content |
| Layer / card `--card` `--surface-1` | `#FFFFFF` | `0 0% 100%` | Cards, tables, panels, modals |

### Colors — Semantic / Status (Carbon-aligned)

| Role | Solid | Soft bg | Text-on-soft | Usage |
|---|---|---|---|---|
| `--success` (On Track) | `#24A148` `136 64% 39%` | `#DEFBE6` `135 79% 93%` | `#0E6027` `136 75% 22%` | On track, completed, healthy progress |
| `--destructive` (Overdue) | `#DA1E28` `357 76% 49%` | `#FFF1F1` `0 100% 97%` | `#A2191F` `357 73% 37%` | Overdue, error, at-risk, delete |
| `--warning` (Running late) | `#F1C21B` `45 89% 53%` | `#FCF4D6` `48 88% 91%` | `#684E00` `44 100% 20%` | Warning, running late, pending |
| `--info` / Blue tag | `#0F62FE` `217 99% 53%` | `#EDF5FF` `216 100% 96%` | `#0043CE` `219 100% 40%` | Info, kickoff/phase chips, links |
| Neutral tag | `#525252` `0 0% 32%` | `#E0E0E0` `0 0% 88%` | `#161616` `0 0% 9%` | Neutral status, "In progress" phase |
| Purple (accent phase) | `#8A3FFC` `262 96% 62%` | `#F6F2FF` `258 100% 97%` | `#6929C4` `271 65% 47%` | Secondary phase/category chips |

> Chart palette (recharts): green `#42BE65`, blue `#78A9FF`, red `#FA4D56`,
> teal `#08BDBA`, purple `#A56EFF`, with a 0.85–1.0 opacity. Bars use solid Carbon
> hues; never gradients.

### Typography

| Property | Value | Notes |
|---|---|---|
| Font family | **IBM Plex Sans** | Self-host or Google Fonts; fallback `-apple-system, Segoe UI, Roboto, sans-serif`. **Replaces Inter.** |
| Base body | `14px` / `400` / `1.45` | The default — most of the UI is 14px |
| Secondary / caption | `12px` / `400` | Chips, table meta, column headers (headers `600`) |
| Micro | `11px` / `400` | Dense table meta, timestamps |
| Section title (card header) | `14px` / `600` | Card/widget titles are *small and semibold*, not large |
| Page heading (record name) | `20–32px` / `400` | Overview record titles; light weight, not bold |
| **KPI / metric number** | `42–54px` / `400` | Big-number widgets — large but **regular weight**, color `#161616` |
| Weights in use | `400` (body), `500`/`600` (emphasis/headers) | No `700`+ in the app; keep it light |
| Letter-spacing | `0` (normal) | Carbon does not tighten body tracking |

> ⚠️ This system runs **lighter and smaller** than TeamOne's current scale
> (which has `display 3rem/700`, `h1 2.25rem/700`). Headings here are **light weight
> and modest size**; emphasis comes from *weight 600 + color*, not size + 700.

### Spacing & Layout

| Token | Value | Usage |
|---|---|---|
| Base unit | `4px` | All spacing is a multiple of 4 |
| Spacing scale | `4 · 8 · 12 · 16 · 24 · 32 · 48 · 96` | `gap-2/3/4` (8/12/16) are the workhorses |
| Card padding | `16px` (`12–24` range) | Default internal card padding |
| Section gap (grid) | `16px` | Dashboard widget grid gap |
| Cell padding (table) | `0 12px`, row height `~36–40px` | Dense rows |
| Container | Full-width fluid; content max ~1400px | Not centered narrow — app fills the shell |
| Sidebar rail | **`48px`** fixed, icon-only | Expands on hover/click to labeled nav |

### Radius

| Token | Value | Applies to |
|---|---|---|
| `--radius` (base) | `8px` | **Cards, panels, modals, buttons, dropdowns** |
| sm | `2–4px` | Inputs, chips, small controls, table affordances |
| pill | `50% / 9999px` | Avatars, status dots, circular progress |
| Carbon-sharp option | `0px` | Available if you want a stricter Carbon look on inputs |

> Decision: TeamOne adopts the **softened 8px** card radius (the modern Rocketlane
> dashboard look), **not** Carbon's 0px. Inputs stay tight at 2–4px.

### Borders & Elevation

| Token | Value | Usage |
|---|---|---|
| Hairline border | `1px solid #E0E0E0` (`0 0% 88%`) | Card edges, table dividers, separators |
| Shadow xs (card resting) | `0 1.2px 2.7px rgba(0,0,0,0.13), 0 0.2px 0.7px rgba(0,0,0,0.11)` | Default card lift |
| Shadow sm (hover/menus) | `0 0 4px rgba(0,0,0,0.2)` | Dropdowns, hovered cards |
| Shadow lg (modals) | `0 20px 32px -8px rgba(9,20,66,0.25)` | Dialogs, popovers, floating panels |

> Elevation is **whisper-quiet**. Cards rely on the border + a barely-there shadow.
> Never use heavy drop shadows.

---

## Components

### Buttons
- **Primary:** black `#161616` bg, white text, `8px` radius, `500` weight, `14px`,
  padding `~6px 12px` (`1px 8px` measured + icon gap). Hover → `#000`.
- **Secondary:** `#F4F4F4` bg, `#161616` text, transparent border, same radius/size.
- **Ghost/tertiary:** transparent bg, `#161616` text, hover `#F4F4F4`.
- **Danger:** `#DA1E28` bg, white text.
- Buttons are **compact** (low vertical padding) and **icon + label** is common
  (leading lucide icon, 16px, then label, then optional trailing `+`/chevron).

### Inputs / Fields
- Background `#F4F4F4`, text `#161616`, **bottom-border or subtle box** style,
  radius `2px`, no heavy outline. Focus → `2px` blue `#0F62FE` ring/underline.
- Labels `12px`, gray `#525252`, above the field.

### Cards (use for: KPIs, grouped info, dashboard widgets)
- White bg, `1px #E0E0E0` border, `8px` radius, `16px` padding, shadow-xs.
- **Header:** small `14px/600` title, optional trailing icon button (filter `⌄`, `⋮`).
- **KPI card:** label top-left (`14px/600` gray) + optional filter icon, then a
  huge `54px/400` number centered, `#161616`.
- **Chart card:** title top-left, legend row (colored dot + 12px label + "+N more"),
  recharts chart below.
- Use cards for: dashboard metrics, summary panels, "Account Info" side panel,
  grouped form sections, empty-states.

### Tables / List views (use for: collections of records — projects, tasks, accounts)
- White surface, **column header row** `14px/600`, color `#525252`/`rgba(0,0,0,0.54)`,
  height `32px`, padding `0 12px`, hairline bottom border.
- **Rows:** `14px/400`, `~36–40px` tall, hairline `#E0E0E0` divider, hover → `#F4F4F4`.
- Cell content mixes: avatar + name, status (icon + text), **chips**, **progress bars**, dates.
- Toolbar above table: view dropdown ("All projects"), Filter, "Group by", right-aligned
  search / column-config / export icons, primary "New …" black button.
- Use tables/lists for: Projects, Tasks, Accounts, any sortable/filterable collection.

### Status chips / tags (Carbon tag pattern)
- Small `12px/400`, padding `~2px 8px`, radius `2px` (or pill for status dots).
- Soft-bg + matching dark text per the semantic table above:
  - Blue: `#EDF5FF` bg / `#0043CE` text (kickoff, info)
  - Neutral: `#E0E0E0`–`#F4F4F4` bg / `#161616`–`#525252` text (phases, "in progress")
  - Green: `#DEFBE6` / `#0E6027` (on track)
  - Red: `#FFF1F1` / `#A2191F` (overdue)
- Status with icon: a small colored **dot or lucide icon** (e.g. clock for "In progress",
  check for "Done") + neutral text — used inline in tables.

### Progress
- **Linear bar:** track `#DEFBE6` (or `#E0E0E0`), fill green `#24A148`, height `~6–8px`,
  rounded. Used in tables to show project completion.
- **Circular / phase pips:** small green chevron/segment indicators for phase progress.

### Navigation
- **Left rail:** `48px` icon-only, bg `#E8E8E8`, lucide icons `~20px` gray `#525252`;
  active item → blue `#0F62FE` icon + subtle white/active pill. Expands to labeled nav.
- **Top bar (per page):** hamburger + page title (`20px/400`), center/utility area,
  right-aligned primary action ("Add new widget", "New project") as black button.
- **Secondary toolbar:** view switcher + Filter + date range + toggles + "Share"
  (black button) — a thin row of `#F4F4F4` pill controls.
- **Tabs (record pages):** text tabs (Overview · People · Engagement · Files), active
  tab = `#161616` text + bottom border, inactive = `#525252`.

### Timeline / Activity feed (use for: chronological events)
- Vertical **list**, not cards: each entry = avatar/icon + actor + action text +
  relative timestamp (`27 Jun`, `30 Jun' 2026`), grouped by day, hairline separators.
- Status badges inline (e.g. "On Track"). Quiet, scannable, left-aligned.

---

## Page Patterns

| Page type | Primary layout | When |
|---|---|---|
| **Dashboard** | Responsive **card grid** (react-grid-layout), KPI cards on top row, chart cards below, `16px` gaps | Metrics & at-a-glance summaries |
| **Record overview** | **Two-column**: main content (sections/sub-cards) + right info sidebar ("Account Info") | Single entity detail (account, project) |
| **List / index** | Full-width **data table** + toolbar (filter/group/search/new) | Collections of records |
| **Timeline** | Single-column **vertical feed/list** | Chronological activity |
| **Detail with tabs** | Header + tab bar + per-tab content (often table or cards) | Multi-facet records |

**Decision matrix — card vs list vs table:**
- **Card** → a *single* metric, a *grouped* set of fields, or a dashboard widget. Few items, each visually distinct.
- **List/feed** → ordered, scannable, text-heavy items with light structure (activity, notifications, comments).
- **Table** → many records with the *same* columns that users sort/filter/compare (projects, tasks, accounts).

**Responsive:** content fills the shell (no narrow centered column). Sidebar collapses
to the 48px rail; tables scroll horizontally; card grid reflows columns. Density stays
high — this is a desktop-first operational tool.

---

## Content Style
- **Voice:** plain, operational, neutral. Labels are nouns ("Projects", "Account Info",
  "Recent activities"). No marketing fluff inside the app.
- **CTAs:** verb-led and concise ("Add new widget", "New project", "Add note", "View all").
- **Empty states:** a short prompt + a single primary action ("Add your first note" →
  one-line helper → "Add note" button).
- **Counts inline:** "Projects (1)", "+2 more", "View all" — surface quantity and overflow.
- **Headings:** light weight, sentence case, modest size; emphasis via weight 600 + color.

---

## Agent Build Instructions

Target stack (already in repo): React 18 + TS + Vite + Tailwind 3.4 + shadcn-style
HSL CSS-variable tokens + Radix + lucide-react + recharts + react-grid-layout + framer-motion.

1. **Swap the font.** Replace `Inter` with **IBM Plex Sans** in `tailwind.config.js`
   `fontFamily.sans` and `src/index.css` `body`. Add the font (self-host or Google Fonts).
2. **Re-skin the tokens, don't rebuild them.** Overwrite the HSL values in
   `src/index.css` `:root` (and `.dark`) with the triplets in this doc:
   `--primary 217 99% 53%`, `--foreground 0 0% 9%`, `--muted-foreground 0 0% 32%`,
   `--border 0 0% 88%`, `--background 0 0% 93%`, `--card 0 0% 100%`,
   `--secondary 0 0% 96%`, `--destructive 357 76% 49%`, `--success 136 64% 39%`,
   `--warning 45 89% 53%`, `--info 217 99% 53%`, `--sidebar 0 0% 91%`, `--radius 0.5rem`.
3. **Primary button = black, not primary-blue.** In the Button `cva` variants, make the
   default/primary variant `bg-foreground text-background` (near-black). Add a distinct
   `link`/`info` treatment for blue. Keep buttons compact (`h-8`, `text-sm`, `font-medium`).
4. **Tighten the type scale.** Reduce heading sizes/weights toward this doc (card titles
   `text-sm font-semibold`; KPI numbers a `text-5xl font-normal` utility). Avoid 700+.
5. **Cards:** `bg-card border border-border rounded-lg shadow-xs p-4`, small semibold header.
6. **Tables:** build/keep a dense table — `text-sm`, header `text-xs font-semibold
   text-muted-foreground`, rows `border-b border-border hover:bg-secondary`, `36–40px` tall.
7. **Status chips:** a `Badge` with `soft` variants keyed to semantic colors (blue/neutral/
   green/red/amber) per the chip table — `text-xs rounded-sm px-2 py-0.5`.
8. **Sidebar:** `48px` icon rail (`bg-sidebar`), lucide icons, active = blue icon + pill.
9. **Shadows:** keep them whisper-quiet (use `shadow-xs`/`shadow-sm`; reserve `shadow-lg`
   for modals only).
10. **Use color only for meaning.** Default everything to the neutral gray ramp; introduce
    blue/green/red/amber strictly for links, active state, and status.

---

## Rerun Inputs
```
workflow: firecrawl-website-design-clone
source_url: https://trustybytes.rocketlane.com/dashboards/5000000002249
            https://trustybytes.rocketlane.com/accounts/5000000062407/overview
            https://trustybytes.rocketlane.com/accounts/5000000062407/engagement/timeline
            https://trustybytes.rocketlane.com/projects
target_stack: React 18 + TypeScript + Vite + Tailwind 3.4 + shadcn/Radix + recharts
output: DESIGN.md
```
