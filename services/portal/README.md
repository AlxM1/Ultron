# Portal — 00raiser Admin Dashboard

**Portal** is the unified admin dashboard for the 00raiser platform. It provides a sleek, modern interface for monitoring services, viewing activity timelines, managing workflows, and overseeing content intelligence.

## Features

- **🏠 Home Dashboard** - System health overview with quick stats
- **🔧 Services Page** - Monitor all 00raiser services with health status
- **📈 Activity Timeline** - Real-time task execution monitoring from Cortex
- **⚙️ Workflows** - AgentSmith workflow orchestration and execution tracking
- **🧠 Content Intelligence** - Tracked creators, trending topics, and content ideas
- **⚙️ Settings** - API keys and service URL configuration
- **🌙 Dark Mode** - Modern, Linear/Vercel-inspired dark theme (default)

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Custom CSS
- **Charts:** Recharts
- **Icons:** Lucide React
- **Port:** 3010

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start dev server
npm run dev
```

Visit [http://localhost:3010](http://localhost:3010)

### Production

```bash
# Build
npm run build

# Start production server
npm start
```

### Docker

```bash
docker build -t raiser-portal .
docker run -p 3010:3010 \
  -e CORTEX_API_KEY=your-api-key \
  -e NEXT_PUBLIC_CORTEX_URL=http://cortex:3011 \
  raiser-portal
```

## Environment Variables

```bash
PORT=3010
NEXT_PUBLIC_CORTEX_URL=http://localhost:3011
NEXT_PUBLIC_AGENTSMITH_URL=http://localhost:4000
NEXT_PUBLIC_CONTENT_INTEL_URL=http://localhost:3012
CORTEX_API_KEY=your-secret-api-key
```

## Dashboard Pages

### 1. Home / Overview Dashboard
- System health cards (active services, completed/failed tasks)
- Quick stats from all services
- Recent activity timeline (last 5 tasks)
- Quick access buttons to all pages

### 2. Services Page
- List of all 00raiser services with real-time status
- Service metrics (total tasks, success rate, avg duration)
- Last activity timestamps
- Quick actions (restart, view logs - placeholders)

### 3. Content Intelligence Page
- Tracked creators with platform stats
- Trending topics visualization
- Content idea backlog (sortable by score/date)
- Approve/reject workflow for ideas
- Filter by status (all/pending/approved/rejected)

### 4. Cortex Activity Timeline
- Real-time task execution feed
- Filter by service and status
- Task detail panel with full metadata
- Auto-refresh every 15 seconds

### 5. AgentSmith Workflows Page
- Active and completed workflows list
- Workflow execution monitoring
- Execution detail view with step status
- Tabs for Workflows and Executions

### 6. Settings Page
- API key management (masked display)
- Service URLs configuration
- Theme toggle (dark/light) - coming soon
- Local storage persistence

## API Integration

Portal connects to the following services:

- **Cortex API** (`/api/tasks`, `/api/timeline`, `/api/services`)
- **AgentSmith API** (`/api/v1/workflows`, `/api/v1/executions`)
- **Content Intel API** (mock data for now)

All API calls gracefully degrade if services are offline.

## UI Design

- **Dark mode** by default (matches the "vibe")
- **Responsive** - works on mobile, tablet, desktop
- **Glass morphism** effects throughout
- **Accent color:** Cyan (#4af3ff)
- **Inspired by:** Linear, Vercel Dashboard, macOS Big Sur

## Navigation

- **Menu Bar** - Top navigation with quick links to all pages
- **Dock** - Bottom macOS-style dock for service access
- **Breadcrumbs** - Current location indicator

## Keyboard Shortcuts

- `Cmd/Ctrl + H` - Go home
- `Cmd/Ctrl + 1-9` - Open service 1-9
- `Escape` - Close active app

## Authentication

- Simple password/API key gate (placeholder)
- No OAuth or user management (single admin)

## Development Notes

- Uses Next.js App Router (not Pages Router)
- Client components for interactivity (`"use client"`)
- Dynamic imports for heavy components (JarvisHUD)
- Auto-refresh intervals for real-time data
- Local storage for settings persistence

## Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] Light mode implementation
- [ ] Advanced filtering and search
- [ ] Export data (CSV, JSON)
- [ ] Custom dashboards/widgets
- [ ] Mobile app (React Native)
- [ ] Multi-user support with roles

## License

MIT
