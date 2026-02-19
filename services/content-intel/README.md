# Content Intelligence Scraper

**Continuous monitoring and analysis of top content creators across YouTube and X/Twitter.**

Part of the 00raiser platform - intelligently tracks content trends, identifies opportunities, and generates scored content ideas.

## Features

### 📊 Multi-Platform Scraping
- **YouTube**: Channels, videos, comments, metrics (views, likes, duration)
- **Twitter/X**: Profiles, posts, threads, engagement (likes, retweets, replies)

### 🧠 Intelligent Analysis
- **Trend Extraction**: Identifies buzzwords and recurring themes
- **Content Scoring**: Evaluates ideas by relevance, timeliness, uniqueness, competition
- **Gap Analysis**: Finds trending topics with low competition
- **Performance Tracking**: Monitors creator engagement and content effectiveness

### 🔐 Security
- API key authentication
- Rate limiting (100 req/min per key)
- Input validation
- No information leakage in error messages

## Quick Start

### Installation

```bash
cd services/content-intel
npm install
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://content_intel:password@postgres:5432/content_intel

# API Security
CONTENT_INTEL_API_KEY=your-secure-api-key-here

# External Services
APIFY_SCRAPER_URL=http://raiser-apify:8400
YOUTUBE_API_KEY=optional-youtube-data-api-v3-key

# Server
PORT=3015
NODE_ENV=production
```

### Run Locally

```bash
npm start
```

### Docker

```bash
docker build -t raiser-content-intel .
docker run -p 3015:3015 --env-file .env raiser-content-intel
```

### Seed Data

Load the 20 YouTube channels and 10 Twitter profiles:

```bash
node seed/seed.js
```

## API Endpoints

All endpoints require `X-API-Key` header (except `/health`).

### Health Check
```
GET /health
```

### Creators
```
POST   /api/creators          - Add creator to track
GET    /api/creators          - List tracked creators
GET    /api/creators/:id      - Get creator details
DELETE /api/creators/:id      - Remove creator
```

### Scraping
```
POST /api/scrape/:creatorId   - Scrape specific creator
POST /api/scrape/all          - Scrape all tracked creators
```

### Content
```
GET /api/content              - List scraped content (with filters)
GET /api/content/:id          - Get content details with comments
```

### Trends
```
GET  /api/trends              - Current trending topics
POST /api/trends/analyze      - Analyze recent content, update trends
GET  /api/trends/categories   - Trend categories summary
```

### Ideas
```
GET    /api/ideas             - List content ideas (sorted by score)
POST   /api/ideas             - Create new idea
PATCH  /api/ideas/:id         - Update idea status/score
DELETE /api/ideas/:id         - Delete idea
POST   /api/ideas/generate    - Auto-generate ideas from trends
```

### Analysis
```
GET /api/analysis/gaps        - Content gap opportunities
GET /api/analysis/performance - Creator performance metrics
GET /api/analysis/engagement  - Top engaging content
GET /api/analysis/keywords    - Top keywords analysis
```

## Example Usage

### Add a Creator

```bash
curl -X POST http://localhost:3015/api/creators \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "youtube",
    "handle": "Fireship",
    "name": "Fireship"
  }'
```

### Scrape All Creators

```bash
curl -X POST http://localhost:3015/api/scrape/all \
  -H "X-API-Key: your-api-key"
```

### Analyze Trends

```bash
curl -X POST http://localhost:3015/api/trends/analyze \
  -H "X-API-Key: your-api-key"
```

### Generate Ideas

```bash
curl -X POST http://localhost:3015/api/ideas/generate?limit=20 \
  -H "X-API-Key: your-api-key"
```

### Get Content Gaps

```bash
curl http://localhost:3015/api/analysis/gaps?limit=10 \
  -H "X-API-Key: your-api-key"
```

## Database Schema

- **creators**: Tracked YouTube channels and Twitter profiles
- **content**: Scraped videos and posts with metadata
- **comments**: Video/post comments (top 50 per item)
- **trends**: Extracted keywords with frequency and scoring
- **ideas**: Generated content ideas with status tracking

## Scoring Algorithm

Ideas are scored using:

```
Score = (Relevance×2 + Timeliness + Uniqueness×2 + ClientFunnel) 
        - (Competition + ProductionEffort)
```

All factors rated 1-10, normalized to 0-100 scale.

## Integration with 00raiser

This service integrates with:
- **Apify Scraper** - YouTube and Twitter data collection
- **Cortex** - Activity tracking
- **Portal** - Dashboard integration
- **PostgreSQL** - Shared database backbone

## License

Part of 00raiser platform. MIT License.
