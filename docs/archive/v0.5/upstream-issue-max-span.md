# Upstream issue draft — `ton-blockchain/ton`

**Status:** DRAFT — not yet posted. Awaiting decision in `lane-b-max-span-status.md`.

If posted, target: https://github.com/ton-blockchain/ton/issues/new

---

## Title

`storage-daemon-cli`: `new-contract-message --max-span` is parsed as `uint8`, capping span at 255 seconds

## Labels (suggested)

`bug`, `storage-daemon`

## Body

### Summary

In `storage-daemon-cli`, the `--max-span` argument of `new-contract-message` is parsed with `td::to_integer_safe<td::uint8>`, which silently caps the maximum span at 255 seconds. The surrounding code paths use `td::uint32`, which is the intended type. This appears to be a copy-paste error and prevents the command from being used to create realistic storage contracts (1 day = 86,400 s ≫ 255 s).

### Affected versions

Reproduced on **v2026.02-1** through **v2026.04-1** (latest at time of writing). The bug has been present for at least three releases without modification.

### Reproduction

```
storage-daemon-cli> new-contract-message <bag-id> /tmp/out.boc --rate <rate> --max-span 86400
Invalid max span: Number is too large
```

`--max-span 256` already fails. `--max-span 200` works. Real production storage contracts typically need spans of one day or longer.

### Root cause

`storage/storage-daemon/storage-daemon-cli.cpp`, line 681 (v2026.04-1):

```cpp
if (tokens[i] == "--max-span") {
  ++i;
  TRY_RESULT_PREFIX_ASSIGN(max_span, td::to_integer_safe<td::uint8>(tokens[i]), "Invalid max span: ");
  continue;
}
```

The same file uses `td::uint32` everywhere else for `max_span`:

- line 202 — struct field `td::optional<td::uint32> max_span`
- line 660 — local variable `td::optional<td::uint32> max_span`
- line 763 — `set-provider-params` parses `--max-span` with `td::to_integer_safe<td::uint32>`
- line 1422 — function signature uses `td::optional<td::uint32>`

So line 681 is the only `uint8` site, and it's the user-facing argument parser that turns the daemon into a no-op for realistic spans.

### Suggested fix

```diff
-          TRY_RESULT_PREFIX_ASSIGN(max_span, td::to_integer_safe<td::uint8>(tokens[i]), "Invalid max span: ");
+          TRY_RESULT_PREFIX_ASSIGN(max_span, td::to_integer_safe<td::uint32>(tokens[i]), "Invalid max span: ");
```

One-line change, type-consistent with surrounding code. I'd be glad to send a PR if useful.

### Why this matters

Tools that automate provider contract creation through `storage-daemon-cli` (e.g. CI/CD deployment kits, dashboards, hosting marketplaces) currently cannot pass realistic `max-span` values. Workarounds — pinning `max-span` to 200 — produce contracts that expire in three minutes, which defeats the point of the provider system.

### Context

Discovered while building `ton-sovereign-deploy`, a one-command deploy tool that wires storage upload, `.ton` DNS, and provider contracts together. Repo: https://github.com/Masashi-Ono0611/sovereign-deploy-kit

Happy to provide more context, logs, or a PR.

---

## Optional follow-up PR

If the issue is welcomed, send a single-commit PR with title:

> fix(storage-daemon-cli): parse `--max-span` as uint32 for new-contract-message

containing only the line-681 type change. No tests exist for this CLI parser path, so the PR will be diff-only.
