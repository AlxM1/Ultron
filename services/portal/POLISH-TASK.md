# Portal Polish Task

## Reference Image & Inspiration
Alex showed a Canva "Colorful Minimalist Monthly Social Media Content" calendar + referenced Flourish.studio interactive data viz. Key traits:
- Clean monthly grid with SUN-SAT columns
- Month + year header (e.g. "FEBRUARY 2026") in bold uppercase
- Colored content blocks inside day cells — pastel colors (light pink, light blue, light purple, light yellow/amber, light green)
- Each block has a short label (e.g. agent name like "Sauron", "Nightly Pipeline")
- RIGHT SIDE has a legend panel showing "Agent Category" with color swatches + labels
- Warm, modern, minimalist aesthetic — NOT dark/techy
- INTERACTIVE: clicking a day cell should expand/highlight it and show the full schedule for that day
- INTERACTIVE: hovering over an agent block should show tooltip with schedule details
- Smooth transitions/animations on interactions (Flourish-style polish)
- The calendar should feel alive — not a static grid

## What to Fix

### 1. Calendar Redesign (PRIORITY)
File: `app/components/inotion/PortalCalendar.tsx`

Transform the monthly view to match the Canva reference:
- **Monthly view should be default** (not weekly)
- Large day cells with room for 3-4 colored event blocks
- Event blocks should be pastel-colored rounded rectangles with agent names
- Color by category: always-running = soft blue, daily = soft green, weekly = soft purple, monitoring = soft amber
- RIGHT SIDE legend panel showing category colors + labels (like the Canva "Content Type" panel)
- Clean header: "FEBRUARY 2025" in bold, with month navigation arrows
- Day numbers in top-left of each cell
- Today highlighted with a subtle ring
- Selected day expands to show full detail below
- Keep week view as a toggle option

### 2. Fix Health Panel
File: `app/components/inotion/HealthPanel.tsx` + `app/api/health-check/route.ts`

The health-check proxy route already maps localhost ports to Docker internal hostnames.
Issue: PostgreSQL (:5432) and Redis (:6379) don't respond to HTTP — they'll always show offline.
Fix: For postgres and redis, mark them as "online" by default (they don't have HTTP endpoints) or use a special check.
Also: The `/api/stats` route hardcodes `healthyServices: 0`. Wire it to actually count healthy services by calling `/api/health-check` for each service, OR just count services that the health-check reports as online.

### 3. Fix Activity Heatmap
File: `app/components/inotion/ActivityHeatmap.tsx`

Current: Generates uniform random 55-64 runs/day for 366 days. Obviously fake.
Fix: Generate realistic seed data that shows:
- System went live ~Feb 19, 2026
- Before that: 0 runs (empty/grey)
- Feb 19-20: light activity (5-15 runs — initial setup)
- Feb 21-25: ramping up (20-60 runs as more agents come online)
- After today: no data
This makes the heatmap honest — shows real timeline of when the system was built.

### 4. Fix Nav Active State
File: `app/inotion/page.tsx`

Current: Uses `window.location.pathname` which doesn't work during SSR.
Fix: Use Next.js `usePathname()` hook from `next/navigation`.

### 5. General Polish
- Make sure dark mode toggle works and is visible
- Stats cards should show data immediately (they work via client fetch, that's fine)
- Footer is good as-is

## Files to Edit
- `app/components/inotion/PortalCalendar.tsx` — major rewrite
- `app/components/inotion/ActivityHeatmap.tsx` — realistic seed data
- `app/components/inotion/HealthPanel.tsx` — fix postgres/redis checks
- `app/api/stats/route.ts` — wire healthyServices to real count
- `app/inotion/page.tsx` — fix nav active state, default to monthly

## Tech Stack
- Next.js 15, React, TypeScript, Tailwind CSS
- date-fns for date utils
- lucide-react for icons
- No additional dependencies

## Build & Test
After changes: `cd /home/eternity/.openclaw/workspace/Ultron/services/portal && npm run build`
Then restart container: `cd /home/eternity/.openclaw/workspace/Ultron && docker compose up -d --no-deps --build portal`
