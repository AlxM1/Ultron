#!/usr/bin/env python3
"""
Load data into Outline (InNotion) via API.
Requires an API token stored in ~/.openclaw/.innotion-admin-creds
"""

import os
import sys
import json
import requests
import subprocess
from pathlib import Path
from typing import Dict, List, Optional

# Configuration
OUTLINE_URL = "http://localhost:3010"
CREDS_FILE = Path.home() / ".openclaw" / ".innotion-admin-creds"
CREATOR_PROFILES_DIR = Path("/home/eternity/.openclaw/workspace/Ultron/media/creator-profiles")

class OutlineAPI:
    def __init__(self, api_token: str, base_url: str = OUTLINE_URL):
        self.base_url = base_url.rstrip("/")
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
    
    def _request(self, endpoint: str, method: str = "POST", data: Optional[Dict] = None) -> Dict:
        url = f"{self.base_url}/api/{endpoint}"
        response = requests.request(method, url, headers=self.headers, json=data)
        response.raise_for_status()
        return response.json()
    
    def create_collection(self, name: str, description: str = "") -> Dict:
        """Create a new collection."""
        return self._request("collections.create", data={
            "name": name,
            "description": description
        })
    
    def list_collections(self) -> List[Dict]:
        """List all collections."""
        result = self._request("collections.list")
        return result.get("data", [])
    
    def create_document(self, title: str, text: str, collection_id: str, publish: bool = True) -> Dict:
        """Create a new document."""
        return self._request("documents.create", data={
            "title": title,
            "text": text,
            "collectionId": collection_id,
            "publish": publish
        })
    
    def search_documents(self, query: str) -> List[Dict]:
        """Search for documents."""
        result = self._request("documents.search", data={"query": query})
        return result.get("data", [])

def load_api_token() -> str:
    """Load API token from credentials file."""
    if not CREDS_FILE.exists():
        print(f"❌ Credentials file not found: {CREDS_FILE}")
        print("Please create an API token in Outline and save it to this file:")
        print(f"  echo 'API_TOKEN=outline_xxxxxxxxxxxx' > {CREDS_FILE}")
        print(f"  chmod 600 {CREDS_FILE}")
        sys.exit(1)
    
    with open(CREDS_FILE) as f:
        for line in f:
            if line.startswith("API_TOKEN="):
                token = line.strip().split("=", 1)[1]
                return token
    
    print(f"❌ No API_TOKEN found in {CREDS_FILE}")
    sys.exit(1)

def get_cron_jobs() -> str:
    """Get cron jobs from openclaw."""
    try:
        result = subprocess.run(
            ["openclaw", "cron", "list", "--json"],
            capture_output=True,
            text=True,
            check=True
        )
        cron_data = json.loads(result.stdout)
        
        # Format as markdown
        md = "# Operations Calendar\n\n## Scheduled Cron Jobs\n\n"
        for job in cron_data:
            md += f"### {job.get('name', 'Unnamed Job')}\n\n"
            md += f"- **Schedule:** `{job.get('schedule', 'N/A')}`\n"
            md += f"- **Command:** `{job.get('command', 'N/A')}`\n"
            md += f"- **Status:** {job.get('status', 'Unknown')}\n"
            md += f"- **Last Run:** {job.get('lastRun', 'Never')}\n\n"
        
        return md
    except Exception as e:
        print(f"⚠️  Could not fetch cron jobs: {e}")
        return "# Operations Calendar\n\n*Cron job data unavailable*\n"

def load_creator_profiles() -> List[Dict[str, str]]:
    """Load all creator profile markdown files."""
    profiles = []
    
    if not CREATOR_PROFILES_DIR.exists():
        print(f"⚠️  Creator profiles directory not found: {CREATOR_PROFILES_DIR}")
        return profiles
    
    for md_file in sorted(CREATOR_PROFILES_DIR.glob("*.md")):
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extract title from filename or first heading
        title = md_file.stem.replace("-", " ").title()
        if content.startswith("# "):
            title = content.split("\n")[0].replace("# ", "").strip()
        
        profiles.append({
            "title": title,
            "content": content
        })
    
    return profiles

def main():
    print("🚀 Loading data into Outline (InNotion)...\n")
    
    # Load API token
    api_token = load_api_token()
    api = OutlineAPI(api_token)
    
    print("✅ API token loaded")
    
    # Define collections to create
    collections_to_create = [
        {"name": "Creator Profiles", "description": "All 39 creator profiles for the Ultron project"},
        {"name": "Operations", "description": "Cron jobs, agent activity, calendars, and operational procedures"},
        {"name": "Infrastructure", "description": "Docker services, health status, and system architecture"},
        {"name": "Content Pipeline", "description": "Transcripts, personas, ideas, and content workflows"},
        {"name": "Cost Tracking", "description": "Daily, weekly, and monthly cost breakdowns and analysis"},
        {"name": "Meeting Notes", "description": "Decisions, conversations with Alex, and project discussions"}
    ]
    
    # Check existing collections
    existing_collections = api.list_collections()
    existing_names = {col["name"] for col in existing_collections}
    
    # Create collections
    collection_map = {}
    for col_def in collections_to_create:
        if col_def["name"] in existing_names:
            print(f"⏭️  Collection already exists: {col_def['name']}")
            # Find existing collection
            for col in existing_collections:
                if col["name"] == col_def["name"]:
                    collection_map[col_def["name"]] = col["id"]
        else:
            print(f"📁 Creating collection: {col_def['name']}")
            result = api.create_collection(col_def["name"], col_def["description"])
            collection_map[col_def["name"]] = result["data"]["id"]
    
    print(f"\n✅ {len(collection_map)} collections ready\n")
    
    # Load creator profiles
    print("👤 Loading creator profiles...")
    profiles = load_creator_profiles()
    
    if profiles and "Creator Profiles" in collection_map:
        for profile in profiles:
            try:
                print(f"  📄 Creating document: {profile['title']}")
                api.create_document(
                    title=profile["title"],
                    text=profile["content"],
                    collection_id=collection_map["Creator Profiles"],
                    publish=True
                )
            except Exception as e:
                print(f"  ❌ Failed to create {profile['title']}: {e}")
        
        print(f"✅ Loaded {len(profiles)} creator profiles\n")
    else:
        print("⏭️  No creator profiles to load or collection not found\n")
    
    # Create Operations Calendar
    if "Operations" in collection_map:
        print("📅 Creating Operations Calendar...")
        cron_content = get_cron_jobs()
        try:
            api.create_document(
                title="Operations Calendar",
                text=cron_content,
                collection_id=collection_map["Operations"],
                publish=True
            )
            print("✅ Operations Calendar created\n")
        except Exception as e:
            print(f"❌ Failed to create Operations Calendar: {e}\n")
    
    print("🎉 Data loading complete!")
    print(f"\n📊 Summary:")
    print(f"  - Collections: {len(collection_map)}")
    print(f"  - Creator Profiles: {len(profiles)}")
    print(f"  - Operations Documents: 1")
    print(f"\n🌐 Access Outline at: {OUTLINE_URL}")

if __name__ == "__main__":
    main()
