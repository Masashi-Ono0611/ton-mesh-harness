# Security Policy

`ton-sovereign-deploy` ships a CLI + MCP server + SDK that can sign on-chain
transactions on the user's behalf. Treat security findings here with the
same seriousness as wallet software.

## Supported versions

| Version | Security fixes |
|---|---|
| `0.8.x` | ✅ Current — security fixes land in the latest rc / GA. |
| `0.7.x` and earlier | ❌ End-of-life. Upgrade to `0.8.x`. |

## Reporting a vulnerability

**Do not file a public GitHub issue for security problems.**

Email **masashi.ono@upbond.io** with:

1. A description of the issue + impact.
2. Reproduction steps (or a PoC). For wallet-signing paths, prefer a
   testnet config; never include mainnet operator keys or mnemonics.
3. The affected version (`ton-sovereign-deploy --version`).
4. Your suggested fix, if any.

Initial acknowledgement: within 3 business days. A coordinated-disclosure
timeline is agreed on case-by-case; default is 90 days from acknowledgement
unless the issue is being actively exploited.

## Threat model — what to look for

The kit's GA tools (`sovereign_check_env`, `sovereign_deploy`,
`sovereign_status`) interact with three trust boundaries:

1. **Wallet signing key access.** The agentic path
   (`wallet.kind: "agentic"`) reads `~/.config/ton/config.json` (the
   `@ton/mcp`-managed protected file, `\x8aTM\x01` AES-256-GCM envelope).
   Issues to report: key material exposed in logs / error messages /
   `--json-output`; mode-bits / permissions weaker than expected; the
   SDK reading from outside the configured path.
2. **Transaction integrity.** DNS update transactions go through
   Toncenter v3 `sendBoc`. Issues to report: the kit signing a
   transaction the caller did not request; the kit emitting a
   `dns_tx_hash` that does not match the broadcast BOC; replay-
   attack windows in the agentic adapter.
3. **NFT-delegated agentic (optional `@ton/mcp` peer).** The
   `type: "agentic"` path delegates signing authority via an
   on-chain collection contract. Issues to report: signing on
   behalf of an `owner_address` the operator key is not authorized
   for; the SDK falling back to non-delegated signing without
   announcing it; the lazy-load path swallowing version-skew errors
   silently.

## Not in scope

- Bugs in `@ton/walletkit`, `@ton/mcp`, `@ton/ton`, Toncenter, TONAPI,
  or the TON blockchain itself. Report upstream.
- Issues that require root / local-shell access to the user's machine
  to exploit (e.g. "an attacker who can write to my home directory can
  swap `~/.config/ton/config.json`"). Those are out of the kit's
  trust boundary.
- Denial-of-service via missing rate limits on TONAPI / Toncenter —
  upstream service quotas, not a kit defect.

## What we've already done

- All SDK boundary modules carry a `NO console.* IN THIS FILE` lint
  rule — the agentic-signing and tx-hash paths can never accidentally
  print key material via `console.log`. Enforced by `eslint src/sdk`.
- `--json-output` writes structured JSON to stdout exclusively;
  signing logs land on stderr via `DEBUG=sovereign:*` (off by
  default, opt-in only).
- The MCP server uses stdio framing; no network listener.
- `dist/` is tarball-install smoke-tested in CI
  (`scripts/tarball-smoke.cjs`) so packaging regressions that could
  ship a non-published file do not slip through.
- **SHA-256 integrity check on every daemon binary download**
  (`src/daemon/installer-utils.ts::verifyDownloadedBinary`). The
  three downloaded binaries — `storage-daemon`, `tonutils-storage`,
  `rldp-http-proxy` — are verified against pinned SHA-256 hashes
  before chmod+x and before the version stamp is written.
  Mismatches delete the partial file and throw with the expected vs
  actual hash. Protects against a compromised GitHub release asset,
  a MITM'd CDN endpoint, or a typo-squatted release version.
  Hashes for each `(version, platform-arch)` pair are pinned in
  `src/daemon/tonutils-installer.ts` and
  `src/daemon/rldp-http-proxy-installer.ts` — bumped in lockstep
  with version pins.
- **TonConnect SDK debug suppression**
  (`src/wallet/TonConnectProvider.ts::withQuietTonConnect`).
  `@tonconnect/sdk` v3.4.1 calls `console.debug` with unsigned
  payloads and signed BOCs at bridge transport boundaries. The
  kit installs a reference-counted no-op for the duration of every
  TonConnect API call. Opt-in escape hatch: `TONCONNECT_DEBUG=1`.
- **TonConnect telemetry disabled**. The kit passes
  `analytics: { mode: 'off' }` to the TonConnect constructor, which
  short-circuits the SDK's AnalyticsManager before construction.
  The default `'telemetry'` mode would otherwise emit a
  transaction-signed event including `signed_boc` to
  `https://analytics.ton.org/events`.
- **Wallet keyring file integrity**
  (`src/daemon/keyring.ts::writeKeyringFile`). The Ed25519 operator
  key is written through an `O_CREAT | O_EXCL` file descriptor with
  `fchmod` to `0o600`. `lstatSync` rejects pre-existing symlinks
  (POSIX) and junctions/reparse points (Windows) on both the
  keyring directory and the final file path. Protects against an
  attacker who can place a symlink in the user's `~/.ton-sovereign`
  tree.

## Related docs

- [`docs/v0.8/agentic-cli-usage.md`](docs/v0.8/agentic-cli-usage.md) —
  agentic signing prerequisites + config file format.
- [`docs/v0.8/agent-stack-compose.md`](docs/v0.8/agent-stack-compose.md) —
  wiring `ton-sovereign-mcp` + `@ton/mcp` together, including the
  F5 error-response cookbook.
