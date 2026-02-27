# Costs Page Specification — `/inotion/costs`

## Overview
Real-time token usage and cost tracking per agent per day. Displays in both USD and CAD.

## Data Source
- OpenClaw session logs via `collect-costs.py` (writes to JSON)
- Token prices (per 1M tokens):
  - **Opus 4.6**: $15 input / $75 output / $1.50 cache read
  - **Sonnet 4.6**: $3 input / $15 output / $0.30 cache read
  - **Haiku 4.6**: $0.25 input / $1.25 output / $0.03 cache read
- USD→CAD rate: fetch from `https://open.er-api.com/v6/latest/USD` or fallback 1.44

## API Route: `/api/costs`

### Response Schema
```json
{
  "period": "2026-02-25",
  "cadRate": 1.44,
  "resetTime": "Thursday 07:00 AM PST",
  "totalTokensIn": 1250000,
  "totalTokensOut": 89000,
  "totalCostUSD": 12.45,
  "totalCostCAD": 17.93,
  "agents": [
    {
      "name": "Sauron",
      "model": "anthropic/claude-sonnet-4-6",
      "tokensIn": 45000,
      "tokensOut": 3200,
      "cacheRead": 120000,
      "costUSD": 0.18,
      "costCAD": 0.26,
      "runs": 96,
      "lastRun": "2026-02-25T17:00:00Z"
    }
  ],
  "daily": [
    { "date": "2026-02-19", "costUSD": 2.10, "costCAD": 3.02, "runs": 45 },
    { "date": "2026-02-20", "costUSD": 5.30, "costCAD": 7.63, "runs": 120 },
    { "date": "2026-02-21", "costUSD": 8.90, "costCAD": 12.82, "runs": 180 },
    { "date": "2026-02-22", "costUSD": 11.20, "costCAD": 16.13, "runs": 210 },
    { "date": "2026-02-23", "costUSD": 15.40, "costCAD": 22.18, "runs": 280 },
    { "date": "2026-02-24", "costUSD": 9.80, "costCAD": 14.11, "runs": 190 },
    { "date": "2026-02-25", "costUSD": 12.45, "costCAD": 17.93, "runs": 220 }
  ]
}
```

## Page Layout

### Header
- Same nav bar as dashboard (Dashboard, Creators, Agents, Knowledge, **Costs** [active], Roadmap)
- Page title: "Cost Intelligence"
- Subtitle: "Token usage and spend across all autonomous agents. Resets weekly on Thursday 07:00 AM PST."

### Section 1: Summary Cards (top row, 4 cards)
| Card | Value | Subtext |
|------|-------|---------|
| TODAY'S SPEND | $12.45 USD | $17.93 CAD |
| WEEKLY SPEND | $65.15 USD | $93.82 CAD |
| TOKENS TODAY | 1.34M | 1.25M in / 89K out |
| BUDGET REMAINING | 42% | Resets Thu 07:00 AM |

- Cards use same style as dashboard StatsCards
- Budget remaining shows a progress bar (green > 50%, amber 20-50%, red < 20%)

### Section 2: 7-Day Spend Chart
- Horizontal bar chart or area chart showing daily spend (last 7 days)
- Dual Y-axis or toggle: USD / CAD
- X-axis: dates (Feb 19 — Feb 25)
- Bars colored by gradient (light to dark based on spend amount)
- Hover tooltip: date, total cost USD, total cost CAD, number of runs
- Built with pure CSS/Tailwind (no chart library needed — use div bars with % width)

### Section 3: Agent Cost Table (main section, full width)
- Sortable table columns:
  | Agent | Model | Runs Today | Tokens In | Tokens Out | Cache | Cost USD | Cost CAD |
  |-------|-------|-----------|-----------|------------|-------|----------|----------|
  | Sauron | sonnet-4-6 | 96 | 45K | 3.2K | 120K | $0.18 | $0.26 |
  | Nightly Pipeline | sonnet-4-6 | 1 | 280K | 12K | 0 | $1.02 | $1.47 |
  | Main Session | opus-4-6 | — | 890K | 45K | 510K | $4.13 | $5.95 |

- Click column headers to sort
- Hover tooltip on each row: agent description + "Click to view in Wiki"
- Click row → opens wiki page for that agent
- Color-code the cost column: green (< $0.50), amber ($0.50-$2), red (> $2)
- Show model as a small pill badge (opus = red pill, sonnet = blue pill, haiku = green pill)
- Token counts formatted: 1.2M, 45K, 890K (human-readable)
- Footer row: TOTAL with summed values

### Section 4: Cost by Category (pie/donut or horizontal stacked bar)
- Categories: Monitoring, Cron Jobs, Content Pipeline, AI/Analysis, Maintenance, Interactive (main session)
- Same color palette as calendar categories
- Shows what percentage of spend goes where
- Pure CSS donut chart (conic-gradient) — no libraries

### Section 5: Token Reset Countdown
- Small banner at bottom: "Next token reset in 13h 42m — Thursday 07:00 AM PST"
- Counts down live (client-side interval)
- When < 2 hours: turns amber. When < 30 min: turns green ("Almost there!")

## Design Notes
- Light and dark mode (same pattern as dashboard)
- Zero emojis in content
- Professional, investor-grade
- All currency formatted with `$` prefix, 2 decimal places
- CAD shown in smaller text or as secondary value
- Tooltips on every interactive element
- Every agent row links to INotion wiki: `https://inotion.00raiser.space/search/{agentName}`

## Files to Create/Modify
1. **NEW** `app/api/costs/route.ts` — API route fetching cost data
2. **NEW** `app/inotion/costs/page.tsx` — Costs page component
3. **NEW** `app/components/inotion/CostChart.tsx` — 7-day spend visualization
4. **NEW** `app/components/inotion/CostTable.tsx` — Sortable agent cost table
5. **NEW** `app/components/inotion/TokenResetCountdown.tsx` — Live countdown

## Data Pipeline (separate task)
- `tools/collect-costs.py` already exists — needs to write per-agent daily breakdown
- Store in `/home/eternity/.openclaw/workspace/data/cost-logs/YYYY-MM-DD.json`
- API route reads these JSON files
- For V1: use seed data matching the schema above. Wire real data in V2.

## Build & Deploy
```bash
cd /home/eternity/.openclaw/workspace/Ultron/services/portal && npm run build
cd /home/eternity/.openclaw/workspace/Ultron && docker compose up -d --no-deps --build portal
```
