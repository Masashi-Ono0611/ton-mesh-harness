# `vite-spa` — Vite + React, built then deployed to .ton

A minimal Vite + React single-page app. Unlike `hello-ton/` (a raw
`index.html`), this example has a **build step** — the realistic case
for "I have a real frontend, how do I publish it to `.ton`?".

## 1. Build

```bash
cd examples/vite-spa
npm install
npm run build      # → dist/  (index.html + ./assets/*)
```

> **The one Vite setting that matters for `.ton`:** `vite.config.js` sets
> `base: './'`. A deployed site is a content-addressed bag, served from
> the domain root under `yourname.ton` but under a `/<bag-id>/` path
> prefix via public gateways. Relative asset URLs work in both; absolute
> (`/assets/...`) URLs 404 on gateways. Keep `base: './'`.

## 2. Deploy

### TonConnect (mainnet, human signature)

```bash
npx -y ton-mesh-harness ./dist \
  --domain <yours>.ton \
  --no-watch
```

Scan the QR with Tonkeeper / MyTonWallet, approve the
`change_dns_record` transaction, wait ~1 minute for propagation.

### Agentic (mainnet, no human in the loop)

```bash
# Prerequisite: a wallet in ~/.config/ton/config.json
# (set up via `npx -y @ton/mcp@alpha agentic_import_wallet`).
npx -y ton-mesh-harness ./dist \
  --domain <yours>.ton \
  --wallet-mode agentic \
  --no-watch \
  --json-output
```

One line of JSON with `bag_id`, the real on-chain `dns_tx_hash`,
`daemon_api_url`, etc.

## 3. Iterate with `--watch`

```bash
# Terminal A — rebuild dist/ on every source change:
npm run build -- --watch

# Terminal B — re-deploy whenever dist/ changes, keep the daemon seeding:
npx -y ton-mesh-harness ./dist --domain <yours>.ton
```

`--watch` is the default for interactive runs: the daemon stays alive
to seed your bag, and a fresh `bag_id` is published whenever the build
output changes (the Bag ID is a content hash).

To keep seeding after you close the terminal, hand the daemon to the OS:
`npx -y ton-mesh-harness ./dist --domain <yours>.ton --daemon-mode service --no-watch`.

## Caveats

- **Client-side routing**: a pure SPA serves `index.html` for `/`. Deep
  links (`/about`) only work if the gateway falls back to `index.html`.
  For hard-routed paths, pre-render to static HTML (see the
  `nextjs-static-export/` example).
- **No env-time secrets**: everything in `dist/` is public and immutable.

## Not shipped in the npm tarball

This example lives in the repo only (clone-and-run). Copy the directory
into your own project as a starting point rather than referencing it
from `node_modules`.
