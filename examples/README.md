# `examples/` — runnable reference sites

Each subdirectory is a real, deploy-ready site. `hello-ton/` is build-free
(used by the kit's own V3 / V4 tests); the others mirror a realistic
"build, then deploy" workflow for a real frontend framework.

## Index

| Example | Build step | Purpose |
|---|---|---|
| [`hello-ton/`](./hello-ton/) | none | Minimal "hello world" — one `index.html`. The default V3 reference site. |
| [`vite-spa/`](./vite-spa/) | `npm run build` → `dist/` | Vite + React SPA. The realistic "I have a real frontend" flow, with the `base: './'` setting that makes assets resolve under both a `.ton` domain and a gateway prefix. |
| [`nextjs-static-export/`](./nextjs-static-export/) | `next build` → `out/` | Next.js `output: 'export'`. Static export flow + Next-specific routing caveats (no SSR, absolute `/_next/` asset paths). |
| [`astro-static/`](./astro-static/) | `astro build` → `dist/` | Astro (static by default). Static-site-generator flow; same absolute-asset-path caveat as Next. |

## What goes in `examples/`

- Either build-free sites (`hello-ton/`) or realistic apps with a
  documented `npm install` + build step (`vite-spa/`,
  `nextjs-static-export/`).
- One purpose per directory.
- A README that documents the build step and the TonConnect + Agentic
  deploy invocations side-by-side, so the directory works as both a
  learning aid and (for the build-free ones) an E2E test fixture.

## Not shipped in the npm tarball

These examples live in the repo only — they're not part of the
published `dist/`. They're for clone-and-run learning, not for npm
consumers.

If you want to use one as a starting point, copy the directory into
your own project rather than referencing it from `node_modules`.
