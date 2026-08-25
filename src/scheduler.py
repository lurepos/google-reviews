import schedule
import time
from google_api import fetch_new_reviews
from ai_response import generate_response, is_negative_sentiment
from notifier import send_notification
from logger import log_review
from loguru import logger
from config import Config

def get_rating_number(rating):
    if isinstance(rating, int):
        return rating
    if isinstance(rating, str):
        mapping = {"ONE": 1, "TWO": 2, "THREE": 3, "FOUR": 4, "FIVE": 5}
        if rating.isdigit():
            return int(rating)
        return mapping.get(rating.upper(), 5)
    return 5

def monitor_reviews():
    try:
        logger.info("checking for new reviews...")
        reviews = fetch_new_reviews()
        for review in reviews:
            comment = review.get('comment', '')
            review_id = review.get('reviewId', '')
            rating = get_rating_number(review.get('starRating', 5))
            
            # Determinamos si es negativa mediante el análisis de sentimiento del texto
            if is_negative_sentiment(comment):
                logger.info(f"Negative review sentiment detected. Skipping auto-response.")
                send_notification(
                    f"Reseña negativa recibida (Análisis de Sentimiento). Requiere atención humana.\nComentario: {comment}\nCalificación: {rating}★",
                    is_urgent=True
                )
                log_review(review_id, comment, rating, "PENDIENTE (Revisión Humana)")
            else:
                # Reseña positiva/neutral -> Auto-responder (Sin notificar)
                response = generate_response(comment, rating)
                log_review(review_id, comment, rating, response)
    except Exception as e:
        logger.error(f"error: {e}", exc_info=True)

def start_scheduler():
    schedule.every(Config.MONITOR_INTERVAL_MINUTES).minutes.do(monitor_reviews)
    logger.info(f"scheduler started, checking every {Config.MONITOR_INTERVAL_MINUTES} minutes ...")
    while True:
        schedule.run_pending()
        time.sleep(1)
