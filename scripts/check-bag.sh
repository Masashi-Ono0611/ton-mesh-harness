#!/bin/bash
BAG_ID="$1"
MAX_WAIT=${2:-60}  # default 60 seconds
INTERVAL=5

echo "Checking bag: $BAG_ID"
echo "Max wait: ${MAX_WAIT}s"
echo ""

for ((i=1; i<=MAX_WAIT/INTERVAL; i++)); do
  echo -n "[$i] Checking... "
  
  RESPONSE=$(curl -s "https://tonapi.io/v2/storage/bag/$BAG_ID")
  
  if echo "$RESPONSE" | grep -q '"status"'; then
    echo "✅ ACCESSIBLE!"
    echo "$RESPONSE" | jq .
    exit 0
  else
    echo "⏳ Not yet (404)"
  fi
  
  sleep $INTERVAL
done

echo ""
echo "❌ Timeout - bag not yet accessible after ${MAX_WAIT}s"
echo "This is normal for new bags. Try again in a few minutes."
exit 1
