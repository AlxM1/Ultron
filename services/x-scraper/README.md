# X/Twitter Scraper

Scrapes tweets from tracked creators using Twitter's public GraphQL API with guest tokens. **No API key or account required.**

## How It Works

Uses Twitter's internal GraphQL endpoints with a guest bearer token:
1. Gets a guest token via `POST /1.1/guest/activate.json`
2. Resolves handles to user IDs via `UserByScreenName` GraphQL
3. Fetches tweets via `UserTweets` GraphQL

**Note:** Returns top/popular tweets, not strictly chronological. Twitter's guest token access may be rate-limited or revoked at any time.

## Usage

```bash
python3 scraper.py                    # All tracked handles
python3 scraper.py --handle elonmusk  # Single handle
```

## DB

PostgreSQL `content_intel.x_posts` — 300 tweets from 15 creators as of initial run.

## Dependencies

```
pip install httpx psycopg2-binary
```

## Limitations

- Guest tokens may get rate-limited after ~50-100 requests
- Returns "top" tweets not strictly recent ones
- No auth = no access to protected accounts
- Twitter may deprecate guest access at any time
