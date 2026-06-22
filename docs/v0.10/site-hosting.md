# Hosting a `.ton` site (v0.10)

This is the reference for serving a `.ton` domain in TON Browser end-to-end from
the kit. It consolidates the site path that earlier docs introduced piecemeal
(`--site-adnl` BYO proxy in [v0.6](../v0.6/byo-rldp-http-proxy.md), `--site-auto`
in v0.7) and the v0.10 additions that make it persistent and cloud-ready.

## The two DNS records

A `.ton` domain can carry two records the kit writes:

| Record | TL-B | Points at | Written by |
|---|---|---|---|
| `storage` (`dns_storage_address`) | `0x7473` + bag id | a TON Storage bag | every deploy with `--domain` |
| `site` (`dns_adnl_address`) | `0xad01` + ADNL + flags | an `rldp-http-proxy` identity | `--site-adnl` / `--site-auto`, or `site-record` |

Browsers resolve `<domain>.ton` through the **`site` record** → an `rldp-http-proxy`
that serves HTTP-over-RLDP. The `storage` record feeds storage gateways. A site
that opens in TON Browser needs a **live proxy** holding the `site` ADNL.

## Ways to set the `site` record

- **`--site-adnl <hex>`** — bring your own proxy (you run `rldp-http-proxy`
  elsewhere); the deploy bundles the `site` record with the `storage` write.
- **`--site-auto`** — the kit spawns + manages an `rldp-http-proxy` with a minted
  identity and writes the `site` record automatically.
- **`site-record <domain> <adnl-hex>`** — set ONLY the `site` record (no bag, no
  storage write, no daemon, no TonConnect). Prints a Tonkeeper transfer deeplink:

  ```bash
  ton-mesh-harness site-record mysite.ton <64-hex-adnl>
  ```

  The deeplink is `https://app.tonkeeper.com/transfer/<nft>?amount=<nano>&bin=<base64url(body)>`
  where `body` is a `change_dns_record` op. The holder of the domain opens it in
  Tonkeeper and approves once. `--json-output` returns `{ nft_address,
  body_boc_base64url, tonkeeper_deeplink, … }` for agents / CI. Programmatic
  equivalents: SDK `siteRecord()` and MCP `mesh_site_record`.

## Persistent identity (`--site-keyring`)

`--site-auto` persists its ADNL **seed** (32 bytes, hex, mode `0600`) and reuses
it across runs — default `~/.ton-mesh/site-keyring/<domain>.hex`,
relocatable with `--site-keyring <path>`. This matters because the on-chain
`site` record points at the ADNL: a fresh identity each run would take the site
down on restart until you re-signed. Re-running the same command keeps the same
identity. The seed **is** the ADNL private key — back it up; it is never logged.

## Running on a cloud VM

`rldp-http-proxy` binds its outbound/client socket to the `-a <publicIp>` it
announces. On a **1:1-NAT VM** (GCP / AWS) the public IP isn't assigned to any
local interface, so that bind fails and the proxy can't sync the network. Bind
it first:

```bash
sudo ip addr add <public-ip>/32 dev <iface>   # find <iface> with: ip -o link
```

`--site-auto` detects this and prints the exact command when the announced IP
isn't local (advisory only — the kit never runs the privileged command). Open
the chosen UDP port inbound, and pin it with `--site-udp-port` so a firewall
rule stays valid across restarts. On a plain **VPS** where the public IP is on
the NIC, none of this applies — it is the simpler host.

## Keeping it up: `--daemon-mode service`

`--site-auto --daemon-mode service` hands the proxy + static server to launchd
(macOS) / systemd `--user` (Linux), so the site survives CLI exit and reboots:

```bash
ton-mesh-harness ./build --domain mysite.ton --site-auto \
  --daemon-mode service --site-public-ip <public-ip> --site-udp-port 17655
```

How it works:

1. The kit derives the ADNL from the persisted seed (no CLI-owned proxy) and
   writes the `site` record with it.
2. It installs a unit that runs `ton-mesh-harness site-serve --build-dir …
   --domain … --site-keyring … [--site-public-ip …] [--site-udp-port …]`:
   - **macOS**: `~/Library/LaunchAgents/ton-mesh-site.<domain>.plist`,
     `KeepAlive` only on unsuccessful exit.
   - **Linux**: `~/.config/systemd/user/ton-mesh-site-<domain>.service`,
     `Restart=on-failure` (a reinstall `systemctl restart`s to pick up changes).
3. On every (re)start `site-serve` re-derives the **same** ADNL from the same
   seed — the `site` record stays valid.

Restart is **on failure only**: a clean `stop` stays stopped (no resurrection
loop). This is a site-keyed service, parallel to the bag-seeder service
([daemon-service-mode.md](../v0.9/daemon-service-mode.md)) — the bag can run as
its own `service`-mode seeder so both survive together.

> **Linux: enable lingering for reboot survival.** The unit is a `systemd
> --user` service, which only runs while the deploy user has a session. On a
> headless VM it will **not** start after an unattended reboot unless lingering
> is enabled once:
> ```bash
> sudo loginctl enable-linger "$USER"
> ```
> macOS launchd (`RunAtLoad`) survives reboots without this.

`site-serve` also runs standalone (foreground) to serve a site under your own
supervisor or for a quick test.

### Managing

```bash
ton-mesh-harness service list                  # bag seeders + site gateways + state
ton-mesh-harness service stop-site mysite.ton  # stop (the identity seed is kept)
ton-mesh-harness service stop-site mysite.ton --purge  # also drop the metadata dir
```

## Verifying — the browser-viewable paths

Don't infer "it works" — observe it. A `.ton` site is reachable through the
**`site` record** (`dns_adnl_address`), which a gateway resolves to your
`rldp-http-proxy` over RLDP. Two front doors:

1. `service list` shows the gateway `running`.
2. **TON Browser** — open `tonsite://<domain>`. Validated end-to-end on a free
   GCP host (`masashi-ono0611.ton`).
3. **Ordinary browser** — open `https://<domain>.ton.run`. The ton.run **site**
   gateway resolves the `site` ADNL over RLDP and serves your content once the
   record is on chain **and** your proxy is reachable (verified: a live
   `site`-record domain such as `foundation.ton.run` → `200`). Until the record
   propagates / the proxy syncs it returns `404`/`502`. A deploy that writes a
   `site` record (`--site-auto` / `--site-adnl`) prints this URL as its
   **Gateway URL** once the record is signed (never before — a rejected/failed
   sign writes no record, so it never advertises a dead link).
   - A **storage-only** deploy has no ADNL for the gateway to resolve, so
     `<domain>.ton.run` and `ton.run/<bag>` both `404` — the kit deliberately
     prints **no** gateway URL there rather than a dead link.
4. (storage health, optional) an independent node downloads the bag by id alone
   (TONAPI's 200 is **not** a reachability oracle for a raw self-hosted bag).

## Operational notes

- **Don't thrash the rldp identity.** Rapid restarts can get the ADNL
  reputation-throttled by liteservers / the DHT — sync then stalls. Change
  config and restart once.
- **FUSE3 is required** on Linux: the proxy AppImage exits 127 without
  `fusermount3` (`sudo apt-get install -y fuse3`).
- **Stopping the VM / releasing its static IP** is billable / irreversible —
  treat it as a deliberate, owner-approved step.

## Related

- [`v0.9/daemon-service-mode.md`](../v0.9/daemon-service-mode.md) — `--daemon-mode`
  for bag seeders (the parallel service this builds on).
- [`v0.6/byo-rldp-http-proxy.md`](../v0.6/byo-rldp-http-proxy.md) — the original
  bring-your-own `--site-adnl` flow.
- [`v0.8/mcp-core-requirements.md`](../v0.8/mcp-core-requirements.md) — the MCP
  tool surface (incl. `mesh_site_record`).
