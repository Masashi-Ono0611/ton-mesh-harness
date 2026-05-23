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

The daemon now survives the CLI exiting and (launchd/systemd permitting)
machine reboots — true set-and-forget self-hosting without a public IP
caveat beyond what the daemon itself needs.

### Managing services

```bash
ton-sovereign-deploy service list            # installed seeds + running state
ton-sovereign-deploy service stop <bag_id>   # stop + remove the unit (keep the db)
ton-sovereign-deploy service stop <bag_id> --purge   # also remove the seed db
```

## MCP

`sovereign_deploy` accepts `daemon_mode: "service"` (the OS owns the
lifecycle, so the server never orphans a daemon). It still **rejects**
`daemon_mode: "detached"` / `keep_alive: true` — the MCP server can't own a
long-lived daemon itself. `embedded` is the safe one-shot default.

## Constraints

- `service` requires `--no-watch` (the watch loop needs a CLI-owned daemon).
- `service` is incompatible with `--site-auto` (the rldp-http-proxy stays
  CLI-owned and would die on exit) — run them separately for now.
- User-scope only (no root / system-wide install).
- Each bag gets its own unit; re-deploying the same bag replaces it.
