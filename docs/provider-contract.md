# ストレージプロバイダー契約 (v0.4)

PCをオフにしてもサイトにアクセスできるようにするための手順。

---

## 概要

デフォルトのデプロイでは、**あなたの PC がシードノードになる**。
PC がオフラインになると bag にアクセスできなくなる。

`--provider` フラグを使うと、TON ネットワーク上のストレージプロバイダーと契約し、
**24時間365日** bag をホストしてもらえる。対価は TON で支払う。

---

## 使い方

```bash
# デプロイ + プロバイダー自動選択（最安値）
node dist/cli.js ./build/ --provider

# デプロイ + 特定プロバイダーを指定
node dist/cli.js ./build/ --provider 0:ca5f6e597d3eab8a4e...
```

### フロー

1. **デプロイ** — `./build/` を TON Storage にアップロード
2. **プロバイダー選択** — TONAPI から候補リストを取得、最安値を自動選択
3. **契約メッセージ生成** — `storage-daemon-cli` で BOC（バイナリ契約メッセージ）を生成
4. **QR コード + URL 表示** — TON Connect ディープリンクを表示
5. **署名** — Tonkeeper などのウォレットアプリで署名
6. **確認** — TONAPI をポーリングして契約アクティベーションを確認

---

## テストネットについて

**`--provider` はテストネット非対応**（`--testnet` と同時使用不可）。

テストネットのプロバイダーリストには 171 件が登録されているが、
実際の ADNL ノードが存在せず、mainnet との重複もゼロ。
テスト用エントリのみで実用不可のため、早期終了してエラーを表示する。

```bash
# これはエラーになる（意図的）
node dist/cli.js ./build/ --testnet --provider
# ⚠ --provider is not supported on testnet.
```

---

## 既知の制限・バグ（daemon v2026.02-1）

### `--max-span` の uint8 バグ

`new-contract-message` の `--rate --max-span` モードで、
`--max-span` の値が **0〜255 しか受け付けない**（本来は秒数で任意値のはず）。

- `--max-span 86400`（1日）→ `Can't parse '86400' as number`
- `--max-span 256` → 同様のエラー
- `--max-span 200` → **正常動作**（200秒 ≈ 3分強）

このため v0.4 では `--max-span 200`（200秒）に固定している。
ダウングレードして daemon を修正するまでの暫定対応。

### `--provider <addr>` の P2P タイムアウト

`new-contract-message --provider <addr>` は、プロバイダーの ADNL ノードへ
P2P 接続してレートを取得するモード。mainnet でも接続確立に失敗することが多い。

```
# この形式は使わない（タイムアウトするため）
new-contract-message <bagId> <outFile> --provider <addr>

# 代わりにこの形式を使用（手動でレート・期間を指定）
new-contract-message <bagId> <outFile> --rate <rate> --max-span 200
```

### フラグの排他性

`--provider <addr>` と `--rate --max-span` は**排他フラグ**。
同時に使うと `Incompatible flags` エラーになる。

---

## 実装詳細

### `src/provider.ts`

```
fetchProviders(testnet)  →  TONAPI /v2/storage/providers  →  Provider[]
  フィルタ: accept_new_contracts && rate_per_mb_day > 10 && max_span >= 3600
  (rate > 10 で rate=0/1 のダミーエントリを除外)

selectCheapestProvider(providers)  →  providers[0]  (ratePerMbDay 昇順ソート済み)

getBagSizeBytes(bagId, daemon)  →  storage-daemon-cli get <bagId> --json

generateContractMessage(bagId, sizeBytes, provider, daemon)
  →  new-contract-message <bagId> <outFile> --rate <rate> --max-span 200
  →  ContractMessage { bocBase64, amountNano, providerAddress, spanDays, rateTonPerGbYear }
```

### 金額計算

```
sizeMb = max(sizeBytes / 1_000_000, 0.1)  ← 最小 0.1 MB
spanDays = 200 / 86400                    ← ~0.00231 日
storageCostNano = ceil(sizeMb * ratePerMbDay * spanDays)
amountNano = storageCostNano + 300_000_000  ← 0.3 TON バッファ（コントラクトデプロイ費用）
```

現在のテストサイトのように数 KB のケースでは、
`storageCostNano ≈ 0`（< 1 nanoTON）なので実質 **0.3 TON のみ**かかる。

### `src/cli/provider.ts`

```
runProviderContract(opts)
  1. testnet チェック → 早期終了
  2. fetchProviders + select/find provider
  3. getBagSizeBytes
  4. generateContractMessage
  5. buildTonConnectDeeplink(provider.address, bagId, { amountNano, payloadBase64: bocBase64 })
  6. displayTonConnectQr(deeplink, ...)
  7. URL を直接表示（QRが見えない環境向け）
  8. pollProviderContract (TONAPI /v2/storage/bag/{id}) で5分間ポーリング
```

---

## ローカルでの手動テスト手順

```bash
# 1. ビルド
npm run build

# 2. テストサイト作成
mkdir -p /tmp/ton-test-site
echo '<h1>Hello TON</h1>' > /tmp/ton-test-site/index.html

# 3. mainnet でデプロイ + プロバイダー契約
node dist/cli.js /tmp/ton-test-site --provider
```

実行すると以下が順番に表示される:

```
📦 Storage Provider Contract

✔ Selected provider: 0:ca5f6e597d3eab8a4e... (20 nanoTON/MB/day)
✔ Bag size: 0.00 MB
✔ Contract: 200s (0.0023 days) @ 0.01 TON/GB/year

💸 Storage Payment — Sign to Contract
  Amount: 0.3000 TON
  Duration: 200 seconds (~0.0023 days)

  → 0:ca5f6e597d3eab8a4e...

  Scan with your TON wallet:
  [QR コード]

  TON Connect URL (open on mobile or paste in Tonkeeper):

  tc://?v=2&id=...&r=...

  Waiting for you to sign the transaction...
  (Press Ctrl+C to skip provider contract)
```

4. **Tonkeeper で署名**
   - QR をスキャンするか、`tc://` URL をブラウザで開く
   - 金額・送金先を確認して署名

5. **確認**
   - 署名後 1〜3 分でコントラクトがアクティブになる
   - CLI が自動で検出して終了

---

## プロバイダーリスト確認

TONAPI で現在のプロバイダーを確認できる:

```bash
curl https://tonapi.io/v2/storage/providers | jq '.providers[] | {address, rate_per_mb_day, max_span}'
```

---

## 今後の改善点

- daemon のアップデートで `--max-span` バグが修正されたら、契約期間を設定可能にする
- プロバイダー P2P 接続（`--provider <addr>` モード）の安定化
- 複数プロバイダーへの同時契約オプション
