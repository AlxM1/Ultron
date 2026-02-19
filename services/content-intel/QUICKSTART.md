# Content Intelligence Scraper - Quick Start Guide

## Prerequisites

The service is already integrated into the 00raiser docker-compose stack. You just need to configure environment variables.

## Setup (5 minutes)

### 1. Add Environment Variables

Add these to your `/home/eternity/.openclaw/workspace/Ultron/.env` file:

```bash
# Content Intel API Key (generate a secure random key)
CONTENT_INTEL_API_KEY=$(openssl rand -hex 32)

# Content Intel Database Password
CONTENT_INTEL_DB_PASSWORD=$(openssl rand -hex 16)

# YouTube Data API (optional - service works without it via scraping)
YOUTUBE_API_KEY=your-youtube-api-key-here
```

Or run this to auto-generate:

```bash
cd /home/eternity/.openclaw/workspace/Ultron
echo "" >> .env
echo "# Content Intelligence Scraper" >> .env
echo "CONTENT_INTEL_API_KEY=$(openssl rand -hex 32)" >> .env
echo "CONTENT_INTEL_DB_PASSWORD=$(openssl rand -hex 16)" >> .env
```

### 2. Start the Service

```bash
cd /home/eternity/.openclaw/workspace/Ultron

# Start postgres first (if not already running)
docker compose up -d postgres

# Wait for postgres to be healthy
docker compose ps postgres

# Start content-intel service
docker compose up -d content-intel

# Check logs
docker compose logs -f content-intel
```

You should see:
```
✓ Database initialized
✓ Content Intelligence Scraper running on port 3015
✓ Health check: http://localhost:3015/health
```

### 3. Seed the Database

Load the 30 pre-configured creators (20 YouTube + 10 Twitter):

```bash
docker exec raiser-content-intel node seed/seed.js
```

You should see creators being added:
```
✓ Added YouTube creator: Matt Wolfe (@mreflow)
✓ Added YouTube creator: Fireship (@Fireship)
...
✓ Seeding complete! Added 30 creators.
```

### 4. Test the Service

```bash
# Get your API key
API_KEY=$(grep CONTENT_INTEL_API_KEY .env | cut -d= -f2)

# Health check
curl http://localhost:3015/health

# List creators
curl -H "X-API-Key: $API_KEY" \
  http://localhost:3015/api/creators

# Scrape first creator
curl -X POST -H "X-API-Key: $API_KEY" \
  http://localhost:3015/api/scrape/1
```

## First Run Workflow

### 1. Scrape All Creators (Takes ~10-20 minutes)

```bash
API_KEY=$(grep CONTENT_INTEL_API_KEY .env | cut -d= -f2)

curl -X POST -H "X-API-Key: $API_KEY" \
  http://localhost:3015/api/scrape/all
```

This will:
- Scrape all 30 creators
- Collect recent videos/posts
- Download top 50 comments per video
- Store everything in the database

### 2. Analyze Trends

```bash
curl -X POST -H "X-API-Key: $API_KEY" \
  http://localhost:3015/api/trends/analyze?days=7
```

This extracts keywords, identifies patterns, and scores trends.

### 3. Generate Content Ideas

```bash
curl -X POST -H "X-API-Key: $API_KEY" \
  http://localhost:3015/api/ideas/generate?limit=20
```

This auto-generates 20 scored content ideas based on trending topics.

### 4. View Results

```bash
# Top trends
curl -H "X-API-Key: $API_KEY" \
  "http://localhost:3015/api/trends?limit=20"

# Best ideas (score >= 50)
curl -H "X-API-Key: $API_KEY" \
  "http://localhost:3015/api/ideas?min_score=50"

# Content gaps (high opportunity, low competition)
curl -H "X-API-Key: $API_KEY" \
  "http://localhost:3015/api/analysis/gaps?limit=10"

# Top engaging content
curl -H "X-API-Key: $API_KEY" \
  "http://localhost:3015/api/analysis/engagement?limit=10"
```

## Recommended Automation

Set up a cron job or use Cortex to automate:

```bash
# Every 6 hours - Scrape all creators
0 */6 * * * curl -X POST -H "X-API-Key: $API_KEY" http://localhost:3015/api/scrape/all

# Daily at 8 AM - Analyze trends
0 8 * * * curl -X POST -H "X-API-Key: $API_KEY" http://localhost:3015/api/trends/analyze

# Daily at 8:30 AM - Generate ideas
30 8 * * * curl -X POST -H "X-API-Key: $API_KEY" http://localhost:3015/api/ideas/generate?limit=20
```

## Troubleshooting

### Service won't start
```bash
# Check logs
docker compose logs content-intel

# Check if postgres is healthy
docker compose ps postgres

# Restart service
docker compose restart content-intel
```

### Scraping fails
```bash
# Check if Apify service is running
docker compose ps apify

# Check logs
docker compose logs apify

# Try scraping a single creator first
curl -X POST -H "X-API-Key: $API_KEY" \
  http://localhost:3015/api/scrape/1
```

### Database connection issues
```bash
# Verify environment variables
grep CONTENT_INTEL .env

# Check database exists
docker exec raiser-postgres psql -U postgres -l | grep content_intel

# Manually create if needed
docker exec raiser-postgres psql -U postgres -c \
  "CREATE DATABASE content_intel OWNER content_intel;"
```

## API Documentation

Full API documentation available at:
- **README.md** - Complete endpoint reference
- **Root endpoint** - `curl http://localhost:3015/ -H "X-API-Key: $API_KEY"`

## Next Steps

1. **Add more creators** - `POST /api/creators`
2. **Set up automation** - Cron jobs or Cortex integration
3. **Build dashboard** - Embed in Portal
4. **Export reports** - Use API data for weekly reports
5. **Integrate with content pipeline** - Feed ideas to newsletter service

## Support

For issues, check:
- Service logs: `docker compose logs content-intel`
- Database: `docker exec raiser-postgres psql -U content_intel -d content_intel`
- Health: `curl http://localhost:3015/health`

---

**You're all set!** The Content Intelligence Scraper is now monitoring top creators and generating content insights automatically. 🚀
