#!/bin/bash
# watch モードでデプロイして daemon を動かし続ける

BUILD_DIR="test/fixtures/minimal-site"

echo "=== Watch Mode Deployment ==="
echo "このモードでは daemon が動き続け、bag をネットワークに公開し続けます"
echo ""
echo "期待される動作:"
echo "1. 初回デプロイ実行"
echo "2. daemon が起動して bag をホストし続ける"
echo "3. 他のノードが bag を発見＆ダウンロードできる状態になる"
echo "4. 10-30 分後に ton.run でアクセス可能になる"
echo ""
echo "注意: このターミナルを閉じるか Ctrl+C を押すまで daemon は動き続けます"
echo ""
echo "開始するには Enter キーを押してください..."
read

node dist/cli.js "$BUILD_DIR" --desc "Watch mode deployment test" --watch --debounce 300000 --skip-verify
# debounce を 5 分に設定（事実上無限）

