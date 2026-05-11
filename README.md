# Sovereign Deploy Kit

> Digital-resistance web のための CLI: TON Storage / TON DNS スタックに静的サイトを 1 コマンドで公開する。

TON Foundation が 2025 年に打ち出した **digital-resistance スタック**（[TON Proxy + ADNL Tunnel + Payment Network](https://telegra.ph/TON-Proxy-Introducing-optional-traffic-micro-payments-and-privacy-via-garlic-routing-03-08)、 [xssnick の Resistance Tools](https://github.com/xssnick/TON-Torrent)）と整合する形で、 静的サイトを TON Storage に bag として上げ、 `.ton` DNS から resolve させ、 自前 daemon (= あなたの PC) で seed します。 Tornado Cash / Uniswap UI のように **政府・Cloudflare・ホスティング業者に止められないウェブ**を作るための、 builder 向けの最小限のツールです。

```bash
npx ton-sovereign-deploy ./build/ --watch
```

```
📦 Uploading 47 files...
  ✓ index.html
  ✓ assets/main.js (1.2 MB)
  ✓ assets/style.css
  ... 44 more files

✅ TON Storage (ADNL):  ton://bag-a3f9c82e1b4d...
📦 Bag ID: a3f9c82e1b4d...

watching ./build/ — daemon stays alive to seed your bag.
Press Ctrl+C to stop seeding.
```

> **`--watch` を first-class として読んでください。** あなたの PC が daemon を稼働させているあいだ、 サイトはネットワーク上で生きています。 24/7 オフラインホスティング（いわゆる「provider 経由」）は v0.5 で実装したものの、 mainnet provider 経済が現状ほぼ稼働していないため experimental です（後述）。 これは TON Foundation 自身も `foundation.ton` を self-host で運用していることと整合します。

---

## Agent quickstart (v0.8 rc2)

このツールは AI エージェントから直接呼び出せるよう設計されています。Agent runtime に "deploy a static site to .ton" のような prompt を投げたとき、kit を npm 検索 + README + skill registry 経由で見つけてもらうことを *狙っています* — ただしこれは hypothesis で、[V4 red-team test](https://github.com/Masashi-Ono0611/sovereign-deploy-kit/issues/26) で実測検証します。発見が外れた場合は明示的に呼び出してください:

**rc2 で利用可能な 2 つの経路**

```jsonc
// 1. CLI (推奨 — DNS write も完結):
npx -y ton-sovereign-deploy ./dist --domain myprotocol.ton --json-output
```

```jsonc
// 2. MCP server (rc2 で実装、TonConnect 経由なら DNS write も SDK 経由で完結):
{
  "mcpServers": {
    "ton-sovereign-deploy": {
      "command": "npx",
      "args": ["-y", "--package", "ton-sovereign-deploy", "ton-sovereign-mcp"]
    }
  }
}
// → tools/call sovereign_check_env → sovereign_deploy
```

`--json-output` を付けると 1 行 1 JSON の structured output になり、agent が parse しやすくなります。

**rc2 で実装済の MCP flow**

```jsonc
// MCP client config に追加:
{
  "mcpServers": {
    "ton-sovereign-deploy": {
      "command": "npx",
      "args": ["-y", "--package", "ton-sovereign-deploy", "ton-sovereign-mcp"]
    }
    // optional: 並列に @ton/mcp を load して agentic wallet ops と組み合わせる
    // "ton": { "command": "npx", "args": ["-y", "@ton/mcp@alpha"] }
  }
}
```

agent は `sovereign_check_env` → `sovereign_deploy` の 2 tool を順に call します。`sovereign_deploy` は SDK が直接 awaiting_signature → dns_signing → dns_confirmed → verifying まで進めます(TonConnect 経由のみ)。

**Wallet モード**: `wallet: {kind: "tonconnect", connector}` (default、人間が phone wallet で承認、rc2 で MCP 経由でも完結) または `wallet: {kind: "agentic", config_path?, wallet_label?}` (autonomous、`~/.config/ton/config.json` のキーで自動署名 — config を `@ton/mcp` と共有、MCP-RPC ハンドオフではなく filesystem level の compose)。**rc2 注意**: agentic mode で `domain` を指定すると `ERR_INVALID_INPUT` を返します(autonomous 署名の DNS 書き込みは GA で実装、現在は CLI 利用を案内)。詳細は [`docs/v0.8/mcp-core-requirements.md`](docs/v0.8/mcp-core-requirements.md) §F2 と [`docs/v0.8/at-mcp-probe.md`](docs/v0.8/at-mcp-probe.md)。

**Discoverability の前提**: agent が npm 検索 + skill registry でこの kit に到達できるよう README / keywords / `.well-known/mcp.json` template を整備していますが、これは **acceptance hypothesis であって fact ではありません**。[V4 red-team test](https://github.com/Masashi-Ono0611/sovereign-deploy-kit/issues/26) で実測検証します。失敗したら artifact 側を直して再 ship。

> **Note for agents:** `--watch` モードは agent 環境で daemon を維持する責任が生まれます。short-lived agent session では `--no-watch` を使い、bag が伝播するのを別途待ってください。**MCP server は `keep_alive: true` を拒否します**(daemon tracking が未実装)— keep-alive flow が必要なら CLI を使うこと。

---

## なぜ必要か

DeFi プロトコルのフロントエンドが繰り返し「強制オフライン」にされている:

- **Tornado Cash** → 米OFAC制裁でフロントエンドが完全削除
- **Uniswap** → 特定トークンへのフロントエンドアクセスを制限
- **1inch, Balancer など** → ジオブロック、ドメイン停止

これらは全て同じ構造: **スマートコントラクトは生きているが、Webサイトが死んでいる**。原因は単純で、普通のサーバーとドメインを使っているから。

TON ブロックチェーンにはこれを解決するインフラが既に存在する。ただし、使うには専門知識と複雑な設定が必要だった。このツールはそれをゼロ設定にする。

---

## 仕組み

### TON Storage (分散ファイルストレージ)

- ファイルをブロックチェーンネットワーク上に分散保存
- コンテンツアドレス (Bag ID) で識別 — 内容が変わらない限りURLも変わらない
- サーバーなし、削除不可、永続

**アーキテクチャ:**
- Bag は ADNL プロトコルでアクセス可能（ton:// URL）
- ネットワークへの伝播には数分〜数時間かかります
- ton.run などのパブリックゲートウェイは、伝播完了した bag のみアクセス可能
- セルフホスティング（デフォルト）では、あなたの PC がオフラインだとアクセス不能

**実用的なホスティング（v0.5 時点の現実）:**
- **第一の選択肢は自前 daemon を稼働させ続けること** (`--watch`)。 これは TON Foundation 自身が `foundation.ton` を運用している方法でもあります
- 24 時間ホストの抜け道として「ストレージプロバイダー契約」 (`--provider`) も実装していますが、 **mainnet provider 経済は現状ほぼ稼働していません**（Round 1〜7 mainnet soak 結果: [`docs/v0.5/round-postmortem.md`](docs/v0.5/round-postmortem.md)）。 当面 experimental として扱ってください
- **将来 (v0.6 ロードマップ)**: ADNL Tunnel 経由で公開 IP を持たない user でも自前 host できるよう拡張予定 ([`docs/v0.6/roadmap-draft.md`](docs/v0.6/roadmap-draft.md))

### TON DNS (.ton ドメイン)

- `myprotocol.ton` のような人間可読ドメインをブロックチェーン上に登録
- 差し押さえ不可、更新も本人の署名のみ
- TON Proxy 経由でアクセス可能 (v0.2)

### データフロー

```
npx ton-sovereign-deploy ./build/
         │
         ├─→ ./build/ を検証 (dist/ | build/ | out/ | public/ を自動検出)
         │
         ├─→ ~/.ton-sovereign/bin/storage-daemon を確認
         │     なければ TON 公式リリースから自動DL (初回のみ、約30秒)
         │
         ├─→ storage-daemon 経由で TON ネットワークに分散送信
         │     BitTorrent的なチャンキング + Merkle木でハッシュ化
         │
         └─→ Bag ID を取得 → 結果を表示
```

---

## ロードマップ

### v0.1 — TON Storage アップロード (Day 1-5) ✅

```bash
npx ton-sovereign-deploy ./build/
# → bag ID + ton:// URL（ADNL アクセス）
```

- ✅ セルフホスティングならウォレット不要
- ✅ セットアップ不要 (`storage-daemon` は自動DL）
- ✅ Vite / Next.js export / CRA のビルド出力を自動検出
- ✅ macOS/Linux/Windows 対応

**現在の制限:**
- ⚠️ ton.run などのパブリックゲートウェイは 404 を返す可能性があります（bag が伝播するまで）
- ⚠️ セルフホスティングでは PC オフライン時にアクセス不能
- ⚠️ 24時間ホストにはストレージプロバイダー契約が必要（有料）

### v0.2 — .ton DNS 登録 (Day 6-10) ✅

```bash
npx ton-sovereign-deploy ./build/ --domain myprotocol.ton
# → TON Connect でウォレット署名
# → myprotocol.ton でアクセス可能に
```

- ✅ TON Connect ディープリンク生成
- ✅ QR コード表示（ターミナル内）
- ✅ DNS レコードオンチェーン確認（ポーリング）
- ✅ TONAPI 経由のドメイン所有権確認

### v0.3 — 仕上げ ✅ 完了

```bash
npx ton-sovereign-deploy ./build/
# → bag ID + ton:// URL（ADNL アクセス）
# → bag ID + ton:// URL + 伝播確認
# → GitHub Actions + Windows サポート + watch モード
```

- ✅ TONAPI.io 経由で bag のステータス確認（verifyBagOnNetwork）
- ✅ GitHub Action サポート（`--ci-mode`, `--json-output`）
- ✅ Windows サポート（win32-x64, win32-arm64, win32-ia32）
- ✅ `--watch` モード（ファイル変更時に自動再デプロイ、daemon を動かし続けて伝播を促進）

**注意:** verify は 60 秒でタイムアウトしますが、実際の伝播には数時間かかる場合があります。

---

## 競合との比較

| ツール | 分散? | 1コマンド? | .ton DNS? | CI/CD? | Windows? |
|--------|-------|-----------|-----------|---------|---------|
| Vercel / Netlify | No (中央集権) | Yes | No | Yes | Yes |
| IPFS / Fleek | Yes | Yes | No (.eth のみ) | Yes | Yes |
| TON CLI (手動) | Yes | No | 手動設定 | No | No |
| **Sovereign Deploy Kit** | **Yes** | **Yes** | **Yes (v0.2)** | **Yes (v0.3)** | **Yes (v0.3)** |

直接の競合: ゼロ。

---

## ターゲットユーザー

1. **DeFiプロトコル開発者** — フロントエンドのテイクダウンリスクを排除したい
2. **TONエコシステム開発者** — .ton サイトを簡単に立ち上げたい
3. **検閲リスクのあるアプリ全般** — ジャーナリズム、プライバシーツール、DAO フロントエンド

---

## 開発状況

**ステータス:** v0.8.0-rc2 (2026-05-11) — MCP server bootstrap + SDK の DNS write 実装。GA は V3 (Claude Code MCP→testnet E2E) と V4 (agency-transfer red-team test) を通過後。

### Released
- **v0.1** ✅ — TON Storage アップロード
- **v0.2** ✅ — .ton DNS 登録（`storage` レコード）
- **v0.3** ✅ — 仕上げ（疎通確認、GitHub Actions、Windows、watch モード）
- **v0.4** ✅ — `--provider` ストレージプロバイダー契約 (mainnet provider 経済は dormant。詳細: [`docs/v0.5/round-postmortem.md`](docs/v0.5/round-postmortem.md))
- **v0.5** ✅ — TonConnect SDK 統合 / 自前 BOC / 防御深化 / `op::close_contract` 救出ルート
- **v0.6** ✅ — `sites` (ADNL Address) レコード対応 / ADNL Tunnel クライアント統合 / self-host first README / Payment Network 抽象化
- **v0.7** ✅ — `--site-auto` で rldp-http-proxy 自動 spawn + ADNL identity 自前 mint
- **v0.8.0-rc1** ✅ (2026-05-10) — agent-surface track の first-useful flag-plant: README "Agent quickstart" + npm keywords + doc rescope
- **v0.8.0-rc2** ✅ (2026-05-11) — MCP server (`ton-sovereign-mcp`)、SDK 抽出 (`src/sdk/`)、SDK DNS write (TonConnect 経由)、ESLint v9 no-console gate、GitHub Actions CI、プロジェクト全体リファクタリング (-290 LOC)

### Pending for v0.8.0 GA
- **[V3] #18** — Claude Code MCP client → testnet deploy E2E (S2.5 land 済、agent と testnet TON が必要)
- **[V4] #26** — Agency-transfer red-team test (fresh agent session、手動実行)
- **Agentic DNS path** — `wallet.kind: "agentic"` で DNS write を完了させる(現在は ERR_INVALID_INPUT、CLI を案内)。`@ton/walletkit` を経由した `~/.config/ton/config.json` の key loader 実装が必要

### v0.8 docs
- 全体ビジョン: [`docs/v0.8/agent-native-pivot.md`](docs/v0.8/agent-native-pivot.md)
- MCP server 仕様: [`docs/v0.8/mcp-core-requirements.md`](docs/v0.8/mcp-core-requirements.md)
- 2026-05-10 コンセプト更新ログ: [`docs/v0.8/concept-update-2026-05-10.md`](docs/v0.8/concept-update-2026-05-10.md)
- P-1 `@ton/mcp` compose contract probe: [`docs/v0.8/at-mcp-probe.md`](docs/v0.8/at-mcp-probe.md)

### v0.9 reserve
v0.7 から繰り延べた C2 NAT traversal (`adnl-tunnel-client`) + C3 Payment Network 実クライアント。詳細: [`docs/v0.7/roadmap-draft.md`](docs/v0.7/roadmap-draft.md) の C2 / C3 セクション (もとは v0.8 parked、agent-surface が v0.8 を取った 2026-05-10 の rename で v0.9 に降格)。

**リリース:** https://github.com/Masashi-Ono0611/sovereign-deploy-kit

**npm:** `npm install -g ton-sovereign-deploy` (CLI) / `npx -y --package ton-sovereign-deploy ton-sovereign-mcp` (MCP server)

---

## 困った時のために — 資金救出

`--provider` で sign したのち provider が `accept_storage_contract` を発行しないまま日数が経つ場合、 storage contract に保留された残金は user が `op::close_contract` (0x79f937ea) を送れば回収できます。 mainnet で実証済みのスクリプトを同梱しています:

```bash
node scripts/close-storage-contract.cjs <storage-contract-address>
```

[詳細とフィールド実証ログ](docs/v0.5/round-postmortem.md)。

---

## CI/CD 連携 (v0.3)

### GitHub Actions で自動デプロイ

`git push` するだけで TON Storage にデプロイできます。

**セットアップ:**

```bash
# 1. テンプレートをコピー
mkdir -p .github/workflows
cp node_modules/ton-sovereign-deploy/templates/github-workflow.yml \
   .github/workflows/deploy.yml

# 2. Git に追加
git add .github/workflows/deploy.yml
git commit -m "Add TON Storage deployment"

# 3. Push すると自動デプロイ
git push origin main
```

**ワークフローの機能:**

- `main` ブランチへの push で自動デプロイ
- `--ci-mode` でスピナー無効化（ログが見やすい）
- `--json-output` で bag ID を後続ステップで参照可能
- プルリクエストにプレビュー bag ID を自動コメント

**出力例:**

```
🚀 Deployed to TON Storage
Bag ID: a3f9c82e1b4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1
ton://a3f9c82e...
Bag may take minutes-hours to propagate through network
```

**注意:** CI 環境では verify が失敗しても正常です。bag は作成されていますが、ネットワークへの伝播には時間がかかります。watch モードは CI では使用できません。

---

## ton:// URL の使い方

### ton:// URL とは

ton:// URL は TON の ADNL プロトコルを使用したコンテンツアドレスです。一度作成された bag は変更不可で、ネットワーク上に永続的に存在します。

### アクセス方法

**1. Ton HTTP Proxy 経由（推奨）**

ローカルで Ton HTTP Proxy を実行し、ブラウザからアクセスします：

```bash
# Ton HTTP Proxy をインストール
npm install -g @ton-community/http-proxy

# プロキシを起動
ton-http-proxy

# ブラウザでアクセス
open http://localhost:8080/ton://bag-a3f9c82e1b4d...
```

**2. storage-daemon が実行中の場合**

このツールの watch モードを使用している場合、bag はあなたの PC から直接アクセス可能です：

```bash
# ターミナル1: watch モードでデプロイ
npx ton-sovereign-deploy ./build/ --watch

# ターミナル2: bag にアクセス
# daemon が ADNL ポートでリクエストを受け付け
```

**3. 伝播後のパブリックアクセス**

bag がネットワークに伝播した後（数分〜数時間）、以下の方法でアクセス可能になる場合があります：

- ton.run（bag が "active" と認識された場合のみ）
- その他の TON Storage プロバイダー

ただし、これらは保証されません。24時間アクセス可能にするには、ストレージプロバイダー契約が必要です。

### watch モードで伝播を促進

```bash
# ファイル変更を監視し、daemon を動かし続ける
npx ton-sovereign-deploy ./build/ --watch

# daemon が実行中のため、ネットワークは bag を発見しやすくなります
# Ctrl+C で停止するまで、あなたの PC が bag のシードとなります
```

### 伝播時間の目安

- **最速:** 数分（既存の活発なノードがある場合）
- **通常:** 30分〜2時間
- **最悪:** 数時間（ネットワークの状態による）

verify コマンドで 60 秒待機してチェックしますが、これは "minimum viable verification" です。実際にはさらに時間がかかる場合があります。

---

## CLI オプション

### 基本

```bash
ton-sovereign-deploy [build-dir] [options]
```

| オプション | 説明 |
|-----------|------|
| `[build-dir]` | ビルドディレクトリ (省略時は自動検出) |
| `--testnet` | TON テストネットを使用 |
| `--desc <text>` | Bag の説明 |
| `--domain <domain>` | .ton ドメインに登録 (v0.2) |
| `--ci-mode` | CI 環境向けスピナー無効化 (v0.3) |
| `--json-output` | JSON 出力 (v0.3)。 `--ci-mode` または `--json-output` のときは `--watch` が **自動的に無効** になり、 upload 完了後に exit します（CI hang 防止） |
| `--watch` | ファイル変更を監視して自動再デプロイ（**v0.6 以降、 対話実行ではデフォルトで有効**） |
| `--no-watch` | watch モードを無効化し upload 完了後に exit（CI / one-shot deploy 用）v0.6+ |
| `--debounce <ms>` | watch モードのデバウンス遅延（デフォルト: 2000ms） |
| `--daemon-backend <name>` | daemon バックエンド: `tonutils` (デフォルト、 v0.6+) / `ton-core`（C++ レガシー、 `--testnet` や `--provider` を使うときの fallback）|
| `--tunnel-config <path>` | ADNL Tunnel の `nodes-pool.json` を指定（v0.6+、 tonutils backend のみ）。 NAT 越えに使う。 公開可能なプールはまだないため **bring-your-own-pool**（運営者から個別取得）|
| `--site-adnl <hex>` | 64 文字 hex の ADNL identity を `dns_adnl_address` (`site` レコード、 magic `0xad01`) として `--domain` 指定の .ton に書き込む（v0.6+ B5）。 **bring-your-own rldp-http-proxy**: 既に動いている proxy の ADNL hash を渡す前提（自動 spawn は v0.7）。 `--domain` と併用すると、 storage と site の 2 record を **1 度の TonConnect 署名** にまとめます。 セットアップ手順: [`docs/v0.6/byo-rldp-http-proxy.md`](docs/v0.6/byo-rldp-http-proxy.md) |
| `--provider [address]` | **v0.6 では backend に関わらず disabled**（mainnet provider 経済が dormant なため、 daemon migration 中は安全側に倒している）。 v0.5 で動いた実装コードは tree に残っており v0.7 で再有効化予定。 詳細: [`docs/v0.5/round-postmortem.md`](docs/v0.5/round-postmortem.md) |
| `--span <seconds>` | プロバイダー契約期間（秒、デフォルト 86400 = 1 日、最大 4294967295）v0.5+ |
| `--wallet <name>` | 署名する wallet の希望名（部分一致、 デフォルト "Tonkeeper"）v0.5+ |
| `--skip-verify` | bag アクセス確認をスキップ（伝播には時間がかかるため） |

加えて v0.6 から `ton-sovereign-deploy doctor` で環境チェックができます（daemon バイナリ・ TONAPI・ TonConnect manifest の到達性・ wallet pairing 状態）。 deploy 前のトラブルシュートに。

### CI/CD 向けオプション

```bash
# JSON 出力 (スクリプトで解析しやすい)
ton-sovereign-deploy ./build/ --json-output
# → {"bagId":"...","tonUrl":"ton://...","fallbackUrl":"https://..."}

# CI モード (GitHub Actions 等でログが見やすい)
ton-sovereign-deploy ./build/ --ci-mode --json-output
```

### バックエンド選択（v0.6 以降）

v0.6 から **bundled daemon を `tonutils-storage` (xssnick / Go)** に切り替えました。 これは [TON-Torrent](https://github.com/xssnick/TON-Torrent) や [Resistance Tools](https://telegra.ph/TON-Proxy-Introducing-optional-traffic-micro-payments-and-privacy-via-garlic-routing-03-08) スタックが使う daemon そのものです。

```bash
# デフォルト = tonutils backend (Go)
ton-sovereign-deploy ./build/

# レガシー TON Core C++ daemon に切替（--testnet / --provider を使う場合）
ton-sovereign-deploy ./build/ --daemon-backend=ton-core
```

| 機能 | tonutils (default) | ton-core (legacy) |
|---|---|---|
| Bag upload + seed | ✅ | ✅ |
| `--watch` (auto-redeploy) | ✅ (v0.6 step B2.x で実装) | ✅ |
| `--tunnel-config` (ADNL Tunnel) | ✅ (v0.6 step B3.x で対応) | ❌（C++ daemon に tunnel client なし） |
| `--testnet` | ❌ | ✅ |
| `--provider` | ❌（v0.6 は provider 経路全体を一時 disable） | ⚠ experimental（mainnet provider 経済 dormant） |

#### ADNL Tunnel — NAT 越え

家の WiFi など **公開 IP がない環境** でも bag を seed させるには、 ADNL Tunnel intermediate node を経由します（[TON Foundation 公式 2025-03 発表](https://telegra.ph/TON-Proxy-Introducing-optional-traffic-micro-payments-and-privacy-via-garlic-routing-03-08)）。

```bash
# 運営者から受け取った nodes-pool.json を渡す
ton-sovereign-deploy ./build/ --tunnel-config ./tunnel-pool.json
```

**現状の制約**: 公開できる community-run pool が存在しないため、 nodes-pool.json は **tunnel 運営者から個別に取得**する必要があります（[xssnick/TON-Torrent](https://github.com/xssnick/TON-Torrent) と同じ運用）。 運営者の community / Telegram チャンネルから入手してください。 v0.6 では CLI 表面と config 配線まで対応、 default pool curation または自前運営は v0.7 以降の判断です。

### Watch モード（v0.6 以降デフォルト）

**v0.6 から `--watch` が対話実行時の既定挙動です。** 引数なしで実行すると daemon が常駐し、 ファイル変更を監視して自動再デプロイします（ただし auto-redeploy は現状 ton-core backend のみ）。

```bash
# 既定挙動: watch モードで起動 (= self-host first)
ton-sovereign-deploy ./build/

# 一回限りでデプロイして即 exit したい場合 (CI 向け)
ton-sovereign-deploy ./build/ --no-watch

# デバウンス3秒（大規模プロジェクト向け）
ton-sovereign-deploy ./build/ --debounce 3000
```

**watch モードの動作:**
- ファイル変更を検知すると自動的に再デプロイ
- 連続する変更を1回のデプロイに集約（デバウンス）
- **daemon が常駐し、 ADNL でネットワークに seed し続ける** ← これが「self-host」 の中身
- Ctrl+C で停止

**重要:** PC をシャットダウンすると seed が止まるため、 bag にアクセスできなくなります。 実用的に常時 host したい場合の方法:
- ノートをスリープせず常駐 ASCII（最も基本）
- VPS / RaspberryPi / NAS で 24/7 daemon を稼働（[v0.6 のロードマップ](docs/v0.6/roadmap-draft.md)で ADNL Tunnel 統合し、 公開 IP 不要にする予定）
- `--no-watch` で one-shot deploy → 別途常駐サーバーで bag を seed

---
---

## 動作環境

### 対応 OS

- **macOS** — 10.15+ (Catalina 以上)
- **Linux** — x86_64, ARM64
- **Windows** — 10/11 (x64, ARM64) v0.3+

### システム要求

- **Node.js** 18+
- **PowerShell** 3.0+ (Windows のみ、標準搭載)
- **ネットワーク** — TON ノードとの通信に必要

### Windows 固有の注意事項

**初回実行時:**
- PowerShell が `storage-daemon-win-x86-64.exe` のダウンロードを実行
- Windows Defender または他の Antivirus ソフトが警告を表示する可能性があります
  - その場合: 「許可」または「除外」を選択してください
  - ファイルは公式 TON GitHub リリースから取得されます

**WSL (Windows Subsystem for Linux):**
- WSL 環境では Linux バイナリが使用されます
- WSL2 推奨（より良いネットワークパフォーマンス）

**パスの長さ:**
- Windows はデフォルトで 260 文字のパス制限があります
- `~\.ton-sovereign\` は短いため、通常問題にはなりません
- プロジェクトのパスが長い場合は、長いパスを有効化してください
