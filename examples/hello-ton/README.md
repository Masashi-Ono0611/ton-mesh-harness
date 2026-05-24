# `hello-ton` — minimal reference site

A single static HTML file. Smallest possible thing you can publish via
this kit. Used by the project's own V3 E2E acceptance test (Claude
Code MCP client → testnet deploy), and intended as the first site you
deploy when learning the kit.

## TonConnect deploy (mainnet, human signature via QR)

```bash
npx -y ton-sovereign-deploy ./examples/hello-ton \
  --domain <yours>.ton \
  --no-watch
```

Scan the QR with Tonkeeper / MyTonWallet on your phone, approve the
`change_dns_record` transaction, wait ~1 minute for propagation.

## TonConnect deploy (testnet)

```bash
npx -y ton-sovereign-deploy ./examples/hello-ton \
  --testnet \
  --domain <yours>.ton \
  --no-watch
```

Note: `--testnet` runs on the default `tonutils` backend since post-rc11
(the daemon is started with the testnet `--network-config`). You'll need
testnet TON in the signing wallet and ownership of `<yours>.ton` on
testnet TON DNS.

## Agentic deploy (mainnet, no human in the loop)

```bash
# Prerequisite: a wallet in ~/.config/ton/config.json (set up via
# `npx -y @ton/mcp@alpha agentic_import_wallet`).
npx -y ton-sovereign-deploy ./examples/hello-ton \
  --domain <yours>.ton \
  --wallet-mode agentic \
  --no-watch \
  --json-output
```

Output is one line of JSON containing `bag_id`, `dns_tx_hash` (the
real on-chain hash), `daemon_api_url`, etc.

## What this proves

After a successful deploy, opening `<yours>.ton` in TON Browser (or
via Ton HTTP Proxy locally) renders this page. The bag content is
the same `index.html` you have in this directory — the Bag ID is a
content hash, so if you change a byte, the Bag ID changes and you
re-run the deploy.

## Reference for agents

This directory is intentionally tiny so an agent running V3 can pass
it through without a build step. If the agent finds the kit (per the
V4 discoverability test), pointing it at `./examples/hello-ton`
should yield a working deploy in under a minute.
