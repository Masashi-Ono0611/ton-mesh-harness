#!/bin/bash
# Check provider-related commands

DAEMON_BIN="$HOME/.ton-sovereign/bin/storage-daemon"
CLI_BIN="$HOME/.ton-sovereign/bin/storage-daemon-cli"
CONFIG="$HOME/.ton-sovereign/bin/global.config.json"

echo "=== Starting daemon ==="
DB_DIR=$(mktemp -d)
"$DAEMON_BIN" -v 0 -C "$CONFIG" -p 5514 -I "0.0.0.0:5614" -D "$DB_DIR" &
DAEMON_PID=$!

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
echo "=== Provider commands ==="
"$CLI_BIN" -v 0 -I "127.0.0.1:5514" -k "$KEY_DIR/client" -p "$KEY_DIR/server.pub" -c "help provider" 2>&1

echo ""
echo "=== Cleaning up ==="
kill $DAEMON_PID 2>/dev/null
rm -rf "$DB_DIR"

