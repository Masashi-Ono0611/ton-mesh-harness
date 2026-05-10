# Lane B · `--max-span` uint8 bug — current status

**Date:** 2026-05-10
**Owner:** masashi.ono
**Tracks:** v0.4 known issue → v0.5 hardening (Lane B)

---

## TL;DR

The bug is **still present in the latest TON release (v2026.04-1, 2026-04-28)**. It is a single-line type mismatch in
`storage/storage-daemon/storage-daemon-cli.cpp` and we can either:

1. File an upstream issue (or PR) and keep our 200s pin until merged + released, or
2. Send a one-line PR ourselves to unblock our own roadmap (preferred).

We have **no path to remove the 200s pin** without an upstream fix.

---

## Evidence

### Our code

`src/provider.ts:116`:

```ts
const MAX_SPAN_SECONDS = 200  // uint8-safe cap (daemon bug: accepts 0-255 only)
```

We pass `--max-span 200` to `new-contract-message`. Anything ≥ 256 is rejected by the daemon CLI parser.

### Pinned daemon (v2026.02-1)

Downloaded by `src/daemon/installer.ts` from
`https://github.com/ton-blockchain/ton/releases/download/v2026.02-1/...`.

### Upstream source — both pinned and latest

`storage/storage-daemon/storage-daemon-cli.cpp`, three independent occurrences of `max_span`:

| Line | Context                       | Parse type                    |
|------|-------------------------------|-------------------------------|
| 202  | struct field declaration      | `td::optional<td::uint32>`    |
| 660  | local var in `new-contract-…` | `td::optional<td::uint32>`    |
| **681** | **parse `--max-span` arg for `new-contract-message`** | **`td::to_integer_safe<td::uint8>`** ← bug |
| 763  | parse `--max-span` for `set-provider-params` | `td::to_integer_safe<td::uint32>` |
| 1422 | function signature            | `td::optional<td::uint32>`    |
| 1450 | output                        | uses `obj->max_span_` (uint32) |

The type is uint32 everywhere except the one `to_integer_safe<td::uint8>` call on line 681.
**This is a copy-paste error**, not an intentional limit.

### Diff between pinned and latest

```bash
diff <(grep 'max-span\|max_span' v2026.02-1/storage-daemon-cli.cpp) \
     <(grep 'max-span\|max_span' v2026.04-1/storage-daemon-cli.cpp)
# (empty — no changes)
```

Three releases passed since the pin (v2026.03, v2026.04, v2026.04-1). None touched this code path. None of the release notes mention storage-daemon CLI fixes.

### Existing issues searched

- `repo:ton-blockchain/ton max-span in:title,body` → 2 hits, both unrelated (#787 is about contract address determinism, #587 is generic).
- `repo:ton-blockchain/ton new-contract-message in:title,body` → only Tolk/FunC noise.
- `repo:ton-blockchain/ton storage-daemon-cli in:title` → 2 closed PRs, neither relevant.

**No tracking issue exists upstream.**

---

## Options

### Option A — File issue only

- Effort: 30 min
- Outcome: bug becomes visible to TON core team. No timeline guarantee.
- Our pin: stays at 200s indefinitely.

### Option B — File issue + send 1-line PR ourselves

- Effort: 2–3 h (fork, build, smoke-test, PR description)
- Diff: change `td::uint8` → `td::uint32` on line 681
- Outcome: probable merge within a release cycle (one of the maintainers' easiest reviews of the year)
- Our pin: removable as soon as the next daemon release is tagged

### Option C — Vendor a patched daemon binary ourselves

- Effort: 4–6 h (cross-compile for darwin / linux / win)
- Outcome: we don't wait for upstream; we ship our own daemon
- Cost: now we maintain our own TON build pipeline forever
- **Not recommended** — supply-chain liability and trust hit on a censorship-resistance tool

### Option D — Build the contract BOC ourselves in TypeScript ⭐ chosen 2026-05-10

- Effort: 1–2 days
- The on-chain provider contract accepts `uint32` for `max_span`; only the CLI parser is buggy.
- We bypass `new-contract-message` entirely, build the offer-contract BOC with `@ton/ton`'s `beginCell`, and emit it through the existing TON Connect deeplink path.
- **No upstream dependency. No external repo touched. No issue or PR posted.**
- Detailed plan in `lane-b-self-generated-boc.md`.

### Decision (2026-05-10)

**Going with Option D.** Per user direction: "find the place where we can do what we want, instead of pushing on someone else's repo." Options A/B/C left as historical context only.

---

## What `--max-span` ≥ 256 buys us

`max-span` is the contract span (seconds) — how often the storage provider must produce a Merkle proof to keep the contract active. Real values:

- 200s ≈ 3 min (current pin) — useless for production hosting
- 86,400 = 1 day — sane minimum for production
- 2,592,000 = 30 days — typical hosting tier
- 31,536,000 = 1 year — long-term hosting

A `uint32` covers ~136 years, which is more than enough.

Until this is unpinned, the v0.4 `--provider` flag **cannot deliver real 24/7 hosting** in any sense the user would recognize — the contract expires within minutes.

---

## Next actions (in order)

1. ✅ Confirm bug is still present (this doc).
2. ⬜ **User decision needed** — file upstream issue + PR? (creating a public PR is a "visible to others" action.)
3. ⬜ Once decided, draft is in `docs/v0.5/upstream-issue-max-span.md`.
4. ⬜ Once merged + released upstream, bump `TON_RELEASE_TAG` in `installer.ts` and remove `MAX_SPAN_SECONDS = 200` cap in `provider.ts`.
5. ⬜ Add `--span <seconds>` CLI flag to expose duration to users.
6. ⬜ Recompute `amountNano` on real spans (currently dominated by the 0.3 TON buffer).

---

## Definition of done for this lane

- [ ] Upstream PR merged
- [ ] Daemon release containing the fix tagged
- [ ] `installer.ts` pin bumped
- [ ] `MAX_SPAN_SECONDS` constant removed
- [ ] `--span` CLI flag wired through to `new-contract-message`
- [ ] `provider-contract.md` updated, the "uint8 bug" section deleted
- [ ] Smoke test: sign a contract with `--span 86400` and observe a 1-day contract on-chain
