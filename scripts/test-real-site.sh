#!/bin/bash
# より現実的なサイズのサイトを作成してデプロイ

BUILD_DIR="test/fixtures/real-site"

mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

# ダミーの HTML/JS/CSS ファイルを作成（合計約 500 KB）
cat > index.html << 'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TON Sovereign Deploy Test</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>TON Sovereign Deploy Test</h1>
    <p>This is a test site deployed to TON Storage.</p>
    <p>Bag size: ~500 KB</p>
    <p>Status: Testing network propagation</p>
    <script src="app.js"></script>
</body>
</html>
HTML

# CSS ファイル（約 100 KB）
cat > style.css << CSS
body {
    font-family: Arial, sans-serif;
    max-width: 800px;
    margin: 50px auto;
    padding: 20px;
    line-height: 1.6;
}
h1 { color: #0088cc; }
$(for i in {1..1000}; do echo ".class-$i { margin: ${i}px; }"; done)
CSS

# JS ファイル（約 400 KB）
cat > app.js << JS
console.log('TON Sovereign Deploy Test');
$(for i in {1..10000}; do echo "const var$i = 'data$i';"; done)
console.log('Loaded');
JS

cd - > /dev/null

# ファイルサイズを確認
echo "Created test site:"
du -sh "$BUILD_DIR"
echo ""

echo "Deploying to TON Storage..."
echo "Note: This may take a few minutes to upload"
echo ""

node dist/cli.js "$BUILD_DIR" --desc "Real-size test site (~500 KB)" --skip-verify

