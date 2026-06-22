# Provenance manifest (#34)

A deploy can publish a signed provenance manifest inside the bag at
`.well-known/ton-deploy.json`, so a verifier can confirm **"this `.ton`
domain was deployed by this wallet, with this kit, on this date."**

## What ships

On `mesh_deploy` (and the CLI) with a `--domain`, the kit writes the
manifest into `<source_dir>/.well-known/ton-deploy.json` **before** bag
creation, so the bag — and therefore the served site — includes it.
Best-effort: any failure is logged and skipped, never fatal. Opt out with
`--no-provenance` (CLI) or `provenance: false` (MCP/SDK).

```json
{
  "manifest_version": 1,
  "kit": "ton-mesh-harness",
  "kit_version": "0.8.0",
  "domain": "yourname.ton",
  "deployer_address": "0:…",
  "deployed_at": "2026-05-23T08:00:00.000Z",
  "signed": true,
  "public_key": "<ed25519 pubkey hex>",
  "signature": "<base64 ed25519 over the canonical claim>"
}
```

The **signed claim** is the deterministic (sorted-key, no-whitespace) JSON
of `{manifest_version, kit, kit_version, domain, deployer_address,
deployed_at}`. The signature is a detached Ed25519 signature over that
canonical string; the verifier re-canonicalizes and checks it against
`public_key`.

### Why no `bag_id` / `dns_tx_hash` in the manifest

- `bag_id` is the content hash of the bag, which **includes** this
  manifest — putting the bag_id inside would be circular.
- `dns_tx_hash` isn't known until after the bag exists and the DNS write
  lands.

The `bag_id ↔ domain` binding doesn't need to live in the manifest: it is
already attested **on-chain** by the `change_dns_record` transaction the
deployer's wallet signed (the storage record points the domain at the
bag). The manifest adds the orthogonal fact "who deployed it, and when."

### Signed vs unsigned

- **Agentic path**: we hold an Ed25519 operator/standard key, so the
  manifest is **signed** and carries `deployer_address`.
- **TonConnect path**: TonConnect can't sign arbitrary bytes, and the
  wallet address isn't known at write time (it's resolved later, during
  the DNS-connect phase). So the manifest is **unsigned**
  (`signed: false`, no `deployer_address`) — it still records the kit
  version + deploy time, but carries no cryptographic attestation.

## Verifying

```bash
# a local file, or fetch it straight from the deployed site:
ton-mesh-harness verify-provenance ./path/to/ton-deploy.json
ton-mesh-harness verify-provenance https://yourname.ton/.well-known/ton-deploy.json
```

Exit `0` = signed and valid; `1` = unsigned, tampered, or unreadable.
Programmatically, `verifyManifest(manifest)` (in `src/sdk/provenance.ts`)
returns `{ signed, valid, claim, reason? }`.

A verifier (a TON Browser plugin, an RLDP-HTTP-Proxy, a CI gate) would:
1. Fetch `https://<domain>/.well-known/ton-deploy.json` from the served bag.
2. Verify the Ed25519 signature over the canonical claim.
3. Cross-check `domain` matches the site it's viewing, and (optionally)
   that `deployer_address` matches the on-chain owner of the `.ton`
   domain — closing the loop between "who signed the manifest" and "who
   controls the domain."

## Threat model

- **Detects**: a third party re-hosting the site under a different domain
  without re-signing (the embedded `domain` won't match), and post-deploy
  tampering of the claim fields (signature breaks).
- **Does NOT prove**: that `deployer_address` is honest about its identity
  — it proves key possession, not real-world identity. Bind to the
  on-chain domain owner (step 3 above) for a stronger guarantee.
- **Unsigned manifests** (TonConnect deploys) carry no attestation —
  treat `signed: false` as "no provenance."

## Deferred to later (out of this minimal scope)

- TON-native signature schemes (ton_proof-style) — currently raw Ed25519.
- A `.well-known/ton-deploy-history.json` keeping all historical manifests
  across re-deploys.
- TonConnect-path signing (needs a wallet that can sign arbitrary data).
