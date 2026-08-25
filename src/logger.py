import sqlite3
import os
from google.oauth2 import service_account
from googleapiclient.discovery import build
from config import Config
from utils import retry
from loguru import logger

DB_PATH = "reviews.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reviews (
            review_id TEXT PRIMARY KEY,
            comment TEXT,
            rating INTEGER,
            response TEXT,
            synced INTEGER DEFAULT 0
        )
    """)
    conn.commit()
    conn.close()

@retry((Exception,), tries=3, delay=2, backoff=2)
def _sync_row_to_sheets(service, review_id, comment, rating, response):
    service.spreadsheets().values().append(
        spreadsheetId=Config.GOOGLE_SHEET_ID,
        range="Reviews!A:D",
        valueInputOption="RAW",
        body={"values": [[review_id, comment, rating, response]]}
    ).execute()

def sync_to_sheets():
    # Solo sincroniza si las credenciales y el Sheet ID están configurados
    if not Config.GOOGLE_CREDENTIALS_PATH or not Config.GOOGLE_SHEET_ID:
        logger.info("Google Sheets config not fully provided. Keeping reviews local-only for now.")
        return
    if not os.path.exists(Config.GOOGLE_CREDENTIALS_PATH):
        logger.warning(f"Google credentials file not found at {Config.GOOGLE_CREDENTIALS_PATH}. Skipping sync.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT review_id, comment, rating, response FROM reviews WHERE synced = 0")
    unsynced = cursor.fetchall()
    
    if not unsynced:
        conn.close()
        return

    try:
        credentials = service_account.Credentials.from_service_account_file(Config.GOOGLE_CREDENTIALS_PATH)
        service = build('sheets', 'v4', credentials=credentials)
        
        for row in unsynced:
            review_id, comment, rating, response = row
            logger.info(f"Syncing review {review_id} to Google Sheets...")
            _sync_row_to_sheets(service, review_id, comment, rating, response)
            
            # Marcar como sincronizado
            cursor.execute("UPDATE reviews SET synced = 1 WHERE review_id = ?", (review_id,))
            conn.commit()
    except Exception as e:
        logger.error(f"Failed to sync to Google Sheets: {e}")
    finally:
        conn.close()

def log_review(review_id, comment, rating, response):
    init_db()
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT OR REPLACE INTO reviews (review_id, comment, rating, response, synced) VALUES (?, ?, ?, ?, 0)",
            (review_id, comment, rating, response)
        )
        conn.commit()
    except Exception as e:
        logger.error(f"Failed to save review {review_id} to local SQLite: {e}")
    finally:
        conn.close()
        
    # Intentar sincronizar a Google Sheets
    sync_to_sheets()
