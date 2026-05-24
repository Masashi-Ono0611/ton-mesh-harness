# `nextjs-static-export` — Next.js `output: 'export'` to .ton

A minimal Next.js (App Router) app configured for **static export**.
`next build` emits a fully static `out/` directory you publish to TON
Storage. No Node server runs at deploy time — which is exactly what a
censorship-resistant `.ton` site needs.

## 1. Build

```bash
cd examples/nextjs-static-export
npm install
npm run build      # next build → out/  (with output: 'export')
```

`next.config.mjs` sets:
- `output: 'export'` — emit a static site to `out/` (no SSR, no API routes).
- `images: { unoptimized: true }` — there is no server to run the Image
  Optimization API.
- `trailingSlash: true` — folder-style routes (`/about/index.html`) so a
  gateway can map each route to a file.

## 2. Deploy

### TonConnect (mainnet, human signature)

```bash
npx -y ton-sovereign-deploy ./out \
  --domain <yours>.ton \
  --no-watch
```

Scan the QR with Tonkeeper / MyTonWallet, approve the
`change_dns_record` transaction, wait ~1 minute for propagation.

### Agentic (mainnet, no human in the loop)

```bash
# Prerequisite: a wallet in ~/.config/ton/config.json
# (set up via `npx -y @ton/mcp@alpha agentic_import_wallet`).
npx -y ton-sovereign-deploy ./out \
  --domain <yours>.ton \
  --wallet-mode agentic \
  --no-watch \
  --json-output
```

## 3. Iterate with `--watch`

```bash
# Terminal A — rebuild out/ on changes (re-run build; Next has no
# incremental static-export watcher):
npm run build

# Terminal B — re-deploy whenever out/ changes, keep the daemon seeding:
npx -y ton-sovereign-deploy ./out --domain <yours>.ton
```

To keep seeding after you close the terminal, hand the daemon to the OS:
`npx -y ton-sovereign-deploy ./out --domain <yours>.ton --daemon-mode service --no-watch`.

## Next-specific routing caveats

- **No SSR / no API routes / no Server Actions**: static export is
  client-only. Anything needing a server (`getServerSideProps`, route
  handlers, middleware) won't work — the build will error or those paths
  won't render.
- **Absolute `/_next/...` asset paths**: Next emits absolute asset URLs and
  has no clean relative-base option. This is fine under a `.ton` **domain
  root** (`yourname.ton/_next/...` resolves), but a path-prefixed public
  **gateway** (`gateway/<bag-id>/_next/...`) will 404 on assets. If you
  need gateway-prefix portability, prefer the `vite-spa/` example
  (`base: './'`).
- **Dynamic routes** need `generateStaticParams` so every path is
  pre-rendered at build time.

## Not shipped in the npm tarball

This example lives in the repo only (clone-and-run). Copy the directory
into your own project as a starting point rather than referencing it
from `node_modules`.
