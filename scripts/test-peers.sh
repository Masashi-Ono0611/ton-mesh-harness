#!/bin/bash
# Check the bag's peers

BUILD_DIR="test/fixtures/minimal-site"
DAEMON_BIN="$HOME/.ton-sovereign/bin/storage-daemon"
CLI_BIN="$HOME/.ton-sovereign/bin/storage-daemon-cli"
CONFIG="$HOME/.ton-sovereign/bin/global.config.json"

echo "=== Starting daemon ==="
DB_DIR=$(mktemp -d)
"$DAEMON_BIN" -v 0 -C "$CONFIG" -p 5513 -I "0.0.0.0:5613" -D "$DB_DIR" &
DAEMON_PID=$!
echo "Daemon PID: $DAEMON_PID"

# Wait for keys
for i in {1..30}; do
    KEY_DIR="$DB_DIR/cli-keys"
    if [ -f "$KEY_DIR/client" ] && [ -f "$KEY_DIR/server.pub" ]; then
        break
    fi
    sleep 1
done

KEY_DIR="$DB_DIR/cli-keys"
sleep 2

echo ""
echo "=== Creating bag ==="
OUTPUT=$("$CLI_BIN" -v 0 -I "127.0.0.1:5513" -k "$KEY_DIR/client" -p "$KEY_DIR/server.pub" -c "create $BUILD_DIR -d 'Test'" 2>&1)
BAG_ID=$(echo "$OUTPUT" | grep -oE '[0-9a-f]{64}' | head -1)

if [ -z "$BAG_ID" ]; then
    echo "❌ Failed to create bag"
    kill $DAEMON_PID 2>/dev/null
    rm -rf "$DB_DIR"
    exit 1
fi

echo "✓ Bag created: $BAG_ID"
echo ""

echo "=== Waiting 10 seconds for DHT propagation ==="
sleep 10

echo ""
echo "=== Getting peers for bag ==="
"$CLI_BIN" -v 0 -I "127.0.0.1:5513" -k "$KEY_DIR/client" -p "$KEY_DIR/server.pub" -c "get-peers $BAG_ID" 2>&1

echo ""
echo "=== Getting bag details ==="
"$CLI_BIN" -v 0 -I "127.0.0.1:5513" -k "$KEY_DIR/client" -p "$KEY_DIR/server.pub" -c "get $BAG_ID" 2>&1

echo ""
echo "=== Checking if upload is active ==="
# Verify with upload-pause/upload-resume
"$CLI_BIN" -v 0 -I "127.0.0.1:5513" -k "$KEY_DIR/client" -p "$KEY_DIR/server.pub" -c "upload-resume $BAG_ID" 2>&1

echo ""
echo "=== Waiting another 30 seconds ==="
sleep 30

echo ""
echo "=== Checking peers again ==="
"$CLI_BIN" -v 0 -I "127.0.0.1:5513" -k "$KEY_DIR/client" -p "$KEY_DIR/server.pub" -c "get-peers $BAG_ID" 2>&1

echo ""
echo "=== Cleaning up ==="
kill $DAEMON_PID 2>/dev/null
rm -rf "$DB_DIR"
echo "Done"

