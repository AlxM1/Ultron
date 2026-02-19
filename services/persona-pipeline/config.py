import os

YOUTUBEDL_URL = os.getenv("YOUTUBEDL_URL", "http://raiser-youtubedl:8000")
APIFY_URL = os.getenv("APIFY_URL", "http://raiser-apify:8400")
WHISPERFLOW_GPU_URL = os.getenv("WHISPERFLOW_GPU_URL", "http://10.25.10.60:8765")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://10.25.10.60:11434")
DATABASE_URL = os.environ["DATABASE_URL"]  # Required — no hardcoded default

DEFAULT_LLM_MODEL = os.getenv("DEFAULT_LLM_MODEL", "llama3.2")
MAX_VIDEOS_DEFAULT = int(os.getenv("MAX_VIDEOS_DEFAULT", "50"))
MAX_CONCURRENT_TRANSCRIPTIONS = int(os.getenv("MAX_CONCURRENT_TRANSCRIPTIONS", "1"))
REFRESH_CRON = os.getenv("REFRESH_CRON", "0 3 * * 0")  # Sunday 3 AM
