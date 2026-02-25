# Portal Dashboard — Build Spec

## Vision
This is the investor-facing showcase for the 00Raiser AI platform. One founder, 17 autonomous AI agents, 24/7 operations. Every screen must be sleek, professional, and modern. Think pitch deck quality.

## Design Requirements
- Light and dark mode toggle (mandatory)
- Zero emojis in the UI
- Clean typography, generous whitespace
- Responsive (desktop primary, mobile secondary)
- Tailwind CSS (already in project)
- All data from real APIs (PostgreSQL, Outline, OpenClaw)

## Home Page — The Dashboard
The main landing page. Everything at a glance.

### 1. Interactive Calendar (TOP PRIORITY)
- Weekly and monthly view toggle
- All 17 cron/agent jobs plotted on the calendar
- Click any job → routes to its detail page showing logs, output, status
- Color-coded by category: always-running (blue), daily (green), weekly (purple)
- Show job status: completed (solid), failed (red), upcoming (outline)

### 2. Stats Cards Row
- Total creators tracked (42)
- Total transcripts (521)
- Active agents (17)
- Total content items (8,299)
- Today's cost ($X.XX)
- System health (19/19 healthy)

### 3. Live Agent Activity Feed
- Real-time view of what's running right now
- Recent completions with timestamps
- Scrollable, latest on top

### 4. System Health Panel
- Green/yellow/red indicators for all 19 services
- Click any service → shows container details, uptime, port

### 5. Activity Heatmap
- Like GitHub's contribution graph but for agent activity
- Shows the machine never sleeps
- 365-day view, intensity = number of agent runs

## Creator Intelligence Page
- Creator cards in a grid
- Each card: name, platform, video count, transcript count, coverage %
- Click a creator → full profile page with themes, audience, style, strategic value
- Search/filter by name
- Board of Directors section at top

## Agent Schedule Page
- Full calendar view (reuse calendar component)
- Agent roster table with roles, schedules, models, status
- Click any agent → detail page with run history

## Search
- Global search bar in the header
- Searches transcripts, articles, creator profiles, documents via Outline API
- Results show document title, collection, snippet, link to INotion

## Cost Tracker Page
- Daily/weekly/monthly spend visualization (chart)
- Breakdown by model (Opus vs Sonnet)
- Token usage over time
- Budget alerts

## Timeline / Milestones
- Visual project timeline
- Gantt-style or vertical timeline
- Key milestones with dates
- World Mobile go-live Sept/Oct 2026 as the anchor event

## "Meet the Team" Page
- Alex as founder (top)
- 17 AI agents below, each with:
  - Name and role
  - Schedule
  - Tasks completed count
  - Uptime/active since
  - Brief description

## API Endpoints Needed
The portal needs backend API routes to pull real data:

### Already available:
- Outline API: http://localhost:3010/api (docs, search, collections)
- PostgreSQL: content_intel DB (creators, content, transcripts)

### Need to create (Next.js API routes):
- GET /api/agents — list all agents with status (parse from OpenClaw cron list)
- GET /api/health — all container health status (docker API)
- GET /api/stats — aggregate stats (DB queries)
- GET /api/costs — cost data from memory/cost-logs/
- GET /api/search — proxy to Outline search API
- GET /api/creators — creator list with stats from DB
- GET /api/creators/[name] — individual creator profile

### Database connection:
- PostgreSQL at localhost:5432 (or raiser-postgres:5432 from Docker network)
- Database: content_intel
- User: content_intel / password from CONTENT_INTEL_DB_PASSWORD env var
- Tables: creators, content, transcripts

## Existing Code
The portal already has components — review them first, reuse what works, rebuild what doesn't. Key existing:
- Dashboard.tsx, CostDashboard.tsx, JarvisHUD.tsx
- ServicesPage, ContentIntelPage, TimelinePage, WorkflowsPage, RoadmapPage
- Tailwind + Next.js 15 already configured
- Docker container: raiser-portal on port 3020

## Priority Order
1. Home page with calendar + stats + health panel
2. Creator Intelligence page with cards + search
3. Light/dark mode toggle
4. Search bar
5. Agent Schedule page
6. Cost tracker
7. Meet the Team
8. Timeline/milestones

## DO NOT
- Add emojis anywhere
- Use placeholder/mock data if real data is available
- Break existing functionality
- Change the Docker setup
