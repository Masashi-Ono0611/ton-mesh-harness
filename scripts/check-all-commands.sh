#!/bin/bash
# Check all available commands

DAEMON_BIN="$HOME/.ton-mesh/bin/storage-daemon"
CLI_BIN="$HOME/.ton-mesh/bin/storage-daemon-cli"
CONFIG="$HOME/.ton-mesh/bin/global.config.json"

echo "=== Starting daemon ==="
DB_DIR=$(mktemp -d)
"$DAEMON_BIN" -v 0 -C "$CONFIG" -p 5512 -I "0.0.0.0:5612" -D "$DB_DIR" &
DAEMON_PID=$!

echo "Waiting for CLI keys..."
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
echo "=== Available commands ==="
"$CLI_BIN" -v 0 -I "127.0.0.1:5512" -k "$KEY_DIR/client" -p "$KEY_DIR/server.pub" -c "help" 2>&1

echo ""
echo "=== Cleaning up ==="
kill $DAEMON_PID 2>/dev/null
rm -rf "$DB_DIR"

