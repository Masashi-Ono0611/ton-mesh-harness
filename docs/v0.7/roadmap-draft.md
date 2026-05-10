# v0.7 roadmap — draft (2026-05-10)

**Status:** draft, not committed scope. Updated as v0.6 lands and we
learn from the BYO rldp-http-proxy guide in real use.

v0.6 delivered the *write path* for `dns_adnl_address` on top of a
user-managed proxy. v0.7 closes the loop: minting the ADNL identity,
spawning the proxy, surviving NAT, and bringing the Payment Network
abstraction online.

## Scope (in priority order)

### C1 — Auto-spawn `rldp-http-proxy` + ADNL key minting

The B5 follow-up. Removes the BYO step: the CLI generates the
identity, runs the proxy, and feeds the hex into the existing
`--site-adnl` write path.

Two routes for the key generation:

1. **Bundle `generate-random-id`** by extracting it from
   `ton-{platform}.zip` (96 MB download — heavy but one-shot,
   cached in `~/.ton-sovereign/bin/`). Mirrors the existing
   `tonutils-storage` installer pattern. Lower risk; produces a
   key file in the exact format `rldp-http-proxy` already reads.
2. **Mint the key in pure JS** via `crypto.generateKeyPairSync('ed25519')`
   + manual TON `keyring/<sha256_pubkey_hex>` file format
   (`[magic:0x4a8a8645][priv:32B]`). No download, but we'd own the
   serialization details.

Default direction: route (1). Smaller blast radius and the 96 MB is
absorbed once across all v0.7 features (the same zip also carries
`adnl-tunnel-client`).

Open questions:

- How do we surface the ADNL hex back to the user? `doctor` extension
  + a `~/.ton-sovereign/site-adnl.txt` file?
- Static-file server: spawn a Node `http.createServer` rooted at the
  build dir, port-forwarded into rldp-http-proxy via `-R`?
- Default UDP port choice (the proxy needs an inbound port reachable
  from the wider internet — public IP discovery via STUN-like probe
  or just a flag the user sets).

### C2 — `adnl-tunnel-client` server-side variant for NAT traversal

The piece that makes the v0.7 self-host story actually work on a
laptop. ADNL Tunnel can carry inbound rldp connections so the user
doesn't need a public IP / port-forward.

This is *outside* TON Foundation's published guidance for
`rldp-http-proxy` and is mostly community knowledge from the
Resistance Tools stack. Likely needs a small Go shim or a thin Go
binary we ship as an additional dependency (xssnick has a tunnel
implementation in `tonutils-go` we can wrap).

### C3 — Real `PaymentNetworkClient` (open-channel + pay tunnel rentals)

The v0.6 stub at `src/payments/` becomes a working client. v0.7
exercises it for one specific use case: paying for an ADNL Tunnel
intermediate node's bandwidth so the C2 self-host path doesn't
require the user to find their own (gratis) tunnel pool.

Realistic scope:

- Open a single-payer single-payee channel with the chosen tunnel
  operator.
- Push micro-payments per N MB transferred.
- Close the channel cleanly on `--no-watch` exit / Ctrl-C.

`xssnick/ton-payment-network` is the upstream library; v0.7's
deliverable is "use it, don't reinvent it."

### C4 — Provider revival (conditional)

`--provider` was disabled in v0.6 because the mainnet provider
economy is dormant (Round 1–7 post-mortem). v0.7 should:

- Run the dormancy probe again. If providers are still asleep,
  `--provider` stays disabled.
- If signs of life appear, rewire `--provider` against the tonutils
  daemon path (the v0.6 backend swap left it on the legacy ton-core
  daemon).

This is a triage milestone, not a guaranteed feature.

### C5 — Doctor extensions

- C5.1: probe the user's BYO rldp-http-proxy if `~/.ton-sovereign/site-adnl.txt`
  exists (or the auto-spawn variant after C1).
- C5.2: warn if `--domain` was used without `--site-adnl` and the
  user appears to be self-hosting a SPA (heuristic: `index.html`
  references `/api/...` or a router).
- C5.3: surface tunnel-pool reachability (post-C2).

## Out of scope for v0.7

- Operating a storage provider ourselves — economics still wrong.
- Building our own ADNL Tunnel pool — we want users on
  community-run pools where the trust model is already vetted.
- A web dashboard / hosted service — kit stays CLI-first.

## Decision criteria

- C1 + C2 ship as a pair or not at all. Auto-spawn without NAT
  traversal is worse than BYO (fails silently for users behind
  NAT, which is most of them).
- C3 ships only if there's a community tunnel operator willing to
  test against us. Otherwise the payment client has no real-world
  exercise and is just code.
- C4 ships only if the dormancy probe shows liveness.
- v0.7 is *user-experience* work, not protocol work. Most of the
  protocol pieces already exist — we're orchestrating them.

## Open questions

- `generate-random-id` from the 96 MB zip vs pure-JS mint: re-evaluate
  once we benchmark the unzip cost. If it's >5 s on first run, the
  pure-JS path becomes more attractive.
- ADNL Tunnel: do we discover community pools from a list we
  maintain (`docs/v0.7/tunnel-pools.json`?) or punt entirely to
  user-supplied configs? Current bias: maintain a tiny curated list
  of 1–2 pools we've personally smoke-tested.
- Versioning: do we tag `v0.7.0` only when C1+C2 are both green, or
  ship intermediate `v0.7.0-rc1` releases for early feedback? Bias:
  rc-tag for community feedback, then `v0.7.0` for the real ship.
