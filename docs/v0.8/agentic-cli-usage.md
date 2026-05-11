# Agentic CLI usage (v0.8 rc5+)

The `--wallet-mode agentic` flag lets you drive a full `.ton` deploy
from a terminal without a phone wallet / QR code. Signing happens
locally, reading a private key from `~/.config/ton/config.json` (the
file `@ton/mcp@alpha` writes when it sets up a wallet).

Use case: **unattended deployments** — CI/CD pipelines, scheduled
re-deploys, agent workflows. The TonConnect path (default) is still
the right choice when a human is sitting at the terminal — agentic
mode trades the security of human-in-the-loop for the convenience of
automation.

---

## Prerequisite: a wallet in `~/.config/ton/config.json`

The kit reads the wallet from the same on-disk format `@ton/mcp@alpha`
manages. To set up a wallet:

```bash
# Import an existing wallet (recommended — re-uses your funded address)
npx -y @ton/mcp@alpha agentic_import_wallet
# Follow the prompts to paste your mnemonic / private key.
```

Verify the kit can see it:

```bash
npx -y ton-sovereign-deploy doctor
# Look for `agentic` in the `wallet_signers_available` line.
```

> **Two wallet types supported.** The kit reads both wallet kinds
> that `@ton/mcp` stores: `type: "standard"` (mnemonic OR private_key
> direct sign — no extra install) by default. The NFT-delegated
> `type: "agentic"` flow —
> where an operator key signs on behalf of an owner via the
> agentic collection contract — is supported in rc6+ via the
> optional `@ton/mcp` peer dependency:
>
> ```bash
> npm install @ton/mcp@alpha
> ```
>
> The SDK lazy-loads `@ton/mcp` only when you select a
> `type: "agentic"` entry, so TonConnect-only users don't pay
> the ~19 MB install cost.

---

## Single deploy

```bash
npx -y ton-sovereign-deploy ./dist \
  --domain myprotocol.ton \
  --wallet-mode agentic \
  --no-watch
```

This:
1. Uploads `./dist` to TON Storage (same as TonConnect path).
2. Signs the `change_dns_record` op locally with the active wallet
   in `~/.config/ton/config.json`.
3. Broadcasts via Toncenter v3.
4. Polls TONAPI until the record is on-chain.
5. Prints the real on-chain tx hash + tonviewer link.

No QR. No phone. The whole flow is non-interactive.

---

## Selecting a wallet (when you have more than one)

```bash
# By exact name
ton-sovereign-deploy ./dist --domain myprotocol.ton \
  --wallet-mode agentic --wallet-label "main-mainnet"

# By id (the UUID @ton/mcp generates)
ton-sovereign-deploy ./dist --domain myprotocol.ton \
  --wallet-mode agentic --wallet-label "w_a1b2c3d4..."

# By address
ton-sovereign-deploy ./dist --domain myprotocol.ton \
  --wallet-mode agentic --wallet-label "UQAa...xyz"
```

Default selector is `active_wallet_id` from the config (whatever
wallet you last `set_active_wallet`'d via `@ton/mcp`).

---

## Override the config path (CI / containers)

```bash
ton-sovereign-deploy ./dist --domain myprotocol.ton \
  --wallet-mode agentic \
  --wallet-config /var/secrets/ton-config.json
```

Or via environment:

```bash
TON_CONFIG_PATH=/var/secrets/ton-config.json \
  ton-sovereign-deploy ./dist --domain myprotocol.ton --wallet-mode agentic
```

Useful when the config sits at a non-standard location (e.g. mounted
as a secret in a container).

---

## CI/CD example (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to .ton
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node 20
        uses: actions/setup-node@v4
        with: { node-version: 20 }

      - name: Build site
        run: npm ci && npm run build

      - name: Write agentic wallet config from secret
        env:
          TON_CONFIG: ${{ secrets.TON_AGENTIC_CONFIG }}
        run: |
          mkdir -p ~/.config/ton
          # GitHub secrets are plaintext; @ton/mcp's encryption is
          # bundled in the config blob itself, so this preserves it.
          printf '%s' "$TON_CONFIG" > ~/.config/ton/config.json
          chmod 600 ~/.config/ton/config.json

      - name: Deploy to .ton
        run: |
          npx -y ton-sovereign-deploy ./dist \
            --domain "${{ vars.TON_DOMAIN }}" \
            --wallet-mode agentic \
            --no-watch \
            --json-output \
            > deploy.json
          jq . deploy.json
```

`TON_AGENTIC_CONFIG` is the raw contents of your local
`~/.config/ton/config.json`. The protected-file format (`\x8aTM\x01` +
AES-256-GCM with a key embedded in the blob) is preserved as-is.

> **Security note.** `@ton/mcp`'s protected-file format is *not*
> passphrase-protected — the AES key is stored alongside the
> ciphertext. The on-disk file is obfuscated against casual
> `cat config.json`, but anyone with read access can decrypt it.
> Treat it like a plaintext private key (mode 0600, never check into
> git, store in a secret manager). The encryption only protects
> against the "I forgot I left this in Downloads" failure mode.

---

## Validation gates (CLI-side)

The CLI rejects invalid combinations before doing any work:

| Flag combination | Error |
|---|---|
| `--wallet-mode bogus` | `--wallet-mode must be 'tonconnect' or 'agentic'` |
| `--wallet-label foo` without `--wallet-mode agentic` | `--wallet-label requires --wallet-mode=agentic` |
| `--wallet-config /path` without `--wallet-mode agentic` | `--wallet-config requires --wallet-mode=agentic` |
| `--wallet-mode agentic` without `--domain` | `--wallet-mode=agentic only affects DNS write. Pass --domain ... or drop --wallet-mode=agentic for a bag-only deploy` |
| `--wallet-mode agentic` with `--daemon-backend=ton-core` | `--wallet-mode=agentic requires --daemon-backend=tonutils (default)` |

---

## Error codes you might see (F5 from the SDK)

Surfaced via the CLI on stderr / non-zero exit:

- `ERR_NO_WALLET` — `~/.config/ton/config.json` is missing, has no
  wallet for the chosen network, or the selector doesn't match
  anything. Can also fire when a `type: "agentic"` entry is selected
  but the `@ton/mcp` optional peer is not installed (fix:
  `npm install @ton/mcp@alpha`). Otherwise: run
  `@ton/mcp@alpha agentic_import_wallet` or check `--wallet-label`.
- `ERR_INVALID_INPUT` — schema mismatch (e.g. `version != 2`), corrupt
  protected-file blob, or the selected agentic wallet is missing
  `operator_private_key`. Fix: re-import the wallet via
  `@ton/mcp@alpha agentic_import_wallet` or rotate the operator key.
- `ERR_NO_DOMAIN` — TONAPI returned 404 for the domain, OR the domain
  is not owned by the wallet that's signing. Fix: verify ownership
  via TONAPI (`https://tonapi.io/v2/dns/<domain>`) and that you're on
  the same network the wallet is on.
- `ERR_DNS_TX_TIMEOUT` — broadcast accepted but TONAPI didn't see the
  record within 5 minutes. Usually means the chain is still settling
  OR TONAPI is lagging. The transaction message hash IS in the error
  payload; check tonviewer manually.

---

## Comparison with TonConnect mode

| Aspect | `--wallet-mode tonconnect` (default) | `--wallet-mode agentic` |
|---|---|---|
| Human approval | Yes — QR code, phone wallet | No — local sign |
| Sign latency | Seconds to minutes (human-bound) | Milliseconds |
| Suitable for CI | No (needs human) | Yes |
| Suitable for desktop | Yes | Optional |
| Security model | Hardware wallet possible | Key on disk |
| Key custody | User's phone | `~/.config/ton/config.json` |

Pick the mode that matches your deploy frequency × risk tolerance.
For "deploy on every git push" workflows agentic is the only
practical choice; for "deploy major versions only" TonConnect with a
hardware-backed wallet is safer.
