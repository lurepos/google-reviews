import requests
from config import Config
from utils import retry
from loguru import logger

@retry((Exception,), tries=3, delay=2, backoff=2)
def _send_discord(message, is_urgent):
    prefix = "🚨 **URGENTE (Human-in-the-Loop)** 🚨\n" if is_urgent else ""
    formatted_message = f"{prefix}{message}"
    requests.post(Config.DISCORD_WEBHOOK_URL, json={"content": formatted_message})

@retry((Exception,), tries=3, delay=2, backoff=2)
def _send_slack(message, is_urgent):
    # Formato de bloque simple para Slack
    prefix = "🚨 *URGENTE (Human-in-the-Loop)* 🚨\n" if is_urgent else ""
    formatted_message = f"{prefix}{message}"
    requests.post(Config.SLACK_WEBHOOK_URL, json={"text": formatted_message})

def send_notification(message, is_urgent=False):
    sent = False
    
    if Config.DISCORD_WEBHOOK_URL:
        try:
            logger.info("Sending notification to Discord...")
            _send_discord(message, is_urgent)
            sent = True
        except Exception as e:
            logger.error(f"Failed sending notification to Discord: {e}")
            
    if Config.SLACK_WEBHOOK_URL:
        try:
            logger.info("Sending notification to Slack...")
            _send_slack(message, is_urgent)
            sent = True
        except Exception as e:
            logger.error(f"Failed sending notification to Slack: {e}")

    if not sent:
        logger.warning("No notification webhooks are configured (Discord/Slack). Message was not sent.")
