#!/bin/bash

CREDENTIALS_FILE="google_credentials.json"

SCOPE="https://www.googleapis.com/auth/business.manage"

ACCOUNTS_API="https://mybusinessaccountmanagement.googleapis.com/v1/accounts"
LOCATIONS_API="https://mybusinessbusinessinformation.googleapis.com/v1"
PLACE_ID="0xd423b004e4d6df3:0xdb48d5b04268e588"

if ! command -v jq &> /dev/null; then
    echo "Error: jq is required for JSON parsing. Please install jq (e.g., 'sudo apt-get install jq' or 'brew install jq')."
    exit 1
fi

if ! command -v curl &> /dev/null; then
    echo "Error: curl is required. Please install curl."
    exit 1
fi

if ! command -v openssl &> /dev/null; then
    echo "Error: openssl is required. Please install openssl."
    exit 1
fi

if [ ! -f "$CREDENTIALS_FILE" ]; then
    echo "Error: Credentials file $CREDENTIALS_FILE not found."
    exit 1
fi

CLIENT_EMAIL=$(jq -r '.client_email' "$CREDENTIALS_FILE")
PRIVATE_KEY=$(jq -r '.private_key' "$CREDENTIALS_FILE" | sed 's/\\n/\n/g')
TOKEN_URI=$(jq -r '.token_uri' "$CREDENTIALS_FILE")

if [ -z "$CLIENT_EMAIL" ] || [ -z "$PRIVATE_KEY" ] || [ -z "$TOKEN_URI" ]; then
    echo "Error: Could not extract client_email, private_key, or token_uri from $CREDENTIALS_FILE."
    exit 1
fi

HEADER=$(echo -n '{"alg":"RS256","typ":"JWT"}' | base64 | tr -d '\n' | tr -d '=' | tr '/+' '_-')
NOW=$(date +%s)
EXP=$((NOW + 3600))
PAYLOAD=$(echo -n "{\"iss\":\"$CLIENT_EMAIL\",\"scope\":\"$SCOPE\",\"aud\":\"$TOKEN_URI\",\"exp\":$EXP,\"iat\":$NOW}" | base64 | tr -d '\n' | tr -d '=' | tr '/+' '_-')
SIGNATURE_INPUT="$HEADER.$PAYLOAD"

SIGNATURE=$(echo -n "$SIGNATURE_INPUT" | openssl dgst -sha256 -sign <(echo -n "$PRIVATE_KEY") | base64 | tr -d '\n' | tr -d '=' | tr '/+' '_-')
JWT="$SIGNATURE_INPUT.$SIGNATURE"

echo "Requesting access token..."
TOKEN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$TOKEN_URI" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=$JWT")

TOKEN_HTTP_CODE=$(echo "$TOKEN_RESPONSE" | tail -n1)
TOKEN_BODY=$(echo "$TOKEN_RESPONSE" | sed '$d')

if [ "$TOKEN_HTTP_CODE" -ne 200 ]; then
    echo "Error: Failed to obtain access token. HTTP Status: $TOKEN_HTTP_CODE"
    echo "Response: $TOKEN_BODY"
    exit 1
fi

ACCESS_TOKEN=$(echo "$TOKEN_BODY" | jq -r '.access_token')
if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" == "null" ]; then
    echo "Error: Failed to parse access token."
    echo "Response: $TOKEN_BODY"
    exit 1
fi
echo "Access token obtained successfully."


echo "Fetching account IDs..."
ACCOUNTS_ATTEMPTS=0
MAX_ATTEMPTS=5
while true; do
    ACCOUNTS_RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $ACCESS_TOKEN" "$ACCOUNTS_API")
    ACCOUNTS_HTTP_CODE=$(echo "$ACCOUNTS_RESPONSE" | tail -n1)
    ACCOUNTS_BODY=$(echo "$ACCOUNTS_RESPONSE" | sed '$d')

    if [ "$ACCOUNTS_HTTP_CODE" -eq 200 ]; then
        break
    elif [ "$ACCOUNTS_HTTP_CODE" -eq 429 ]; then
        ACCOUNTS_ATTEMPTS=$((ACCOUNTS_ATTEMPTS+1))
        if [ "$ACCOUNTS_ATTEMPTS" -ge "$MAX_ATTEMPTS" ]; then
            echo "Error: Quota exceeded (HTTP 429) after $MAX_ATTEMPTS attempts. Please wait a few minutes and try again, or request a quota increase in the Google Cloud Console."
            echo "Response: $ACCOUNTS_BODY"
            exit 1
        fi
        WAIT_TIME=$((2 ** ACCOUNTS_ATTEMPTS))
        echo "Warning: Quota exceeded (HTTP 429). Waiting $WAIT_TIME seconds before retrying... ($ACCOUNTS_ATTEMPTS/$MAX_ATTEMPTS)"
        sleep $WAIT_TIME
    else
        echo "Error: Failed to fetch accounts. HTTP Status: $ACCOUNTS_HTTP_CODE"
        echo "Response: $ACCOUNTS_BODY"
        exit 1
    fi
done

ACCOUNT_IDS=$(echo "$ACCOUNTS_BODY" | jq -r '.accounts[]?.name' | sed 's/accounts\///g')

if [ -z "$ACCOUNT_IDS" ]; then
    echo "No accounts found for this service account."
    echo "Full response: $ACCOUNTS_BODY"
    echo "Please ensure the service account ($CLIENT_EMAIL) is added as a Manager or Owner in Google Business Profile."
    exit 1
fi

echo "Fetching locations and place IDs for each account..."
for ACCOUNT_ID in $ACCOUNT_IDS; do
    echo "Account ID: $ACCOUNT_ID"
    

    LOCATIONS_ATTEMPTS=0
    while true; do
        LOCATIONS_RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $ACCESS_TOKEN" \
            "$LOCATIONS_API/accounts/$ACCOUNT_ID/locations?readMask=title,name,storefrontAddress,metadata")
        LOCATIONS_HTTP_CODE=$(echo "$LOCATIONS_RESPONSE" | tail -n1)
        LOCATIONS_BODY=$(echo "$LOCATIONS_RESPONSE" | sed '$d')

        if [ "$LOCATIONS_HTTP_CODE" -eq 200 ]; then
            break
        elif [ "$LOCATIONS_HTTP_CODE" -eq 429 ]; then
            LOCATIONS_ATTEMPTS=$((LOCATIONS_ATTEMPTS+1))
            if [ "$LOCATIONS_ATTEMPTS" -ge "$MAX_ATTEMPTS" ]; then
                echo "  Error: Quota exceeded (HTTP 429) after $MAX_ATTEMPTS attempts for account $ACCOUNT_ID. Please wait and try again."
                echo "  Response: $LOCATIONS_BODY"
                continue 2
            fi
            WAIT_TIME=$((2 ** LOCATIONS_ATTEMPTS))
            echo "  Warning: Quota exceeded (HTTP 429). Waiting $WAIT_TIME seconds before retrying... ($LOCATIONS_ATTEMPTS/$MAX_ATTEMPTS)"
            sleep $WAIT_TIME
        else
            echo "  Error: Failed to fetch locations for account $ACCOUNT_ID. HTTP Status: $LOCATIONS_HTTP_CODE"
            echo "  Response: $LOCATIONS_BODY"
            continue 2
        fi
    done

    LOCATIONS=$(echo "$LOCATIONS_BODY" | jq -r '.locations[]?')
    if [ -z "$LOCATIONS" ]; then
        echo "  No locations found for account $ACCOUNT_ID."
        echo "  Searching for location by Place ID ($PLACE_ID)..."

        SEARCH_ATTEMPTS=0
        while true; do
            SEARCH_RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $ACCESS_TOKEN" \
                "$LOCATIONS_API/locations?filter=metadata.placeId=$PLACE_ID&readMask=title,name,storefrontAddress,metadata")
            SEARCH_HTTP_CODE=$(echo "$SEARCH_RESPONSE" | tail -n1)
            SEARCH_BODY=$(echo "$SEARCH_RESPONSE" | sed '$d')

            if [ "$SEARCH_HTTP_CODE" -eq 200 ]; then
                break
            elif [ "$SEARCH_HTTP_CODE" -eq 429 ]; then
                SEARCH_ATTEMPTS=$((SEARCH_ATTEMPTS+1))
                if [ "$SEARCH_ATTEMPTS" -ge "$MAX_ATTEMPTS" ]; then
                    echo "  Error: Quota exceeded (HTTP 429) after $MAX_ATTEMPTS attempts when searching by Place ID. Please wait and try again."
                    echo "  Response: $SEARCH_BODY"
                    continue 2
                fi
                WAIT_TIME=$((2 ** SEARCH_ATTEMPTS))
                echo "  Warning: Quota exceeded (HTTP 429). Waiting $WAIT_TIME seconds before retrying... ($SEARCH_ATTEMPTS/$MAX_ATTEMPTS)"
                sleep $WAIT_TIME
            else
                echo "  Error: Failed to search by Place ID. HTTP Status: $SEARCH_HTTP_CODE"
                echo "  Response: $SEARCH_BODY"
                continue 2
            fi
        done

        SEARCH_LOCATIONS=$(echo "$SEARCH_BODY" | jq -r '.locations[]?')
        if [ -z "$SEARCH_LOCATIONS" ]; then
            echo "  No locations found for Place ID $PLACE_ID."
            continue
        fi

        echo "$SEARCH_LOCATIONS" | jq -r '. | "  Title: \(.title)\n  Location ID: \(.name | sub("accounts/[0-9]+/locations/"; ""))\n  Place ID: \(.metadata.placeId // "N/A")\n"'
        continue
    fi

    echo "$LOCATIONS" | jq -r '. | "  Title: \(.title)\n  Location ID: \(.name | sub("accounts/[0-9]+/locations/"; ""))\n  Place ID: \(.metadata.placeId // "N/A")\n"'
done

echo "Done."