import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    GOOGLE_CREDENTIALS_PATH = os.getenv("GOOGLE_CREDENTIALS_PATH")
    GOOGLE_SHEET_ID = os.getenv("GOOGLE_SHEET_ID")
    GOOGLE_LOCATION_ID = os.getenv("GOOGLE_LOCATION_ID")
    DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")
    SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL")
    AI_PROVIDER = os.getenv("AI_PROVIDER")
    AI_API_KEY = os.getenv("AI_API_KEY")
    RESPONSE_TONE = os.getenv("RESPONSE_TONE", "professional")
    RESPONSE_LANGUAGE = os.getenv("RESPONSE_LANGUAGE", "Original")
    MONITOR_INTERVAL_MINUTES = int(os.getenv("MONITOR_INTERVAL_MINUTES", 15))
