import openai
from config import Config
from utils import retry

@retry((Exception,), tries=3, delay=2, backoff=2)
def is_negative_sentiment(review_text):
    if not review_text or not review_text.strip():
        return False
    
    prompt = (
        "Analyze the sentiment of this Google review. "
        "Reply with exactly 'NEGATIVE' if the user is complaining, dissatisfied, or has a bad experience. "
        "Otherwise reply with 'OTHER'.\n"
        f"Review: {review_text}\n"
        "Sentiment:"
    )
    try:
        response = openai.Completion.create(
            engine="text-davinci-003",
            prompt=prompt,
            max_tokens=5,
            temperature=0,
            api_key=Config.AI_API_KEY
        )
        sentiment = response.choices[0].text.strip().upper()
        return "NEGATIVE" in sentiment
    except Exception:
        # Fallback simple ante fallos de conexión o API
        negative_words = ["mal", "peor", "basura", "estafa", "robo", "malo", "horrible", "pésimo", "desastre", "sucio", "bad", "worst", "dirty", "terrible", "scam", "disappointed", "rude"]
        text_lower = review_text.lower()
        return any(word in text_lower for word in negative_words)

@retry((Exception,), tries=3, delay=2, backoff=2)
def generate_response(review_text, rating):
    lang = Config.RESPONSE_LANGUAGE
    lang_inst = f"in {lang}" if lang.lower() != "original" else "in the same language as the review"
    
    prompt = f"Generate a {Config.RESPONSE_TONE} response {lang_inst} to this {rating}-star review: {review_text}"
    response = openai.Completion.create(
        engine="text-davinci-003",
        prompt=prompt,
        max_tokens=100,
        api_key=Config.AI_API_KEY
    )
    return response.choices[0].text.strip()
