#!/bin/bash

# Default parameters
URL="https://winterscape.cab432.com/terrain/get3DTerrain"
REQUEST_COUNT=8
JWT_TOKEN="eyJraWQiOiIxc2FBVWI2VnhpRW1UUVAyM0RoNUp4eVZNbVJHYThXXC9CXC9lSU5PdWczN2M9IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiIxOTFlNzQ4OC0xMDExLTcwNzQtZTcxOC04YjI0MjE1ZWE5NGMiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuYXAtc291dGhlYXN0LTIuYW1hem9uYXdzLmNvbVwvYXAtc291dGhlYXN0LTJfRUNQdkJ3VGV5IiwiY2xpZW50X2lkIjoiN2Fjbm52ZDFtazlzaGJiNDY2NmNuZ3A5aGsiLCJvcmlnaW5fanRpIjoiYzMyY2E2OWQtZWFhZC00ZmI5LThjYjUtNDM0ZjRlZDk3MGE5IiwiZXZlbnRfaWQiOiI1NzE3MmM0Ny0zYTg5LTQwZjgtYjkyMi1lNjRhYzJlYWI2NTQiLCJ0b2tlbl91c2UiOiJhY2Nlc3MiLCJzY29wZSI6ImF3cy5jb2duaXRvLnNpZ25pbi51c2VyLmFkbWluIiwiYXV0aF90aW1lIjoxNzYxMjIxNzk2LCJleHAiOjE3NjEyMjUzOTYsImlhdCI6MTc2MTIyMTc5NiwianRpIjoiYWZhMjYzYWYtZThhOC00ODdlLThlM2YtODI3MjZiZjlhZWUxIiwidXNlcm5hbWUiOiJqb2huZG9lIn0.Bw52MkmiSJ2YZRhFhNYFPFKe495VJOfuOELZ_bWVOl3E59kYWfUV92xZbQphvlK407A2LKEt0d9wPLT0fUcnA1ZPjNoxB2-5m6gz1I9GJ9TxqjiZAYP7MJNvAKQWdMcys_XsUCzkePYIzZJ_ZSMMlh1IkV5moWK5XhRwKLg-NLz_y-yLq4nWm1LAKDlkM1hbCh3BuxGtYqFVWqd6ZlQUIiLlPIu78MvXhaxc--ibbll1sPDqkSP1FVYhGELjfzGBkK_J1_xBZicSQwmaX3_ThA_ueNbCYmtealpnxVQS59ec2Y8Cf5OjEkGPijhtei0S94gReTq3TLhwIDEGTLQ1Tg"

# Override defaults with args
if [ -n "$1" ]; then URL="$1"; fi
if [ -n "$2" ]; then REQUEST_COUNT="$2"; fi
if [ -n "$3" ]; then JWT_TOKEN="$3"; fi

echo "Sending $REQUEST_COUNT requests to $URL"

for i in $(seq 1 $REQUEST_COUNT); do
  (
    VALUE=$((53 + i))
    FULL_URL="${URL}?id=${VALUE}&styleQuery=classic"
    echo "[${i}] Requesting $FULL_URL"

    if [ -n "$JWT_TOKEN" ]; then
      RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer ${JWT_TOKEN}" "$FULL_URL")
    else
      RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$FULL_URL")
    fi

    echo "[${i}] Response: $RESPONSE"
  ) &
done

# Wait for all background requests
wait
echo "All requests complete."
