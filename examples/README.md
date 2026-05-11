# `examples/` — runnable reference sites

Each subdirectory here is a real, deploy-ready static site. They are
intentionally tiny so the kit's own end-to-end tests (V3) and any
agent doing autonomous discovery (V4) can deploy them without a
build step.

## Index

| Example | Purpose |
|---|---|
| [`hello-ton/`](./hello-ton/) | Minimal "hello world" — one `index.html`. The default V3 reference site. |

## What goes in `examples/`

- Self-contained sites (no `npm install`, no build).
- One purpose per directory.
- A README that documents the TonConnect + Agentic deploy invocations
  side-by-side, so the directory works as both a learning aid and an
  E2E test fixture.

## Not shipped in the npm tarball

These examples live in the repo only — they're not part of the
published `dist/`. They're for clone-and-run learning, not for npm
consumers.

If you want to use one as a starting point, copy the directory into
your own project rather than referencing it from `node_modules`.
