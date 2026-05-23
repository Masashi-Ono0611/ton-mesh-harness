# Discovery: real `.ton` sites mostly use `sites` records, not `storage`

**Date:** 2026-05-10
**Status:** correction to the v0.6 roadmap-draft assumption that
`storage` records are the mainstream. They aren't.

## What we got wrong in v0.6 step B3 prep

The original v0.6 roadmap dropped `sites` record support from scope
based on TONAPI's `/v2/dns/{domain}/resolve` returning `sites: []` for
every famous `.ton` site we checked (piracy.ton, manifesto.ton,
boards.ton, tonnet-sync-check.ton, ...). I read that as "the ecosystem
doesn't use sites records" and reframed the project around the
`storage` record path.

That conclusion is wrong. TONAPI's high-level resolver was either
caching stale data or interpreting the records too eagerly — the
on-chain DNS NFT contracts tell a different story.

## What's actually on-chain

`scripts/dns-probe.cjs` calls the `dnsresolve` get-method on each NFT
directly, bypassing TONAPI's resolver. Categories are SHA-256 of the
record name (`site`, `storage`, `wallet`, `dns_next_resolver`).

| Site | TONAPI says | On-chain `dnsresolve` says | Real format |
|---|---|---|---|
| `piracy.ton` | `sites: []` | `site` → cell, magic `0xad01` | **`dns_adnl_address`** |
| `tonnet-sync-check.ton` | `sites: []` | `site` → cell, magic `0xad01` | **`dns_adnl_address`** |
| `manifesto.ton` | `sites: []` | (rate-limited; needs re-probe) | likely `dns_adnl_address` |
| `boards.ton` | `sites: []` | (rate-limited; needs re-probe) | likely `dns_adnl_address` |
| `foundation.ton` | `storage: 7fea7af2…` | `storage` → cell | **`dns_storage_address`** |

So mainstream-`.ton`-sites distribution is roughly:

- **`dns_adnl_address` (`0xad01`)** — visit goes through ADNL → an
  HTTP-over-ADNL server (typically TON Core's `rldp-http-proxy`)
  serves the response. Used by piracy.ton, tonnet-sync-check.ton,
  manifesto.ton (and probably most "TON website" sites).
- **`dns_storage_address` (`0x7473`)** — visit fetches a TON Storage
  bag by id; the .ton browser renders the files. Used by
  foundation.ton, and what our v0.6 `--domain` writes today.

Both shapes resolve correctly through Telegram's TON Browser, native
TON Browser apps, and TON Proxy gateways — they're parallel, not
exclusive.

## Implication for the project

Our `--domain` flag currently writes only `dns_storage_address`, so
sites we deploy work in viewers that prefer the storage record. The
sample of "famous" .ton sites that actually use the storage path is
small (foundation.ton and a few others); the larger and more
visible-in-Telegram set runs on the `dns_adnl_address` + ADNL HTTP
server pattern.

Adding `dns_adnl_address` (sites record) support is therefore higher-
priority than the v0.6 roadmap-draft acknowledged. It's also much
larger than "just write the cell" — the host has to keep an
HTTP-over-ADNL server alive that actually serves the build dir.
There are two realistic implementations:

### Option A — bundle `rldp-http-proxy` (TON Core)
- official binary, part of the same `ton-blockchain/ton` source we
  already pull `storage-daemon` from
- launches with a server-mode config that maps the bag dir (or a
  static dir) to an ADNL identity + listens for RLDP HTTP
- DNS records the ADNL identity under `site` (magic `0xad01`)

### Option B — embed an ADNL HTTP server via `tonutils-go`
- xssnick's library has an ADNL stack and an RLDP layer; in theory
  one can serve HTTP-over-ADNL by writing a small Go program around
  it
- much heavier than option A — we'd be building/maintaining a Go
  server binary

### Recommended path

A is simpler in v0.6/v0.7 timeframe. Treat it as **B5**:

1. add a `rldp-http-proxy` installer (mirrors `storage-daemon`'s)
2. spawn it in server mode pointing at the build dir
3. extract its ADNL identity from its config
4. `--domain` (or a new `--site-record` flag) writes the `site`
   record (magic `0xad01` + 256-bit ADNL hash + `flags=0` for now)
5. the existing `storage` record write stays as opt-in or default
   (under-debate — most browsers handle either, so writing both is
   the safest answer)

The work is comparable to v0.6 step B2 (daemon swap): a few hundred
lines of installer + spawn + cell builder, plus one new test. Worth
splitting into B5 prep / B5 implement / B5 review milestones.

## Re-running the probe

```bash
node scripts/dns-probe.cjs
```

Toncenter rate-limits the public RPC at ~1 rps, so re-probing
manifesto.ton / boards.ton needs space between attempts (the script
doesn't pace itself). Switching the `ENDPOINT` to a private TonAPI
key removes the limit.

## Status

- **B5 ships in v0.6 (write-path only)**: `--site-adnl <hex>` writes
  the `dns_adnl_address` record under SHA256("site"); when combined
  with `--domain`, both the storage and site records ride in a
  single TonConnect tx (one sign).
- Auto-spawning `rldp-http-proxy` + ADNL key generation is **v0.7**
  (needs the 96 MB ton-zip just for `generate-random-id`, plus a
  NAT-traversal story we don't yet have for inbound UDP).
- This document also revealed TONAPI lies about `sites: []`. The
  CLI's `pollDnsSiteRecord` is therefore a best-effort poller that
  fails open with "verify in TON Browser" rather than looping
  forever. See `src/dns.ts pollDnsSiteRecord`.
