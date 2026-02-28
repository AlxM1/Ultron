#!/usr/bin/env python3
"""
X/Twitter Scraper - Uses Twitter's GraphQL API with guest tokens.
No API key required. No account required.

Usage:
  python3 scraper.py              # Scrape all handles
  python3 scraper.py --handle elonmusk   # Single handle
"""

import json
import os
import sys
import time
import urllib.parse
import argparse
from datetime import datetime
from typing import Optional

import httpx
import psycopg2

from config import DB_CONFIG, HANDLES, TWEETS_PER_USER

BEARER = "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"

FEATURES = {
    "rweb_tipjar_consumption_enabled": True,
    "responsive_web_graphql_exclude_directive_enabled": True,
    "verified_phone_label_enabled": False,
    "creator_subscriptions_tweet_preview_api_enabled": True,
    "responsive_web_graphql_timeline_navigation_enabled": True,
    "responsive_web_graphql_skip_user_profile_image_extensions_enabled": False,
    "communities_web_enable_tweet_community_results_fetch": True,
    "c9s_tweet_anatomy_moderator_badge_enabled": True,
    "articles_preview_enabled": True,
    "responsive_web_edit_tweet_api_enabled": True,
    "graphql_is_translatable_rweb_tweet_is_translatable_enabled": True,
    "view_counts_everywhere_api_enabled": True,
    "longform_notetweets_consumption_enabled": True,
    "responsive_web_twitter_article_tweet_consumption_enabled": True,
    "tweet_awards_web_tipping_enabled": False,
    "creator_subscriptions_quote_tweet_preview_enabled": False,
    "freedom_of_speech_not_reach_fetch_enabled": True,
    "standardized_nudges_misinfo": True,
    "tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled": True,
    "rweb_video_timestamps_enabled": True,
    "longform_notetweets_rich_text_read_enabled": True,
    "longform_notetweets_inline_media_enabled": True,
    "responsive_web_enhance_cards_enabled": False,
}


class TwitterScraper:
    def __init__(self):
        self.client = httpx.Client(timeout=15, follow_redirects=True)
        # Use authenticated session if cookies available, else fall back to guest token
        auth_token = os.environ.get("X_AUTH_TOKEN", "")
        ct0 = os.environ.get("X_CT0", "")
        # Fallback: read from credentials file
        if not auth_token or not ct0:
            creds_path = os.path.expanduser("~/.openclaw/.credentials")
            if os.path.exists(creds_path):
                with open(creds_path) as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("X_AUTH_TOKEN="):
                            auth_token = line.split("=", 1)[1]
                        elif line.startswith("X_CT0="):
                            ct0 = line.split("=", 1)[1]
        self.authenticated = bool(auth_token and ct0)
        self.headers = {
            "Authorization": BEARER,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }
        if self.authenticated:
            self.headers["x-csrf-token"] = ct0
            self.client.cookies.set("auth_token", auth_token, domain=".x.com")
            self.client.cookies.set("ct0", ct0, domain=".x.com")
            print("[auth] Using authenticated session")
        else:
            self.guest_token = None
            self._refresh_guest_token()
            print("[auth] Using guest token (limited)")

    def _refresh_guest_token(self):
        if self.authenticated:
            return
        resp = self.client.post(
            "https://api.twitter.com/1.1/guest/activate.json",
            headers=self.headers,
        )
        resp.raise_for_status()
        self.guest_token = resp.json()["guest_token"]
        self.headers["x-guest-token"] = self.guest_token

    def _graphql_get(self, endpoint: str, variables: dict) -> dict:
        params = urllib.parse.urlencode({
            "variables": json.dumps(variables),
            "features": json.dumps(FEATURES),
        })
        base = "https://x.com" if self.authenticated else "https://twitter.com"
        resp = self.client.get(
            f"{base}/i/api/graphql/{endpoint}?{params}",
            headers=self.headers,
        )
        if resp.status_code == 429:
            print("  Rate limited, waiting 30s...")
            time.sleep(30)
            if not self.authenticated:
                self._refresh_guest_token()
            resp = self.client.get(
                f"{base}/i/api/graphql/{endpoint}?{params}",
                headers=self.headers,
            )
        resp.raise_for_status()
        return resp.json()

    def get_user_id(self, handle: str) -> Optional[str]:
        try:
            data = self._graphql_get("xc8f1g7BYqr6VTzTbvNlGw/UserByScreenName", {
                "screen_name": handle,
                "withSafetyModeUserFields": True,
            })
            return data["data"]["user"]["result"]["rest_id"]
        except Exception as e:
            print(f"  Failed to get user ID for @{handle}: {e}")
            return None

    def get_user_tweets(self, handle: str, user_id: str) -> list[dict]:
        try:
            data = self._graphql_get("E3opETHurmVJflFsUBVuUQ/UserTweets", {
                "userId": user_id,
                "count": TWEETS_PER_USER,
                "includePromotedContent": False,
                "withQuickPromoteEligibilityTweetFields": False,
                "withVoice": False,
                "withV2Timeline": True,
            })
        except Exception as e:
            print(f"  Failed to get tweets for @{handle}: {e}")
            return []

        tweets = []
        instructions = (
            data.get("data", {})
            .get("user", {})
            .get("result", {})
            .get("timeline_v2", {})
            .get("timeline", {})
            .get("instructions", [])
        )

        for inst in instructions:
            if inst.get("type") != "TimelineAddEntries":
                continue
            for entry in inst.get("entries", []):
                tweet = self._extract_tweet(entry, handle)
                if tweet:
                    tweets.append(tweet)

        return tweets[:TWEETS_PER_USER]

    def _extract_tweet(self, entry: dict, handle: str) -> Optional[dict]:
        content = entry.get("content", {})
        if content.get("entryType") != "TimelineTimelineItem":
            return None

        tweet_result = (
            content.get("itemContent", {})
            .get("tweet_results", {})
            .get("result", {})
        )

        # Handle tweet with visibility results wrapper
        if tweet_result.get("__typename") == "TweetWithVisibilityResults":
            tweet_result = tweet_result.get("tweet", {})

        legacy = tweet_result.get("legacy", {})
        if not legacy or not legacy.get("id_str"):
            return None

        # Get author info
        user_legacy = tweet_result.get("core", {}).get("user_results", {}).get("result", {}).get("legacy", {})
        author_handle = user_legacy.get("screen_name", handle)
        author_name = user_legacy.get("name", "")

        # Parse date
        created_at = None
        if legacy.get("created_at"):
            try:
                created_at = datetime.strptime(legacy["created_at"], "%a %b %d %H:%M:%S %z %Y")
            except ValueError:
                created_at = None

        return {
            "tweet_id": legacy["id_str"],
            "author_handle": author_handle,
            "author_name": author_name,
            "text": legacy.get("full_text", ""),
            "likes": legacy.get("favorite_count", 0),
            "retweets": legacy.get("retweet_count", 0),
            "replies": legacy.get("reply_count", 0),
            "created_at": created_at,
            "url": f"https://x.com/{author_handle}/status/{legacy['id_str']}",
            "search_keyword": None,
        }


def upsert_tweets(tweets: list[dict]) -> int:
    if not tweets:
        return 0
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    count = 0
    for t in tweets:
        try:
            cur.execute("""
                INSERT INTO x_posts (tweet_id, author_handle, author_name, text, likes, retweets, replies, created_at, url, search_keyword)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (tweet_id) DO UPDATE SET
                    likes = EXCLUDED.likes, retweets = EXCLUDED.retweets,
                    replies = EXCLUDED.replies, scraped_at = NOW()
            """, (
                t["tweet_id"], t["author_handle"], t["author_name"], t["text"],
                t["likes"], t["retweets"], t["replies"], t["created_at"],
                t["url"], t["search_keyword"],
            ))
            count += 1
        except Exception as e:
            print(f"  DB error: {e}")
            conn.rollback()
    conn.commit()
    cur.close()
    conn.close()
    return count


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--handle", help="Single handle to scrape")
    args = parser.parse_args()

    handles = [args.handle] if args.handle else HANDLES
    scraper = TwitterScraper()

    total = 0
    results = {}

    for handle in handles:
        print(f"\n--- @{handle} ---")
        user_id = scraper.get_user_id(handle)
        if not user_id:
            results[handle] = "FAILED (user not found)"
            continue

        tweets = scraper.get_user_tweets(handle, user_id)
        if tweets:
            n = upsert_tweets(tweets)
            total += n
            results[handle] = f"OK: {len(tweets)} tweets, {n} upserted"
            print(f"  {len(tweets)} tweets fetched, {n} upserted")
            # Show most recent tweet
            newest = max(tweets, key=lambda t: t["created_at"] or datetime.min)
            print(f"  Latest: {newest['created_at']} - {newest['text'][:80]}...")
        else:
            results[handle] = "FAILED (no tweets)"
            print(f"  No tweets retrieved")

        time.sleep(1.5)  # Rate limit

    print(f"\n{'='*50}")
    print(f"TOTAL: {total} tweets upserted")
    for h, r in results.items():
        print(f"  @{h}: {r}")


if __name__ == "__main__":
    main()
