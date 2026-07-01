# AGENTS.md — TeamOne

Operating guide for AI coding agents in this repository. (Claude Code reads `CLAUDE.md`;
this file mirrors the same rules for any other agent. Keep both in sync.)

## Project
TeamOne — React 18 + TypeScript + Vite frontend (`frontend/`) + Node/TS backend (`backend/`).
Frontend: Tailwind 3.4, shadcn-style HSL CSS-variable tokens, Radix, lucide-react, recharts,
react-grid-layout, framer-motion.

## Design system is mandatory for all UI work
One canonical design language: a calm, dense, data-first enterprise look based on the
**IBM Carbon Design System** (Rocketlane-inspired), softened.

- **Full spec:** `DESIGN.md`
- **Skill:** `.claude/skills/design-system/SKILL.md`

Read `DESIGN.md` before building, restyling, or reviewing any component, page, dashboard,
table, form, modal, or navigation.

### Non-negotiable rules
1. **Primary buttons are near-black** (`bg-foreground text-background`, `#161616`), **never blue.**
   Blue `#0F62FE` = links / active / info / focus only.
2. **Color signals meaning only** — neutral gray ramp by default; blue/green/red/amber strictly
   for status, links, active. No decorative color or gradients.
3. **Light & small typography** — IBM Plex Sans, 14px base; light-weight modest headings;
   emphasis via `font-semibold` + color, never 700+ or oversized.
4. **Quiet elevation** — white cards on `#ECECEC`, `1px #E0E0E0` hairline + faint `shadow-xs`;
   `shadow-lg` for modals only.
5. **Density first**, desktop-first, full-width shell; rows 36–40px; 4px spacing grid.
6. **Semantic tokens only**, never hardcoded hex (`bg-card`, `text-muted-foreground`,
   `border-border`, `bg-primary`, `bg-foreground`, …). Add missing tokens to
   `frontend/src/index.css` + `frontend/tailwind.config.js`; never inline.
7. **Light theme is canonical** — don't optimize for dark mode.

### Token quick reference
`--background #ECECEC` · `--card #FFFFFF` · `--foreground #161616` (text + primary button) ·
`--muted-foreground #525252` · `--border #E0E0E0` · `--secondary #F4F4F4` · `--sidebar #E8E8E8` ·
`--primary/--info #0F62FE` · `--destructive #DA1E28` · `--success #24A148` · `--warning #F1C21B` ·
`--radius 8px`. Font: **IBM Plex Sans**.

### Card vs List vs Table
- **Card** → single metric or grouped fields (dashboard widgets, info panels, form sections).
- **Table** → many records, same columns, sort/filter/compare (Projects, Tasks, Accounts).
- **List / feed** → ordered, scannable, text-heavy (timeline, activity, notes).

## Build & verify
- Frontend scripts in `frontend/package.json`: `npm run dev`, `npm run build`, `npm run preview`.
- Restyle via tokens (`index.css` + `tailwind.config.js`), not per-component overrides.
- Verify visual changes in the running app and check against `DESIGN.md` before finishing.

## Boundaries
- Reuse/extend existing components in `frontend/src/components/`; don't fork a second style system.
- Don't add a new font, ad-hoc colors, or a competing UI approach.
- Don't commit or push unless explicitly asked.
