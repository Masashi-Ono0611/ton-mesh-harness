# `astro-static` — Astro static build to .ton

A minimal Astro site. Astro is **static by default** (no adapter → a fully
static `dist/`), so it drops straight onto TON Storage.

## 1. Build

```bash
cd examples/astro-static
npm install
npm run build      # astro build → dist/
```

## 2. Deploy

### TonConnect (mainnet, human signature)

```bash
npx -y ton-mesh-harness ./dist \
  --domain <yours>.ton \
  --no-watch
```

Scan the QR with Tonkeeper / MyTonWallet, approve the `change_dns_record`
transaction, wait ~1 minute for propagation.

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

### Keep it seeding after you close the terminal

```bash
npx -y ton-mesh-harness ./dist --domain <yours>.ton \
  --daemon-mode service --no-watch   # hands the daemon to launchd/systemd
```

## 3. Iterate with `--watch`

```bash
# Terminal A — rebuild dist/ on changes:
npm run build

# Terminal B — re-deploy whenever dist/ changes, keep the daemon seeding:
npx -y ton-mesh-harness ./dist --domain <yours>.ton
```

## Astro-specific caveats

- **Absolute `/_astro/...` asset paths**: like Next.js, Astro emits absolute
  asset URLs. This is fine under a `.ton` **domain root** (`yourname.ton`),
  but a path-prefixed public **gateway** (`gateway/<bag-id>/_astro/...`)
  will 404 on assets. For gateway-prefix portability prefer the
  `vite-spa/` example (`base: './'`).
- **No SSR / server endpoints**: this example uses no adapter, so it's
  fully static. Adding an SSR adapter (`@astrojs/node`, etc.) would need a
  server and can't be served from TON Storage.

## Not shipped in the npm tarball

This example lives in the repo only (clone-and-run). Copy the directory
into your own project as a starting point rather than referencing it from
`node_modules`.
