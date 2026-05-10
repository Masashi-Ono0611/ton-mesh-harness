# ストレージプロバイダー契約 (v0.4 → v0.5)

PCをオフにしてもサイトにアクセスできるようにするための手順。

---

## 概要

デフォルトのデプロイでは、**あなたの PC がシードノードになる**。
PC がオフラインになると bag にアクセスできなくなる。

`--provider` フラグを使うと、TON ネットワーク上のストレージプロバイダーと契約し、
**24時間365日** bag をホストしてもらえる。対価は TON で支払う。
v0.5 から **契約期間は秒単位で自由に指定可能**（`--span`、デフォルト 1 日）。

---

## 使い方

```bash
# デプロイ + プロバイダー自動選択（最安値）+ 1 日契約（デフォルト）
node dist/cli.js ./build/ --provider

# デプロイ + 特定プロバイダー + 30 日契約
node dist/cli.js ./build/ --provider 0:ca5f6e597d3eab8a4e... --span 2592000

# 1 年契約
node dist/cli.js ./build/ --provider --span 31536000
```

`--span` の値域: 正の整数 1 〜 4 294 967 295（uint32 最大、約 136 年）。

### フロー

1. **デプロイ** — `./build/` を TON Storage にアップロード
2. **プロバイダー選択** — TONAPI から候補リストを取得、最安値を自動選択
3. **契約メッセージ生成** — daemon CLI に `new-contract-message` を呼ばせて
   TorrentInfo + microchunk_hash を取り出し、TS 側で `@ton/core` の
   `beginCell()` を使って **任意 span の BOC を再生成**（自前 BOC ルート）
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

### `--max-span` の uint8 バグ — v0.5 で迂回完了

`storage-daemon-cli` の `new-contract-message --rate --max-span` モードで、
`--max-span` の値が **0〜255 しか受け付けない**（オンチェーンの
storage-provider 契約は `expected_max_span:uint32` を受け取るのに、
CLI のパーサだけが `uint8` でパースする）。

- 該当: `storage/storage-daemon/storage-daemon-cli.cpp:681`（v2026.02-1〜v2026.04-1 全部）
- 周囲のコードはすべて `uint32` → 明らかなコピペエラー

**v0.5 の対応 — 迂回ルート（自前 BOC 生成）**

upstream に依存しないため、TS 側で BOC を組み立てる方針を採用。
詳細: `docs/v0.5/lane-b-self-generated-boc.md`

1. daemon CLI を `--max-span 200` で呼んで一時 BOC を生成（CLI の許す範囲で動かす）
2. その BOC を `Cell.fromBoc` でパースし、TorrentInfo（ref Cell）と
   microchunk_hash（256 ビット）を取り出す
3. `buildOfferStorageContractMessage`（`src/provider.ts`）で
   ユーザー指定の span 値を入れた BOC を再生成
4. `Cell.toBoc({ idx: false, crc32: false })` で
   daemon の `vm::std_boc_serialize` と**バイト一致するシリアライズ**を実行

`test/provider-parity.integration.test.ts`（`RUN_DAEMON_TESTS=1` で実走）が
バイト一致と任意 span 投入を実機で証明している。

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

buildOfferStorageContractMessage({ queryId, torrentInfo, microchunkHash,
                                   expectedRateNanoPerMbDay,
                                   expectedMaxSpanSeconds })
  →  Cell  // op=0x107c49ef, ref=TorrentInfo, span 任意 uint32

generateContractMessage(bagId, sizeBytes, provider, daemon, spanSeconds=86400)
  1. daemon CLI で new-contract-message を呼ぶ（CLI のバグった span は捨てる）
  2. その BOC をパースし TorrentInfo + microchunk_hash を抽出
  3. buildOfferStorageContractMessage で span 自由な BOC を再生成
  4. amountNano を新 span で再計算
  →  ContractMessage { bocBase64, amountNano, providerAddress, spanDays, rateTonPerGbYear }
```

### 金額計算

```
sizeMb = max(sizeBytes / 1_000_000, 0.1)   ← 最小 0.1 MB
spanDays = spanSeconds / 86400              ← ユーザー指定（デフォルト 1 日）
storageCostNano = ceil(sizeMb * ratePerMbDay * spanDays)
amountNano = storageCostNano + 300_000_000  ← 0.3 TON バッファ（コントラクトデプロイ費用）
```

数 KB の bag では `storageCostNano` は span が長くてもほぼ無視できる量にしかならず、
実質 **0.3 TON のみ** が支払いになる。サイズが大きい bag や span を年単位にする場合は
storageCostNano が支配的になるので事前に試算すること。

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

# 3. mainnet でデプロイ + プロバイダー契約（1 日契約）
node dist/cli.js /tmp/ton-test-site --provider --span 86400
```

実行すると以下が順番に表示される:

```
📦 Storage Provider Contract

✔ Selected provider: 0:ca5f6e597d3eab8a4e... (20 nanoTON/MB/day)
✔ Bag size: 0.00 MB
✔ Contract: 86400s (1.0000 days) @ 0.01 TON/GB/year

💸 Storage Payment — Sign to Contract
  Amount: 0.3000 TON
  Duration: 86400 seconds (~1.0000 days)

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

- ✅ ~~daemon のアップデートで `--max-span` バグが修正されたら、契約期間を設定可能にする~~
  → v0.5 で自前 BOC ルートにより解消（`--span <seconds>` で任意 uint32 秒）
- プロバイダー P2P 接続（`--provider <addr>` モード）の安定化
- 複数プロバイダーへの同時契約オプション
- mainnet 実 soak テスト（`--span 86400` で 1 日契約を実際に署名・検証）
- microchunk_hash の派生計算を TS に移植（daemon CLI 完全独立）
