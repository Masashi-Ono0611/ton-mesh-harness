# BYO `rldp-http-proxy` — minting the ADNL identity for `--site-adnl`

**Audience:** users who want the v0.6 B5 `--site-adnl` flow to publish a
real, browseable `.ton` site (piracy.ton-style), not just a record on
chain. v0.7 will automate this; today it's a one-time VPS setup.

**Prerequisites:**

- A host with a public IPv4 address and at least one inbound UDP port
  reachable from the internet.
- ~30 MB free disk and the ability to run two binaries.
- Your build directory served over plain HTTP on `127.0.0.1` of the
  host (any static-file server works — `python -m http.server`,
  `caddy`, `nginx`, `npx serve`, etc.).

## 1. Download the binaries

Grab `rldp-http-proxy` and `generate-random-id` from the latest
`ton-blockchain/ton` release. The standalone proxy binary is
published per OS/arch; `generate-random-id` is bundled inside the
platform zip (`ton-mac-arm64.zip`, `ton-linux-x86_64.zip`, …).

```bash
# Example for Linux x86_64 — adjust for your platform.
curl -fsSL -o rldp-http-proxy \
  https://github.com/ton-blockchain/ton/releases/download/v2026.04-1/rldp-http-proxy-linux-x86_64
curl -fsSL -o ton.zip \
  https://github.com/ton-blockchain/ton/releases/download/v2026.04-1/ton-linux-x86_64.zip
unzip -j ton.zip 'utils/generate-random-id' -d .
chmod +x rldp-http-proxy generate-random-id
```

## 2. Mint the ADNL identity

```bash
mkdir -p proxy-db/keyring proxy-db/log
./generate-random-id -m adnl -n proxy-db/keyring/site
# → prints   <PUB_HASH_HEX>  <PUB_HASH_BASE64>
```

The first column (the 64-character hex string) is what you pass to
`--site-adnl`.

```bash
SITE_ADNL=$(./generate-random-id -m adnl -n proxy-db/keyring/site | awk '{print $1}')
echo "site ADNL: $SITE_ADNL"
```

## 3. Get the mainnet global config

```bash
curl -fsSL -o ton-global.config.json \
  https://ton-blockchain.github.io/global.config.json
```

## 4. Run the proxy

```bash
./rldp-http-proxy \
  -C ton-global.config.json \
  -D proxy-db \
  -A "$SITE_ADNL" \
  -a "<your-public-ipv4>:<inbound-udp-port>" \
  -L "yourdomain.ton" \
  -R "yourdomain.ton:80@127.0.0.1:18080" \
  -l proxy-db/log/proxy.log
```

- `-A` — the ADNL identity from step 2 (hex).
- `-a` — public `<ip>:<udp-port>`. UDP must be reachable from the
  open internet.
- `-L`/`-R` — map `yourdomain.ton:80` to the local static server you
  expose on `127.0.0.1:18080`. Adjust the local port to match your
  static server.

Verify it's responding by visiting `http://yourdomain.ton/` from
Telegram's TON Browser or any TON Proxy gateway. (The `.ton` →
`ADNL` resolver lookup will fail until step 5; for a smoke test
right after starting the proxy, request the ADNL directly from a
TON-capable client.)

## 5. Publish the DNS record

Back on your laptop:

```bash
ton-sovereign-deploy ./build/ \
  --domain yourdomain.ton \
  --site-adnl "$SITE_ADNL"
```

The CLI:

1. Detects the build dir, uploads to TON Storage, prints the bag ID.
2. Looks up the `yourdomain.ton` NFT.
3. Bundles **two** `change_dns_record` messages (`storage` and
   `site`) into one TonConnect transaction — you sign once.
4. Polls TONAPI for both records to land. (TONAPI lags for site
   records — it may say "not yet visible"; check directly with
   `node scripts/dns-probe.cjs` or open in TON Browser.)

Total cost: 2 × 0.05 TON ≈ 0.10 TON for gas, plus standard storage
fees.

## Notes

- This is the same pattern piracy.ton, tonnet-sync-check.ton, and
  most Telegram-visible `.ton` sites use today (see
  `docs/archive/v0.6/sites-record-discovery.md`).
- Behind NAT? You need either a port-forward, a public-IP VPS, or
  an `adnl-tunnel-client` in server mode. The latter is v0.7 work.
- Want to run only the storage record (no `--site-adnl`)? That still
  works — TON Browser falls back to fetching the bag directly. The
  trade-off: foundation.ton-style storage hosting can't serve
  arbitrary HTTP routes (e.g. SPA history-API URLs), only the static
  files in the bag.
