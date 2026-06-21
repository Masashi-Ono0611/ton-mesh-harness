#!/bin/bash
# Keep the daemon running so the bag stays published to the network

BUILD_DIR="${1:-test/fixtures/minimal-site}"
USE_TESTNET="${2:-false}"

echo "Starting daemon and keeping it alive..."
echo "Build dir: $BUILD_DIR"
echo "Testnet: $USE_TESTNET"
echo ""
echo "Press Ctrl+C to stop the daemon"
echo ""

# Start the daemon
node dist/cli.js "$BUILD_DIR" --skip-verify --watch &
CLI_PID=$!

# Wait for the daemon process
sleep 3

echo "✅ Deployed with daemon running"
echo "CLI PID: $CLI_PID"
echo ""
echo "Checking if daemon process is running..."
pgrep -f storage-daemon || echo "⚠️  No daemon process found"

# Keep the CLI process alive (wait for Ctrl+C)
wait $CLI_PID
