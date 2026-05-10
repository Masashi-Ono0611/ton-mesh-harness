# v0.6 roadmap — early draft

**Status:** raw findings + direction sketch. Not approved; ready for the next
discussion session.

## What changed our picture (2026-05-10)

Two complementary inputs hit on the same day:

1. **Round 1–7 mainnet soak post-mortem** (`round-postmortem.md`): the storage-
   provider economy is empty on mainnet. Our `--provider` route is technically
   correct but practically useless until providers come back to life.

2. **TON Foundation's actual direction** (Pavel Durov post pointing at
   "Resistance Tools"; xssnick repos; TON Core March-2025 announcement):
   the future of TON-side hosting isn't more storage providers — it's
   **TON Proxy intermediate nodes + ADNL Tunnels + the TON Payment Network
   (Layer 2)**, all framed as a digital-resistance / DDoS-resistance / privacy
   stack. xssnick (author of `tonutils-storage`, `TON-Torrent`,
   `ton-payment-network`) just received a 10,000 TON personal grant from
   Pavel Durov, signalling official backing of this stack.

Together these explain why our v0.5 Lane B felt like deploying onto a ghost
town: the ecosystem moved past "rent a storage provider for 24/7 hosting"
into "self-host with NAT-traversal via ADNL Tunnel, and pay tunnel/storage
operators in micropayments through the Payment Network when needed."

## Reference repos (all xssnick or ton-blockchain, all MIT/permissive)

| Repo | Role | Latest |
|---|---|---|
| `xssnick/tonutils-storage` | Go storage daemon (alt to TON Core's C++ one) | v1.4.1 (2026-04-06) |
| `xssnick/TON-Torrent` | Wails-based desktop GUI on top of `tonutils-storage`; bundles tunnel client | v1.7.2 (2025-07-16) |
| `xssnick/ton-payment-network` | TON Payment Network (Layer 2) node implementation | active |
| `ton-blockchain/adnl-tunnel` | Official ADNL Tunnel intermediate node (Garlic routing + PN payments) | active |

Quick spec digest:
- **adnl-tunnel** rents `address:port` to clients without public IP. Pays per
  packet via Payment Network when `PaymentsEnabled=true`. ADNL only — not a
  general HTTP proxy and not a VPN, on purpose.
- **ton-payment-network** is the L2 channels layer (onchain channels + virtual
  channels routed through hops, garlic-routed). The settlement pattern
  storage-provider rentals would naturally pay over.
- **tonutils-storage** + **TON-Torrent** can already use rented tunnels for
  bag seeding when the host has no public IP. This is the "self-host but make
  it actually work behind NAT" pattern, and is what `foundation.ton`-class
  sites quietly rely on.

## What this implies for sovereign-deploy-kit v0.6

The v0.5 pitch ("`--provider` gives you 24/7 hosting") is dishonest today.
The pitch we *can* honour, with code we already have plus modest additions,
is:

> **"Deploy a static site to TON Storage. Self-host via the daemon we install
> for you. Use an ADNL Tunnel when you don't have a public IP. Pay the tunnel
> operator in TON micro-payments. Optionally point a `.ton` domain at the bag.
> Provider-hosted 24/7 stays opt-in for the day mainnet providers come alive."**

Concrete changes from v0.5:

### Mandatory in v0.6

1. **Reposition docs/dashboard around self-host as the canonical mode.**
   - README + `docs/dashboard.html` lead with `--watch` and self-seeding.
   - `--provider` stays in the option list but is annotated "experimental;
     mainnet provider economy is currently dormant."
   - The `op::close_contract` recovery script is documented as the relief
     valve for users who try `--provider` and get stuck.

2. **Be honest about file-host paths.** Document that there are two `.ton`
   record types (`storage` for bag-based and `sites` for ADNL Address-based)
   and that real-world TON sites tend to use `sites`. We currently only write
   the `storage` path; this is a real gap.

### High-value, scoped additions

3. **`sites` (ADNL Address) record support** — extend `--domain` to optionally
   write a `sites` record pointing at the user's daemon ADNL identity. This is
   the path most live `.ton` sites already use. Likely 1–2 days of work once
   we have the daemon's ADNL identity exposed.

4. **ADNL Tunnel client integration (read-only first)** — let the user supply
   a tunnel config file (the same format `TON-Torrent` accepts) to seed
   without public IP. Marketing-wise this is the entire "deploy from a
   laptop" story: even if the laptop is behind a router, the bag stays
   reachable while the daemon is running.

### Speculative / business decision

5. **Operate our own tunnel(s) and bundle the config.** Becomes a SaaS.
   Pricing aligns with PN per-packet rates. Could be free up to a quota.

6. **Consider `tonutils-storage` as an alt daemon backend.** Same on-chain
   protocol, MIT-licensed, active maintenance, narrower binary, already
   ships with tunnel support. We currently rely on TON Core's C++ daemon
   purely because it was the official one — but xssnick's daemon is what
   the ecosystem actually runs.

7. **Payment Network integration.** Long-term: when tunnel and provider
   payments are needed, do them through PN channels rather than per-tx
   onchain payments.

## Open questions for the discussion session

- Does (3) `sites` record support actually solve more user pain than (4)
  tunnel integration? They're independent and we can do both, but order
  matters.
- Is (6) — switching to `tonutils-storage` as the bundled daemon — worth the
  user-perception risk of "you ship an unofficial daemon"? Counter:
  TON-Torrent already does this and got a 10,000 TON grant from Pavel.
- Does (5) — operating tunnels ourselves — turn this from a tool into a
  service, and is that a story we want?
- Where does v0.6 want to land tonally — same "censorship-resistant deploy
  in one command" pitch, or "digital-resistance toolkit" framing aligned
  with the Resistance Tools positioning?

## Order of decision (proposed)

1. Lock the **canonical mode** (Mandatory item 1) — docs and dashboard
   rewrite. Cheap, removes the dishonesty, can ship in a single PR.
2. Decide between (3) and (4) for the next code lane in v0.6, or commit to
   both with sequencing.
3. Park (5)/(7) as exploratory until a real user pulls on them.
4. Run (6) as a side-by-side experiment if we touch the daemon layer
   anyway.

## Out of scope for v0.6

- Building our own provider that competes with the dead ones. The economics
  don't work as a side-quest.
- Reinventing the Resistance Tools desktop UI. xssnick already shipped that;
  we are a CLI for builders.
- Telegram Mini App distribution. Adjacent but a different product surface.
