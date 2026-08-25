from google.oauth2 import service_account
from googleapiclient.discovery import build
from config import Config
from utils import retry

@retry((Exception,), tries=3, delay=2, backoff=2)
def fetch_new_reviews():
    credentials = service_account.Credentials.from_service_account_file(
        Config.GOOGLE_CREDENTIALS_PATH,
        scopes=['https://www.googleapis.com/auth/business.manage']
    )
    
    service = build('mybusinessbusinessinformation', 'v1', credentials=credentials)
    
    reviews = service.accounts().locations().reviews().list(
        parent=Config.GOOGLE_LOCATION_ID
    ).execute()
    
    return reviews.get('reviews', [])
