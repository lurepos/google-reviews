import time
import logging
from typing import List, Dict, Any, Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

LOG = logging.getLogger(__name__)

def _make_session(retries: int = 3, backoff: float = 0.5) -> requests.Session:
    s = requests.Session()
    adapter = HTTPAdapter(max_retries=Retry(total=retries, backoff_factor=backoff, status_forcelist=(429, 500, 502, 503, 504), allowed_methods=["POST"]))
    s.mount("http://", adapter)
    s.mount("https://", adapter)
    return s

COPILOT_API_URL = "http://localhost:8000"

def inference_messages(
    messages: List[Dict[str, Any]],
    model: str = "gpt-5-mini",
    timeout: Optional[int] = 30,
    max_retries: int = 3,
) -> Dict[str, Any]:
    session = _make_session(retries=max_retries, backoff=0.5)
    last_exc: Optional[Exception] = None
    for attempt in range(1, max_retries + 1):
        try:
            res = session.post(
                f"{COPILOT_API_URL}/inference/messages",
                json={
                    "messages": messages,
                    "model": model,
                },
                headers={"X-Auth-String": "Test123#"},
                timeout=timeout,
            )
            
            res.raise_for_status()
            try:
                data = res.json()
            except ValueError as exc:
                raise RuntimeError(
                    f"AI gateway returned non-JSON response: {exc}; text={res.text[:200]}"
                ) from exc

            if isinstance(data, dict) and data.get("error"):
                raise RuntimeError(f"AI gateway returned error: {data.get('error')}")

            return data
        except requests.RequestException as exc:
            last_exc = exc
            LOG.warning("AI request failed on attempt %d: %s", attempt, exc)
            time.sleep(0.5 * attempt)
            continue

    raise RuntimeError(
        f"AI query to {COPILOT_API_URL} failed after {max_retries} attempts"
    ) from last_exc
