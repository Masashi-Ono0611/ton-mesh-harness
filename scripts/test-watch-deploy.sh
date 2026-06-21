#!/bin/bash
# Deploy in watch mode and keep the daemon running

BUILD_DIR="test/fixtures/minimal-site"

echo "=== Watch Mode Deployment ==="
echo "In this mode the daemon keeps running and keeps the bag published to the network"
echo ""
echo "Expected behavior:"
echo "1. Run the initial deploy"
echo "2. The daemon starts and keeps hosting the bag"
echo "3. Other nodes can discover and download the bag"
echo "4. Reachable via ton.run after 10-30 minutes"
echo ""
echo "Note: the daemon keeps running until you close this terminal or press Ctrl+C"
echo ""
echo "Press Enter to start..."
read

node dist/cli.js "$BUILD_DIR" --desc "Watch mode deployment test" --watch --debounce 300000 --skip-verify
# Set debounce to 5 minutes (effectively infinite)

