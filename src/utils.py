import time
from loguru import logger

def retry(exceptions, tries=3, delay=2, backoff=2):
    """
    Decorador para reintentar funciones resilientemente.
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            mdelay = delay
            for attempt in range(tries):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    if attempt == tries - 1:
                        logger.error(f"Failed {func.__name__} after {tries} attempts. Error: {e}")
                        raise
                    logger.warning(f"Error in {func.__name__}: {e}. Retrying in {mdelay}s...")
                    time.sleep(mdelay)
                    mdelay *= backoff
        return wrapper
    return decorator
