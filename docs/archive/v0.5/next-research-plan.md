# Next research plan — TON Storage market & infrastructure

**Goal:** decide product direction (A self-host / B SaaS provider / C `sites`
record support / D IPFS bridge) backed by data instead of vibes.

## Triggers for this plan

The Round 1–7 post-mortem (`round-postmortem.md`) showed that
the storage-provider economy is empty on mainnet — every "cheapest" provider
in TONAPI is dormant, and even `foundation.ton` self-hosts. Before
committing to a v0.6 product story, we need ground truth on:

- How many TON Storage providers are *actually* live (not just listed)?
- What hosting model do real `.ton` sites use today (`storage` vs `sites`)?
- Where is the official roadmap going — is provider liveness expected to
  improve, or is the storage-bag model effectively deprecated in favour of
  `sites` (ADNL Address) records?
- Could we bridge to IPFS pinning while keeping `.ton` DNS as the user-
  facing handle?

## Six research lines (none implemented yet)

### 1. Provider-wide liveness audit

For all 85 providers TONAPI lists with `accept_new_contracts=true`,
fetch the last 50 txs and count:

- providers that have ever sent `accept_storage_contract` (op 0x7a361688)
- providers that have sent `proof_storage` (op 0x419d5d4d) in the last 90 days
- providers whose last tx is < 30 days old (i.e. anything has happened)

Expect: < 10% of registered providers are actually live. If we find one
that *is* live, it changes the story.

### 2. Real-world `.ton` site corpus

Pick 30–50 known `.ton` sites (from TON DNS marketplace listings, social
media, dApp directories) and resolve each:

- has `storage` record? `sites` record? `wallet` only? mixed?
- if `storage`, is the bag actually retrievable from any provider via TONAPI?
- if `sites`, what ADNL Address resolves to (self-hosted node? cloud node?)?

Output: a histogram of hosting models in actual use. Likely heavily skewed
towards `sites` and self-hosted ADNL.

### 3. TON Foundation's own docs vs reality

Read in order:
- ton.org/docs/develop/dapps/tutorials/storage-provider
- ton.org/docs/develop/dns
- TEP-0081 (TON DNS standard) — the `storage` record spec

Map each documented promise ("provider will host", "DNS resolution gives bag
id", "TON Proxy fetches and serves") against what we observed on mainnet.
The DEXTools 2026 article we already have is a starting datum; cross-check
against primary sources.

### 4. `sites` record path

The biggest gap in our knowledge: how does a `sites` record actually serve
content?

- read TEP-0081 sections on `sites`
- find an example: `tonnet-sync-check.ton` has `sites: []` (empty list — odd);
  pick a working one and trace the resolve → ADNL fetch → render flow
- could our CLI write `sites` records too (point at an ADNL Address served by
  our own daemon)? What identity would the daemon need to advertise?

This is the most likely "real fit for what people use today" lane.

### 5. Bridge to IPFS pinning

- can a `.ton` DNS record point to an IPFS gateway URL via the `site`
  (DNS-Adnl) record format, or only via `wallet`?
- if not directly, can a TON Proxy be configured to fetch from
  `ipfs://CID` for a given bag?
- compare cost: Pinata pinning (~$0.10/GB-month) vs imaginary working TON
  storage provider (~3.65 TON/GB/year ≈ same order of magnitude at current
  prices, far cheaper than Pinata at current TON prices)

Output: a concrete "TON DNS + IPFS pinning" hybrid stack diagram if it
works.

### 6. Community temperature

Sources to scan for "is TON Storage actually used":
- t.me/storage_telegram (TON Storage discussion channel, if exists)
- github.com/ton-blockchain/ton issues with `storage` label
- recent Twitter/X mentions of `.ton` sites + storage providers
- ton.dev or TON Society announcements about storage / provider economy

Output: a sentiment summary — is anyone trying to build the missing piece
(provider liveness oracle, multi-provider redundancy)?

## Order

Lines 1, 2, and 4 are on-chain only and can be batched in a single
research session. Line 3 needs careful reading. Line 5 may produce the
biggest product pivot. Line 6 is lightweight.

Suggested first session: 1 + 2 + 4 (on-chain heavy, mechanical) — produces
the data we need to argue A/B/C/D from evidence.

## Product decision criteria (drafted, may revise)

- **A (self-host first)**: free, ships in v0.6 docs+README rewrite alone, no
  protocol risk. **Always do this regardless of A/B/C/D below.**
- **B (run our own provider as SaaS)**: requires us to operate VPS + monitor
  + a payment loop. Not done lightly.
- **C (`sites` record support)**: most aligned with what works today; needs
  daemon ADNL identity and `sites` record write path.
- **D (IPFS bridge)**: drops TON purity; useful as a fallback.

If line 1 finds zero live providers in the entire registry, B becomes the
only way to honour our existing pitch. If line 4 shows `sites` records
trivially write-able, C is the cleanest way out.

## Out-of-scope (for now)

- Filecoin / Arweave / Storj integration — too far.
- Building a "provider liveness oracle" we host ourselves — depends on
  finding ≥ 1 live provider first.
- Telegram Mini App distribution channel (orthogonal).
