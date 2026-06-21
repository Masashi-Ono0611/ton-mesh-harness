#!/usr/bin/env node
import { Command } from 'commander'
import type { CliOptions } from './types/cli'
import { runDeploy } from './cli/deploy'
import { runDeployTonutils, runWatchModeTonutils } from './cli/deploy-tonutils'
import { runDnsRegistration } from './cli/dns'
import { runDnsRegistrationAgentic } from './cli/dns-agentic'
import { runDoctor } from './cli/doctor'
import { runVerifyProvenance } from './cli/verify-provenance'
import { runServiceList, runServiceStop } from './cli/service'
import { runSiteHost } from './cli/site-host'
import { runWatchMode } from './cli/watch'

import { SOVEREIGN_DEPLOY_VERSION as VERSION } from './version'

const program = new Command()

program
  .name('ton-sovereign-deploy')
  .description('Deploy static sites to TON Storage — censorship-resistant in one command')
  .version(VERSION)
  .argument('[build-dir]', 'Path to build directory (auto-detected if omitted)')
  .option('--testnet', 'Use TON testnet (for testing without real TON)')
  .option('--desc <description>', 'Bag description (defaults to directory name)')
  .option('--domain <domain>', 'Register bag under this .ton domain (e.g. myprotocol.ton)')
  .option('--provider [address]', 'Contract with a storage provider for 24/7 hosting (omit address to auto-select cheapest)')
  .option('--span <seconds>', 'Provider contract span in seconds (default 86400 = 1 day, max 4294967295)', '86400')
  .option('--wallet <name>', 'Preferred wallet for sign requests (case-insensitive substring of wallet name; default "Tonkeeper")', 'Tonkeeper')
  // v0.8 S2.8: agentic signing mode. Reads a private key from
  // ~/.config/ton/config.json (managed by @ton/mcp) and signs DNS
  // updates locally — no QR / phone approval. For unattended deploys.
  .option('--wallet-mode <mode>', 'Signing mode: tonconnect (default, QR) | agentic (autonomous, reads ~/.config/ton/config.json)', 'tonconnect')
  .option('--wallet-label <label>', 'Wallet selector for --wallet-mode agentic (id / name / address; default = active_wallet_id)')
  .option('--wallet-config <path>', 'Override path for --wallet-mode agentic config file (default ~/.config/ton/config.json or $TON_CONFIG_PATH)')
  .option('--ci-mode', 'Disable spinners for CI environments')
  .option('--json-output', 'Output result as JSON (for CI/CD pipelines)')
  .option('--skip-verify', 'Skip bag accessibility verification')
  .option('--no-provenance', 'Do not emit the .well-known/ton-deploy.json provenance manifest into the bag')
  // --watch is the default since v0.6 (self-host first). The daemon stays
  // alive and the build dir is watched for changes. `--no-watch` exits as
  // soon as the bag is uploaded (one-shot deploy).
  .option('--watch', 'Watch build directory for changes and auto-redeploy (default: enabled)')
  .option('--no-watch', 'Disable watch mode and exit after upload')
  .option('--debounce <ms>', 'Debounce delay in ms for watch mode (default: 2000)', '2000')
  // v0.6: daemon backend swap. Default = tonutils (xssnick / Go), the daemon
  // TON-Torrent and the Resistance Tools stack use. ton-core is the legacy
  // C++ daemon, kept as a fallback during the migration.
  .option('--daemon-backend <name>', 'Daemon backend: tonutils (default) | ton-core', 'tonutils')
  .option('--daemon-mode <mode>', 'Daemon ownership: detached (default; CLI/watch owns it) | embedded (one-shot, killed on exit) | service (hand to launchd/systemd, keeps seeding). #37', 'detached')
  // v0.6: ADNL Tunnel client. Pass a nodes-pool.json (obtained from the
  // tunnel operator you trust) and the daemon will route bag traffic
  // through that pool — useful when the host is behind NAT or wants to
  // hide its IP. tonutils backend only.
  .option('--tunnel-config <path>', 'Path to nodes-pool.json for ADNL Tunnel (tonutils backend only; bring-your-own pool)')
  // #69: cloud-seeder announce knobs. To run the kit AS a publicly-reachable
  // seeder on a VM, advertise the public IPv4 (DHT) + pin a firewall-able UDP
  // port. Override the SOVEREIGN_ANNOUNCE_IP / _PORT env vars. tonutils only.
  .option('--announce-ip <ip>', 'Public IPv4 to announce to the DHT for a publicly-reachable cloud seeder (tonutils backend). Overrides $SOVEREIGN_ANNOUNCE_IP.')
  .option('--announce-port <port>', 'Fixed UDP ListenAddr port to announce (so a firewall rule can be pre-opened). Overrides $SOVEREIGN_ANNOUNCE_PORT.', (v) => parseInt(v, 10))
  // v0.6 B5: bring-your-own rldp-http-proxy ADNL identity. When set together
  // with --domain, the CLI writes both a `storage` (bag) and a `site`
  // (dns_adnl_address) record in a single TonConnect tx, matching the
  // mainstream .ton hosting pattern (piracy.ton, tonnet-sync-check.ton, …).
  // Auto-spawning a local rldp-http-proxy + ADNL key minting is v0.7 work.
  .option('--site-adnl <hex>', '64-hex ADNL identity to publish as the `site` (dns_adnl_address) DNS record (BYO rldp-http-proxy)')
  // v0.7 C1: auto-spawn rldp-http-proxy. Mints a fresh ADNL identity in
  // pure JS, downloads + spawns rldp-http-proxy bound to that identity,
  // and pipes the build dir through a local Node http server. The ADNL
  // hex is fed into the DNS site record automatically. Mutually exclusive
  // with --site-adnl. Requires public IP / port-forwarded UDP (doctor
  // warns; v0.7 reduced scope deferred NAT traversal to v0.9).
  .option('--site-auto', 'Auto-spawn rldp-http-proxy with a freshly minted ADNL identity (v0.7+, tonutils backend, public IP needed)')
  .option('--site-public-ip <ip>', 'Override public IPv4 published in the ADNL DHT entry (v0.7+). Default: api.ipify.org probe.')
  .option('--site-udp-port <port>', 'Override UDP port for rldp-http-proxy (v0.7+). Default: free port in 17600-17699.', (v) => parseInt(v, 10))
  .action(async (buildDirArg: string | undefined, opts: CliOptions) => {
    // Validate backend choice early.
    if (opts.daemonBackend && opts.daemonBackend !== 'tonutils' && opts.daemonBackend !== 'ton-core') {
      throw new Error(
        `--daemon-backend must be 'tonutils' or 'ton-core' (got '${opts.daemonBackend}')`,
      )
    }
    const backend = opts.daemonBackend ?? 'tonutils'

    // --tunnel-config is wired into the tonutils ClientConfig only; the
    // legacy ton-core daemon has no equivalent code path.
    if (opts.tunnelConfig && backend !== 'tonutils') {
      throw new Error(
        `--tunnel-config requires --daemon-backend=tonutils (the ton-core C++ daemon has no built-in ADNL Tunnel client).`,
      )
    }

    // #69: --announce-ip / --announce-port only flow through the tonutils
    // deploy path (config ExternalIP + ListenAddr). The legacy ton-core
    // backend never consumes them, so fail fast instead of silently ignoring
    // the requested public IP / fixed port.
    if ((opts.announceIp || opts.announcePort != null) && backend !== 'tonutils') {
      throw new Error(
        `--announce-ip / --announce-port require --daemon-backend=tonutils (the ton-core C++ daemon has no announce-config path).`,
      )
    }

    // v0.6 B5: --site-adnl requires --domain (otherwise there is no NFT to
    // write the record to). Hex shape is validated here so we fail fast,
    // before any deploy work happens.
    if (opts.siteAdnl) {
      if (!opts.domain) {
        throw new Error(`--site-adnl requires --domain (the .ton domain to publish the site record under).`)
      }
      const cleaned = /^0x/i.test(opts.siteAdnl) ? opts.siteAdnl.slice(2) : opts.siteAdnl
      if (!/^[0-9a-f]{64}$/i.test(cleaned)) {
        throw new Error(`--site-adnl must be a 64-character hex string (256-bit ADNL identity); got ${JSON.stringify(opts.siteAdnl)}`)
      }
      // canonicalize to lowercase, no 0x prefix, for downstream consistency
      opts.siteAdnl = cleaned.toLowerCase()
    }

    // v0.7 C1: --site-auto requires --domain (same reason as --site-adnl)
    // and is mutually exclusive with --site-adnl. tonutils backend only
    // (legacy ton-core path doesn't compose with the v0.7 lifecycle).
    if (opts.siteAuto) {
      if (!opts.domain) {
        throw new Error(`--site-auto requires --domain (the .ton domain to publish the site record under).`)
      }
      if (opts.siteAdnl) {
        throw new Error(`--site-auto and --site-adnl are mutually exclusive (pick auto-spawn OR bring-your-own).`)
      }
      if (backend !== 'tonutils') {
        throw new Error(`--site-auto requires --daemon-backend=tonutils (default).`)
      }
    }
    if (opts.sitePublicIp && !opts.siteAuto) {
      throw new Error(`--site-public-ip requires --site-auto.`)
    }
    if (opts.siteUdpPort != null && !opts.siteAuto) {
      throw new Error(`--site-udp-port requires --site-auto.`)
    }

    // v0.8 S2.8: --wallet-mode validation
    const walletMode = opts.walletMode ?? 'tonconnect'
    if (walletMode !== 'tonconnect' && walletMode !== 'agentic') {
      throw new Error(
        `--wallet-mode must be 'tonconnect' or 'agentic' (got ${JSON.stringify(opts.walletMode)}).`,
      )
    }
    if (walletMode === 'tonconnect') {
      if (opts.walletLabel) {
        throw new Error(`--wallet-label requires --wallet-mode=agentic.`)
      }
      if (opts.walletConfig) {
        throw new Error(`--wallet-config requires --wallet-mode=agentic.`)
      }
    }
    if (walletMode === 'agentic') {
      if (!opts.domain) {
        throw new Error(
          `--wallet-mode=agentic only affects DNS write. Pass --domain to deploy to a .ton domain, ` +
            `or drop --wallet-mode=agentic for a bag-only deploy (no signing needed).`,
        )
      }
      if (backend !== 'tonutils') {
        throw new Error(
          `--wallet-mode=agentic requires --daemon-backend=tonutils (default). ` +
            `Legacy ton-core backend's DNS path is TonConnect-only.`,
        )
      }
    }

    // v0.6: --provider is temporarily disabled while the daemon backend is
    // being migrated. The mainnet provider economy was already dormant
    // (docs/archive/v0.5/round-postmortem.md), so this gate costs no real
    // functionality. v0.7 will reintroduce provider support against
    // whichever protocol turns out to have liveness.
    if (opts.provider) {
      throw new Error(
        `--provider is temporarily disabled in v0.6 during the daemon backend migration. ` +
        `Background: docs/archive/v0.5/round-postmortem.md (mainnet provider economy is dormant). ` +
        `Plan: docs/archive/v0.6/roadmap-draft.md (re-enabled in v0.7).`,
      )
    }

    // v0.6: --watch is the default for interactive runs (self-host first).
    // For non-interactive runs (--json-output, --ci-mode, or CI=true env)
    // the documented behaviour is one-shot: print the result and exit, so
    // a CI invocation that doesn't pass --no-watch must not be left
    // hanging in the seeding loop. Codex P1 caught this on review.
    const isCI = opts.ciMode || process.env.CI === 'true'
    const watchExplicitlyOff = opts.watch === false
    const watchExplicitlyOn  = opts.watch === true
    const nonInteractive = isCI || !!opts.jsonOutput
    let watchEnabled = watchExplicitlyOn
      ? true
      : watchExplicitlyOff
        ? false
        : !nonInteractive

    // #37: daemon ownership mode. Only `detached` keeps a CLI-owned live
    // daemon for watch mode; `embedded` (one-shot) and `service` (handed to
    // the OS) have no live handle to watch with, so they force one-shot.
    const daemonMode = opts.daemonMode ?? 'detached'
    if (daemonMode !== 'detached' && daemonMode !== 'embedded' && daemonMode !== 'service') {
      throw new Error(`--daemon-mode must be detached | embedded | service (got ${JSON.stringify(opts.daemonMode)}).`)
    }
    if (daemonMode !== 'detached') {
      if (watchExplicitlyOn) {
        throw new Error(`--watch requires --daemon-mode detached (got ${daemonMode}). The watch loop needs a CLI-owned daemon.`)
      }
      if (daemonMode === 'service' && opts.siteAuto) {
        throw new Error('--daemon-mode service is not compatible with --site-auto (the rldp-http-proxy stays CLI-owned and would die on exit). Run them separately for now.')
      }
      watchEnabled = false
    }

    // -----------------------------------------------------------------
    // Backend dispatch
    // -----------------------------------------------------------------
    if (backend === 'tonutils') {
      const deployed = await runDeployTonutils(opts, buildDirArg, {
        tunnelConfigPath: opts.tunnelConfig,
        // The seeder keeps running only in watch mode or when handed to the OS
        // (service). One-shot modes kill it right after deploy, so the
        // reachability advisory must not claim ongoing downloadability. (#68)
        willSeed: watchEnabled || daemonMode === 'service',
      })
      if (!deployed) return
      const { result, daemon, buildDir } = deployed

      // v0.7 C1: spin up rldp-http-proxy + static server BEFORE the DNS
      // sign so the site record points at a live identity from the
      // moment it lands on chain.
      let siteHost: Awaited<ReturnType<typeof runSiteHost>> | undefined
      if (opts.siteAuto && opts.domain) {
        siteHost = await runSiteHost({
          buildDir,
          domain: opts.domain,
          publicIp: opts.sitePublicIp,
          udpPort: opts.siteUdpPort,
          silent: !!opts.jsonOutput,
        })
      }

      // DNS registration is daemon-agnostic (cell builder is shared).
      // v0.8 S2.8: dispatch on --wallet-mode. tonconnect (default) goes
      // through the original runDnsRegistration; agentic uses the SDK's
      // writeDnsRecordAgentic via runDnsRegistrationAgentic.
      if (opts.domain) {
        const effectiveSiteAdnl = siteHost?.siteAdnlHex ?? opts.siteAdnl
        if (walletMode === 'agentic') {
          await runDnsRegistrationAgentic(opts.domain, result.bagId, opts.testnet, {
            jsonOutput: opts.jsonOutput,
            ciMode: opts.ciMode,
            walletLabel: opts.walletLabel,
            configPath: opts.walletConfig,
            siteAdnl: effectiveSiteAdnl,
          })
        } else {
          await runDnsRegistration(opts.domain, result.bagId, opts.testnet, {
            jsonOutput: opts.jsonOutput,
            ciMode: opts.ciMode,
            walletName: opts.wallet,
            siteAdnl: effectiveSiteAdnl,
          })
        }
      }

      if (watchEnabled) {
        await runWatchModeTonutils(deployed, {
          debounce: opts.debounce,
          jsonOutput: opts.jsonOutput,
          domain: opts.domain,
          proxyHandle: siteHost?.handle,
        })
      } else {
        daemon.kill()
        siteHost?.handle.kill()
      }
      return
    }

    // -----------------------------------------------------------------
    // Legacy ton-core backend (opt-in via --daemon-backend=ton-core).
    // --provider is disabled at the gate above; the legacy path here
    // only handles deploy + DNS + watch. The v0.5 provider-contract
    // CLI adapter (`src/cli/provider.ts`) was removed in v0.8 cleanup
    // — `src/provider.ts` (TL-B / message construction / registry)
    // stays in tree for v0.9 revival. Re-introduce a thin CLI adapter
    // alongside any provider revival work.
    // -----------------------------------------------------------------
    const deployed = await runDeploy(opts, buildDirArg)
    if (!deployed) return

    const { result, daemon } = deployed

    // DNS registration
    if (opts.domain) {
      await runDnsRegistration(opts.domain, result.bagId, opts.testnet, {
        jsonOutput: opts.jsonOutput,
        ciMode: opts.ciMode,
        walletName: opts.wallet,
        siteAdnl: opts.siteAdnl,
      })
    }

    // Watch mode (default since v0.6 — keeps the daemon seeding the bag).
    if (watchEnabled) {
      const buildDir = buildDirArg || process.cwd()
      await runWatchMode(buildDir, opts, result.bagId)
    } else if (daemon) {
      // No watch + no provider work → daemon has nothing left to do.
      daemon.kill()
    }
  })

program
  .command('doctor')
  .description('Pre-flight environment check: daemon binaries, TONAPI / manifest reachability, TonConnect session')
  .action(async () => { await runDoctor() })

const serviceCmd = program
  .command('service')
  .description('Manage --daemon-mode service seed daemons (launchd / systemd). #37')
serviceCmd
  .command('list')
  .description('List installed service-mode seed daemons + their running state')
  .action(async () => { await runServiceList() })
serviceCmd
  .command('stop')
  .argument('<bag_id>', 'Bag id of the seed service to stop')
  .option('--purge', 'Also remove the seed db (default: keep it for re-deploy)')
  .action(async (bagId: string, o: { purge?: boolean }) => { await runServiceStop(bagId, o) })

program
  .command('verify-provenance')
  .argument('<file-or-url>', 'Path to (or http(s):// URL of) a .well-known/ton-deploy.json manifest')
  .description('Verify a provenance manifest (#34): checks the Ed25519 signature over the deployer claim')
  .action(async (target: string) => { await runVerifyProvenance(target) })

program.parse()
