# Calendar V2 — Interactive Dot Timeline

## Design Philosophy
Investor-friendly. Someone with zero context should immediately understand what's happening. Clean, minimal, interactive. Think Flourish.studio-level polish.

## Architecture

### Monthly Grid
- Clean spacious day cells with generous padding
- Day number in top-left corner, small and subtle
- Today's cell has a subtle highlight (light blue tint in light mode, subtle zinc-800 in dark)
- Days outside current month are very faded (opacity-20)
- Grid lines should be ultra-thin (1px zinc-200 light / zinc-800 dark)

### Dots System (CORE FEATURE)
Each cell contains small colored dots representing scheduled agent runs:
- Dots are positioned **vertically** to represent time of day — morning runs near top, evening near bottom
- Each dot is ~6-8px diameter
- Dots have a subtle shadow/glow matching their color
- Multiple dots at the same hour stack horizontally
- Maximum ~8-10 visible dots per cell; if more, show a small "+N" indicator

### Color Palette (vibrant but professional)
Use these EXACT colors — they must look great in BOTH light and dark mode:
- **Amber/Gold** (#F59E0B / amber-500) — Cron jobs (scheduled tasks): nightly-pipeline, daily-cost-report, daily-todo-report, weekly-data-retention, data-retention-dry-run, self-audit, replicator
- **Blue** (#3B82F6 / blue-500) — Monitoring: sauron, watchdog, health-monitor, supervisor
- **Emerald** (#10B981 / emerald-500) — Content pipeline: youtube-scraper, content-intel-sync, batch-captions
- **Violet** (#8B5CF6 / violet-500) — AI/Analysis: persona-pipeline, scorpion (security), brain-sync
- **Rose** (#F43F5E / rose-500) — System maintenance: backup, cost-tracker, log-rotation

In LIGHT mode: dots use the 500 shade, backgrounds use 50 shade
In DARK mode: dots use the 400 shade, backgrounds use 900/20 shade

### Legend Panel (right side, sticky)
- Small, discrete, always visible while scrolling the calendar
- Title: "Agent Categories" in small uppercase tracking-widest
- Each category: colored circle (12px) + category name + count of agents
- Clickable — clicking a category FILTERS the calendar to only show that category's dots (toggle)
- Active filter shown with subtle highlight on the legend item
- "Show All" link at bottom when filtered

### Interactions

#### Hover → Tooltip
When hovering a dot:
- Show a clean tooltip (not browser native — custom React tooltip)
- Content: Agent name, schedule description (e.g. "Every 15 min"), category
- Tooltip has a subtle shadow and rounded corners
- Appears with a fast fade-in (150ms)
- Arrow pointing to the dot

#### Click → Zoom Bubble (THE KEY FEATURE)
When clicking a dot:
1. The dot smoothly SCALES UP (transform: scale) into a rounded card/bubble
2. The bubble overlays the calendar (position: absolute, z-50)
3. Smooth animation: 200-300ms ease-out scale + fade
4. Bubble content:
   - Agent name (bold, colored by category)
   - Schedule: "Daily at 09:00 PM" or "Every 15 minutes"
   - Category badge (small pill with color)
   - Status indicator: green dot + "Active" or red dot + "Failed"  
   - Last run: relative time ("2h ago")
   - Description: one-line summary of what the agent does
   - **"View in Wiki →" hyperlink** — links to the INotion wiki page for this agent/cron job
   - Wiki URL format: `https://inotion.00raiser.space/doc/{slug}` or fallback to `https://inotion.00raiser.space/search/{agent-name}`
5. Click outside or press Escape to close (bubble scales back down to dot)
6. Only one bubble open at a time

#### Wiki Links
Every agent/cron job bubble must include a hyperlink to INotion wiki:
- Link text: "View details in Wiki →"
- Opens in new tab (target="_blank")
- URL: construct from agent name → search URL on INotion
- Format: `https://inotion.00raiser.space/search/${encodeURIComponent(agentName)}`
- Style: small text, underline on hover, colored by category

### Header
- "FEBRUARY 2026" — bold, uppercase, tracking-wide
- Left/right arrows for month navigation (subtle, rounded buttons)
- "Today" button to snap back
- Month/Week view toggle (keep both, default to Month)

### Agent Data
The `/api/agents` endpoint already returns all agent data. Each agent has:
- id, name, role, schedule (cron expression), scheduleDesc, category, model, status, description

Map categories for coloring:
- "always-running" → Blue (Monitoring)
- "daily" → check the agent name/role to determine: pipeline agents → Emerald, maintenance → Rose, scheduled tasks → Amber
- "weekly" → Amber (Cron jobs)

Actually, to keep it simple and correct, add a `colorCategory` mapping in the component:
```
const AGENT_COLOR_MAP: Record<string, string> = {
  "health-monitor": "monitoring",
  "cortex-monitor": "monitoring",  
  "sauron": "monitoring",
  "watchdog": "monitoring",
  "supervisor": "monitoring",
  "agentsmith-orchestrator": "monitoring",
  "nightly-pipeline": "cron",
  "daily-cost-report": "cron",
  "daily-todo-report": "cron",
  "weekly-data-retention": "cron",
  "data-retention-dry-run": "cron",
  "self-audit": "cron",
  "replicator": "cron",
  "inotion-sync": "cron",
  "youtube-scraper": "pipeline",
  "content-intel": "pipeline",
  "batch-captions": "pipeline",
  "creator-intelligence": "pipeline",
  "persona-pipeline": "ai",
  "scorpion": "ai",
  "brain-sync": "ai",
  "backup-system": "maintenance",
  "cost-tracker": "maintenance",
  "newsletter-pipeline": "pipeline",
};
```
Default unmapped agents to "cron" (amber).

### Dark Mode / Light Mode (CRITICAL)
Both modes must look equally polished:

**Light mode:**
- Background: white (#FFFFFF)
- Grid lines: zinc-200
- Day numbers: zinc-600
- Dots: vivid 500-shade colors
- Bubble background: white with shadow-lg
- Legend background: zinc-50 with zinc-200 border
- Today highlight: blue-50 background

**Dark mode:**
- Background: zinc-950
- Grid lines: zinc-800
- Day numbers: zinc-400
- Dots: bright 400-shade colors with subtle glow (box-shadow: 0 0 6px color/30)
- Bubble background: zinc-900 with zinc-700 border
- Legend background: zinc-900 with zinc-800 border
- Today highlight: blue-950/50 background

### Files to Modify
1. `app/components/inotion/PortalCalendar.tsx` — COMPLETE REWRITE with dot timeline system
2. `app/inotion/page.tsx` — ensure calendar section has enough height, fix any layout issues preventing scroll

### DO NOT modify these files (they're already fixed):
- ActivityHeatmap.tsx
- HealthPanel.tsx  
- StatsCards.tsx
- api/stats/route.ts

### Build & Deploy
After changes:
```bash
cd /home/eternity/.openclaw/workspace/Ultron/services/portal && npm run build
cd /home/eternity/.openclaw/workspace/Ultron && docker compose up -d --no-deps --build portal
```

### Quality Bar
This must look like it belongs in a pitch deck. An investor clicking through this calendar should think "this is a real, sophisticated operation" — not "this is a developer's side project."
