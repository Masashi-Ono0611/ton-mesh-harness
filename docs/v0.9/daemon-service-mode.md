# Daemon ownership modes (#37)

A deploy spawns a `tonutils-storage` daemon to seed the bag. Who owns that
daemon after the deploy returns is controlled by `--daemon-mode` (CLI) /
`daemon_mode` (SDK / MCP):

| Mode | Daemon after return | Who owns it | Use |
|---|---|---|---|
| `embedded` | killed before return | — | one-shot upload; check status later |
| `detached` (CLI default) | kept alive | the CLI process / `--watch` loop | interactive self-host while the CLI runs |
| `service` | handed to launchd / systemd | the **OS service manager** | persistent self-host that survives CLI exit + reboots |

> Legacy `keep_alive: true` is normalized to `detached`.

## `service` mode

```bash
ton-sovereign-deploy ./build --domain my.ton --daemon-mode service --no-watch
```

What happens:
1. The bag is created in a **persistent** db under
   `~/.ton-sovereign/seeds/<bag_id>/db/`.
2. The embedded deploy-time daemon is stopped (its db is kept).
3. An OS unit is installed + loaded to keep seeding from that db:
   - **macOS**: `~/Library/LaunchAgents/ton-sovereign.<bag_id>.plist`
     (`launchctl bootstrap gui/<uid>`), `KeepAlive` true.
   - **Linux**: `~/.config/systemd/user/ton-sovereign-<bag_id>.service`
     (`systemctl --user enable --now`), `Restart=on-failure`.
   - **Windows**: not yet supported (deploy fails fast with a clear error).
4. The CLI/MCP returns; `DeployResult.daemon_service` carries the unit label.

The daemon now survives the CLI exiting and machine reboots — set-and-forget
self-hosting.

> **Linux reboot survival needs lingering.** A `systemd --user` unit only runs
> while the user has a session, so it will not restart after an unattended
> reboot unless lingering is enabled once: `sudo loginctl enable-linger "$USER"`.
> macOS launchd (`RunAtLoad`) survives reboots without this. Applies to both bag
> seeders and site gateways.

### Managing services

```bash
ton-sovereign-deploy service list            # installed seeds + site gateways + running state
ton-sovereign-deploy service stop <bag_id>   # stop + remove a bag-seeder unit (keep the db)
ton-sovereign-deploy service stop <bag_id> --purge   # also remove the seed db
ton-sovereign-deploy service stop-site <domain>      # stop + remove a site-gateway unit
```

### Site gateways (`--site-auto --daemon-mode service`)

`service` mode also hosts a `.ton` **site gateway** (the `rldp-http-proxy` +
static server from `--site-auto`), keyed by domain rather than bag id and
installed as a parallel unit (`ton-sovereign-site.<domain>` /
`ton-sovereign-site-<domain>.service`, namespace `~/.ton-sovereign/sites/<domain>/`).
It re-derives the same ADNL from the persisted seed on every restart, and
restarts **on failure only** so a clean stop stays stopped. Manage it with
`service stop-site <domain>`. See
[`v0.10/site-hosting.md`](../v0.10/site-hosting.md) for the full flow.

## MCP

`sovereign_deploy` accepts `daemon_mode: "service"` (the OS owns the
lifecycle, so the server never orphans a daemon). It still **rejects**
`daemon_mode: "detached"` / `keep_alive: true` — the MCP server can't own a
long-lived daemon itself. `embedded` is the safe one-shot default.

## Constraints

- `service` requires `--no-watch` (the watch loop needs a CLI-owned daemon).
- User-scope only (no root / system-wide install).
- Each bag gets its own unit; re-deploying the same bag replaces it. Likewise
  each site gateway gets its own per-domain unit (a reinstall restarts it).
