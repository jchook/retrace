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

debug "create item"
api POST /items \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Item",
    "description": "This is a test."
  }'
ITEM_ID=$(echo "$DATA" | jq -r '.id')

debug "list items"
api GET /items

debug "upload file to item"
api POST "/documents?itemId=$ITEM_ID" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@spec/openapi.json"

debug "list item documents"
api GET "/items/$ITEM_ID/documents"
