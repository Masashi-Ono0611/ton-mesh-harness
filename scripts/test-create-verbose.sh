#!/bin/bash
# Run the storage-daemon-cli create command with verbose output

BUILD_DIR="test/fixtures/minimal-site"
DAEMON_BIN="$HOME/.ton-sovereign/bin/storage-daemon"
CLI_BIN="$HOME/.ton-sovereign/bin/storage-daemon-cli"
CONFIG="$HOME/.ton-sovereign/bin/global.config.json"

echo "=== Starting daemon ==="
DB_DIR=$(mktemp -d)
"$DAEMON_BIN" -v 3 -C "$CONFIG" -p 5511 -I "0.0.0.0:5611" -D "$DB_DIR" &
DAEMON_PID=$!
echo "Daemon PID: $DAEMON_PID"
echo "DB dir: $DB_DIR"

# Wait for the CLI keys to be generated
echo "Waiting for CLI keys..."
for i in {1..30}; do
    KEY_DIR="$DB_DIR/cli-keys"
    if [ -f "$KEY_DIR/client" ] && [ -f "$KEY_DIR/server.pub" ]; then
        echo "✓ Keys ready"
        break
    fi
    sleep 1
done

KEY_DIR="$DB_DIR/cli-keys"
echo ""

echo "=== Listing local bags (before create) ==="
"$CLI_BIN" -v 3 -I "127.0.0.1:5511" -k "$KEY_DIR/client" -p "$KEY_DIR/server.pub" -c "list" 2>&1
echo ""

echo "=== Creating bag ==="
"$CLI_BIN" -v 3 -I "127.0.0.1:5511" -k "$KEY_DIR/client" -p "$KEY_DIR/server.pub" -c "create $BUILD_DIR -d 'Test deployment'" 2>&1
echo ""

echo "=== Listing local bags (after create) ==="
"$CLI_BIN" -v 3 -I "127.0.0.1:5511" -k "$KEY_DIR/client" -p "$KEY_DIR/server.pub" -c "list" 2>&1
echo ""

echo "=== Getting bag details ==="
# Extract the bag ID from list output and fetch its details
BAG_ID=$("$CLI_BIN" -v 3 -I "127.0.0.1:5511" -k "$KEY_DIR/client" -p "$KEY_DIR/server.pub" -c "list" 2>&1 | grep -oE '[0-9a-f]{64}' | head -1)
if [ -n "$BAG_ID" ]; then
    echo "Bag ID: $BAG_ID"
    "$CLI_BIN" -v 3 -I "127.0.0.1:5511" -k "$KEY_DIR/client" -p "$KEY_DIR/server.pub" -c "get $BAG_ID" 2>&1
else
    echo "No bag ID found"
fi
echo ""

echo "=== Checking daemon status ==="
ps -p $DAEMON_PID -o pid,stat,command
echo ""

echo "=== Cleaning up ==="
kill $DAEMON_PID 2>/dev/null
sleep 1
rm -rf "$DB_DIR"
echo "Done"

