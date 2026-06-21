#!/bin/bash
# Check the storage-daemon status

DAEMON_BIN="$HOME/.ton-sovereign/bin/storage-daemon"
CLI_BIN="$HOME/.ton-sovereign/bin/storage-daemon-cli"
CONFIG="$HOME/.ton-sovereign/bin/global.config.json"

echo "=== Checking storage-daemon binaries ==="
ls -lh "$DAEMON_BIN" "$CLI_BIN" "$CONFIG" 2>&1 || echo "Binaries not found"
echo ""

echo "=== Testing storage-daemon-cli help ==="
"$CLI_BIN" --help 2>&1 | head -30
echo ""

echo "=== Starting daemon in background ==="
"$DAEMON_BIN" -v 3 -C "$CONFIG" -p 5510 -I "0.0.0.0:5610" -D /tmp/ton-test-db &
DAEMON_PID=$!
echo "Daemon PID: $DAEMON_PID"
sleep 3

echo ""
echo "=== Checking daemon status ==="
ps -p $DAEMON_PID || echo "Daemon not running"
echo ""

echo "=== Listing available commands ==="
# Generate CLI keys
KEY_DIR="/tmp/ton-test-db/cli-keys"
mkdir -p "$KEY_DIR"
sleep 2

if [ -f "$KEY_DIR/client" ] && [ -f "$KEY_DIR/server.pub" ]; then
    "$CLI_BIN" -v 3 -I "127.0.0.1:5510" -k "$KEY_DIR/client" -p "$KEY_DIR/server.pub" -c "help" 2>&1 | head -50
else
    echo "CLI keys not generated yet"
fi

echo ""
echo "=== Cleaning up ==="
kill $DAEMON_PID 2>/dev/null
rm -rf /tmp/ton-test-db

