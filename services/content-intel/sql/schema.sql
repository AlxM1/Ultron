-- =============================================================================
-- Content Intelligence Database Schema
-- =============================================================================

-- Tracked content creators (YouTube channels, Twitter/X profiles)
CREATE TABLE IF NOT EXISTS creators (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('youtube', 'twitter')),
  handle VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  subscriber_count INTEGER DEFAULT 0,
  last_scraped_at TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(platform, handle)
);

CREATE INDEX idx_creators_platform ON creators(platform);
CREATE INDEX idx_creators_last_scraped ON creators(last_scraped_at);

-- Scraped content (videos, tweets)
CREATE TABLE IF NOT EXISTS content (
  id SERIAL PRIMARY KEY,
  creator_id INTEGER REFERENCES creators(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL,
  external_id VARCHAR(255) NOT NULL,
  title TEXT,
  description TEXT,
  published_at TIMESTAMP,
  metrics JSONB DEFAULT '{}', -- views, likes, comments, retweets, etc.
  scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(platform, external_id)
);

CREATE INDEX idx_content_creator ON content(creator_id);
CREATE INDEX idx_content_platform ON content(platform);
CREATE INDEX idx_content_published ON content(published_at DESC);
CREATE INDEX idx_content_scraped ON content(scraped_at DESC);

-- Comments from videos/posts
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  content_id INTEGER REFERENCES content(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  author VARCHAR(255),
  likes INTEGER DEFAULT 0,
  scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comments_content ON comments(content_id);
CREATE INDEX idx_comments_likes ON comments(likes DESC);

-- Trending topics and keywords
CREATE TABLE IF NOT EXISTS trends (
  id SERIAL PRIMARY KEY,
  keyword VARCHAR(255) NOT NULL UNIQUE,
  frequency INTEGER DEFAULT 1,
  first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  score NUMERIC(5,2) DEFAULT 0,
  category VARCHAR(100)
);

CREATE INDEX idx_trends_keyword ON trends(keyword);
CREATE INDEX idx_trends_score ON trends(score DESC);
CREATE INDEX idx_trends_last_seen ON trends(last_seen DESC);

-- Content ideas generated from analysis
CREATE TABLE IF NOT EXISTS ideas (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  source_content_ids INTEGER[] DEFAULT '{}',
  score NUMERIC(5,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'approved', 'in_production', 'published')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ideas_status ON ideas(status);
CREATE INDEX idx_ideas_score ON ideas(score DESC);
CREATE INDEX idx_ideas_created ON ideas(created_at DESC);

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER creators_updated_at
  BEFORE UPDATE ON creators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER ideas_updated_at
  BEFORE UPDATE ON ideas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
