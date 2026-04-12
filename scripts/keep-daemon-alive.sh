#!/bin/bash
# Daemon を動かし続けて bag をネットワークに公開し続けるスクリプト

BUILD_DIR="${1:-test/fixtures/minimal-site}"
USE_TESTNET="${2:-false}"

echo "Starting daemon and keeping it alive..."
echo "Build dir: $BUILD_DIR"
echo "Testnet: $USE_TESTNET"
echo ""
echo "Press Ctrl+C to stop the daemon"
echo ""

# Daemon を起動
node dist/cli.js "$BUILD_DIR" --skip-verify --watch &
CLI_PID=$!

# daemon プロセスを待つ
sleep 3

echo "✅ Deployed with daemon running"
echo "CLI PID: $CLI_PID"
echo ""
echo "Checking if daemon process is running..."
pgrep -f storage-daemon || echo "⚠️  No daemon process found"

# CLI プロセスを維持（Ctrl+C 待機）
wait $CLI_PID
