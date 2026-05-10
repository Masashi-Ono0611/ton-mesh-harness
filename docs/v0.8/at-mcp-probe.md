# P-1 — `@ton/mcp` compose contract probe

**Date:** 2026-05-10
**Issue:** #23
**Time spent:** ~1h (probe scope was ~4h budget — verdict reached early)
**Verdict:** **B (with nuance)** — the original compose handoff assumption is wrong, but a workable composition exists at the *config-file* level rather than the *MCP-RPC* level.

## TL;DR

The concept-update doc (`docs/v0.8/concept-update-2026-05-10.md` Recommended Approach #2) assumed:

> Agent calls `@ton/mcp::wallet_connect` → wallet session is established and persisted to `~/.tonconnect/<session>.json`. `ton-sovereign-mcp` reads the same TonConnect cache.

**This handoff does not exist.** `@ton/mcp` has no `wallet_connect` tool, no TonConnect (human-sign) flow, and does not persist a TonConnect session. It is **agentic-wallet first**: autonomous signing keys persisted at `~/.config/ton/config.json` (or `TON_CONFIG_PATH`).

The viable compose model is at the **config-file** level: `ton-sovereign-mcp` reads `~/.config/ton/config.json` directly to get the agent's signing key, then signs the BOC the kit already builds. There is no inter-MCP RPC. `@ton/mcp` is a *peer* MCP server an agent loads alongside `ton-sovereign-mcp`; the shared resource is the on-disk config file, not a session.

For human-signed flows (the v0.6/v0.7 default), TonConnect remains entirely inside `ton-sovereign-mcp` — `@ton/mcp` is irrelevant.

## Evidence

### `@ton/mcp@0.1.15-alpha.15` (latest alpha as of 2026-05-10)

- **npm:** `@ton/mcp@alpha` (`npm view @ton/mcp@alpha`)
- **Repo:** https://github.com/ton-connect/kit/tree/main/packages/mcp
- **Bin:** `mcp` (callable as `npx -y @ton/mcp@alpha`)
- **Deps that affect us:** `@modelcontextprotocol/sdk: ^1.29.0`, `zod: ^3.25.76`, `@ton/walletkit: 0.0.12-alpha.3`
- **Modes:**
  - **Agentic Wallets mode (default)** — keys persisted at `~/.config/ton/config.json` (or `TON_CONFIG_PATH`)
  - **Single-wallet mode** — ephemeral in-memory wallet from environment variables
- **Tools exposed:** `get_wallet`, `get_balance`, `get_jetton_balance`, `get_jettons`, `send_ton`, `send_jetton`, `send_nft`, `get_swap_quote`, `get_nfts`, `resolve_dns`, `list_wallets`, `set_active_wallet`, `agentic_import_wallet`, `agentic_rotate_operator_key`, `agentic_start_root_wallet_setup`, `generate_ton_proof`
- **No `wallet_connect`, no TonConnect-flow tool.**
- **Transaction handling:** `send_*` tools sign and broadcast internally, returning `normalizedHash`; agents poll `get_transaction_status`. There is **no `send_raw_message` / `sign_external_message`** tool — `@ton/mcp` does not accept arbitrary BOCs from other servers.
- **`generate_ton_proof`** exists but is for TonProof authentication payloads, not for signing transactions.

### What this rules out

1. **Original compose-RPC handoff (Recommended Approach #2 sequence in concept-update doc).** `@ton/mcp` cannot sign a BOC built by `ton-sovereign-mcp` because no tool accepts external BOCs. The "agent calls `@ton/mcp::wallet_connect`" step does not exist.
2. **Delegating signing to `@ton/mcp` via its tools.** `send_ton` / `send_jetton` / `send_nft` are typed wrappers; the DNS storage/site record write is a generic contract message, not a transfer. There is no path through `@ton/mcp`'s typed tools that produces our DNS write.
3. **Reading a TonConnect session that `@ton/mcp` writes.** `@ton/mcp` doesn't write one — it manages agentic-wallet keys, not TonConnect sessions.

## Revised compose model

Two orthogonal signing paths in `ton-sovereign-mcp`, selected via the `wallet` input field:

```
Path 1 — Human-signed (default, v0.6/v0.7 carryover)
─────────────────────────────────────────────────────
Agent / human invokes ton-sovereign-mcp::sovereign_deploy({wallet: "Tonkeeper"}).
ton-sovereign-mcp uses its own TonConnect connector. QR / deep-link surfaced
to the human. Human approves on phone wallet. DNS tx broadcast.
@ton/mcp is not involved at all.

Path 2 — Agentic-signed (new in v0.8.0)
───────────────────────────────────────
Agent invokes ton-sovereign-mcp::sovereign_deploy({wallet: "agentic"}).
ton-sovereign-mcp reads ~/.config/ton/config.json (or TON_CONFIG_PATH) directly
— the same file @ton/mcp manages. Extracts the active agentic wallet's
private key (or reuses @ton/walletkit's loader). Signs the storage / site
DNS write BOC internally. Broadcasts via existing tonutils path.
@ton/mcp is a "peer" MCP server (the agent may also load it for unrelated
balance/swap/NFT ops), but ton-sovereign-mcp does not call into it.
```

The "compose" framing survives — both servers share the **agentic wallet config file** — but the integration is at the filesystem level, not the MCP-RPC level. There is no `@ton/mcp` runtime dep in `ton-sovereign-mcp`'s `package.json`.

## Design impact on existing v0.8.0 issues

### #5 (F1 — deps + bin entries)

- **Pin `@modelcontextprotocol/sdk@^1.29.0`** (was `^1.0.0`): match `@ton/mcp`'s pin to avoid SDK version skew when both servers run in the same agent.
- **Pin `zod@^3.25.0`** (was `^3.23.0`): match `@ton/mcp`'s `^3.25.76`.
- **Add `@ton/walletkit` as a runtime dep** (Path 2 reads agentic-wallet config via the same loader `@ton/mcp` uses; reusing `@ton/walletkit` avoids reimplementing config schema parsing). Pin to `^0.0.12-alpha.3` initially; bump in lockstep with `@ton/mcp`.
- Do **NOT** add `@ton/mcp` as a dep — it's a peer MCP server, not a library.

### #13 (F2 — zod schemas, `wallet` field)

The `wallet` field in `DeployOptions` becomes a discriminated union, NOT a substring:

```ts
const WalletSpec = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("tonconnect"),
    connector: z.string().default("Tonkeeper"),  // substring match, was the old "wallet" field
  }),
  z.object({
    kind: z.literal("agentic"),
    config_path: z.string().optional(),  // defaults to ~/.config/ton/config.json or $TON_CONFIG_PATH
    wallet_label: z.string().optional(), // selects from list_wallets if multiple; defaults to active
  }),
]);
```

Backwards compat: top-level CLI flag `--wallet Tonkeeper` continues to mean `{kind: "tonconnect", connector: "Tonkeeper"}`. New CLI flag `--wallet-mode agentic` opt-in.

**Error codes update:**
- `ERR_NO_WALLET` reframed: emitted when `kind: "agentic"` and `~/.config/ton/config.json` is absent or has no active wallet. `fix_hint`: *"Run `npx -y @ton/mcp@alpha agentic_start_root_wallet_setup` to set up an agentic wallet, or pass `--wallet-mode tonconnect` for human-signed flow."*
- `ERR_TONCONNECT_REJECTED` (already existed as `ERR_DNS_SIGN_REJECTED` per `mcp-core-requirements.md` F5) — only emitted in Path 1.

### #15 (M1 — bootstrap MCP server)

- Tool descriptions in `tools/list` should mention **both** signing modes so agentic-wallet-aware agents find the tool. Suggested `sovereign_deploy` description:
  > *"Deploy a static site directory to TON Storage and write the .ton DNS records (storage + site/ADNL). Censorship-resistant. Supports human-signed (TonConnect) and agentic (autonomous key from @ton/mcp config) signing modes."*

### #10 (M3 — sovereign_deploy MCP tool)

- Replace the (incorrect) "read TonConnect cache file" implementation with the dual-path described above.
- Path 2 implementation: `import { loadAgenticConfig } from '@ton/walletkit'` (or whatever the actual export is — verify in week-1 implementation), select active wallet, sign.

### #17 (M5 — cancellation)

No change from the F4 realism note already appended. Cancellation semantics are the same in both Path 1 and Path 2 (in Path 2, "broadcast" is local-process so cancellation IS effective up until the broadcast moment; document this nuance).

### #24 ([D4] rc1 milestone — doc rescope)

- `agent-native-pivot.md` rewrite must replace the entire "compose with @ton/mcp" section with the dual-path framing above.
- `mcp-core-requirements.md` F2 rewrite uses the discriminated-union `WalletSpec`.
- `concept-update-2026-05-10.md` "Recommended Approach #2" section must be reworded — the on-disk-cache assumption was wrong. Add a note pointing to this memo as the verified contract.

## Open questions for week 1+ implementation

1. **Exact schema of `~/.config/ton/config.json`** — needs verification by reading `@ton/walletkit` source or running `npx -y @ton/mcp@alpha agentic_start_root_wallet_setup` and inspecting the file. ~30min follow-up at start of #5/#13 work.
2. **Selecting the "active" wallet** — does `@ton/walletkit` expose an "active wallet" concept, or is it just a list with the first entry being default? Need to match `@ton/mcp`'s `set_active_wallet` semantics.
3. **Sovereignty in Path 2** — using `@ton/walletkit` means reading another package's config format. If their schema breaks, our agentic path breaks. Acceptable for v0.8.0 (alpha-tracking-alpha); document as a v0.8.x stability TODO.
4. **CHANGELOG language** — call this "agentic-wallet support via @ton/walletkit" rather than "compose with @ton/mcp" since the integration isn't actually with `@ton/mcp` directly. Saves users from a wrong mental model.

## Verdict summary

- **Original assumption (compose via MCP-RPC handoff):** wrong.
- **Workable composition:** filesystem-level (shared `~/.config/ton/config.json` via `@ton/walletkit`).
- **Architectural impact:** moderate. `wallet` field becomes a discriminated union; `@ton/walletkit` becomes a dep; `@ton/mcp` does NOT become a dep (it's a peer MCP server the agent loads, but `ton-sovereign-mcp` doesn't talk to it).
- **Gate status:** P-1 RESOLVED. #5, #13, #15, #10, #17 may proceed using this revised contract. [D4] #24 will encode this contract into the doc rescope at week 1.
- **Concept-update doc revision needed:** yes, but as part of [D4]'s scheduled rescope rather than retro-edit.
