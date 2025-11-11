#!/bin/sh

set -e

BASE_URL="http://localhost:3000"
DATA=""

api() {
  method="$1"; shift
  url="$1"; shift
  DATA="$(curl -s -X "$method" "$BASE_URL$url" "$@")"
  echo "$DATA" | jq .
}

debug() {
  echo "$@" >&2
}

debug "index"
api GET /

debug "create user"
api POST /users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com"
  }'
USER_ID=$(echo "$DATA" | jq -r '.id')

debug "create mark"
api POST /marks \
  -H "Content-Type: application/json" \
  -d '{
    "userId": '"\"$USER_ID\""',
    "url": "https://example.com",
    "tags": ["example"]
  }'
MARK_ID=$(echo "$DATA" | jq -r '.id')

debug "list marks"
api GET /marks

debug "get mark details"
api GET "/marks/$MARK_ID"
