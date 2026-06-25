/**
 * Single source of truth for external service URLs the SDK + CLI talk to.
 *
 * Centralised here so endpoint changes (e.g. Toncenter migrating to a
 * new domain) flip in one place rather than three.
 *
 * NO `console.*` IN THIS FILE — lint-enforced.
 */

import type { AgenticNetwork } from './agentic-config'

/**
 * Toncenter v3 HTTP API base URLs. Used by `ApiClientToncenter` in
 * `agentic-sign.ts` (signing path) and `resolve-tx.ts` (tx-hash
 * lookup). Mirror the defaults `@ton/mcp` itself uses.
 */
export const TONCENTER_ENDPOINTS: Record<AgenticNetwork, string> = {
  mainnet: 'https://toncenter.com',
  testnet: 'https://testnet.toncenter.com',
}

/**
 * Lift our boolean `testnet` flag (the CLI / SDK input convention) to
 * the string-discriminated `AgenticNetwork` (the config / endpoint
 * key). `testnet === true` → `'testnet'`; anything else → `'mainnet'`.
 *
 * Hoisted so we don't repeat the same ternary in N places.
 */
export function networkFromTestnetFlag(testnet: boolean | undefined): AgenticNetwork {
  return testnet ? 'testnet' : 'mainnet'
}

/**
 * Build a tonviewer.com transaction URL. Accepts hashes with or without
 * the `0x` prefix; emits the canonical no-prefix form tonviewer expects.
 *
 * Note: tonviewer.com is the mainnet UI; testnet.tonviewer.com is the
 * testnet UI. Caller is expected to know which network the hash belongs
 * to (we don't smuggle that into the hash itself).
 */
export function tonviewerTxUrl(txHash: string, testnet = false): string {
  const cleaned = txHash.replace(/^0x/i, '')
  const host = testnet ? 'testnet.tonviewer.com' : 'tonviewer.com'
  return `https://${host}/transaction/${cleaned}`
}

/**
 * The ton.run SITE gateway URL for a `.ton` domain. The gateway resolves the
 * domain's `site` record (an ADNL identity) over RLDP, so this opens in an
 * ordinary browser once that record is on chain AND a reachable rldp-http-proxy
 * backs the ADNL (verified 2026-06-22: foundation.ton.run → 200). Only
 * meaningful for a deploy that writes a `site` record — a storage-only domain
 * has no ADNL to resolve and 404s — so callers must emit it ONLY after a site
 * record is signed, or label it as a would-be URL for a storage-only deploy
 * (see `storageOnlyViewabilityHint`). (#70, #118)
 */
export function siteGatewayUrl(domain: string): string {
  // Normalize a shorthand domain the same way the DNS path does (`mysite` →
  // `mysite.ton`; see src/dns.ts), so the gateway URL matches the record that
  // was actually written. Lowercase first so a cased suffix like `Example.TON`
  // becomes `example.ton.run`, not `Example.TON.ton.run` — TON DNS is
  // case-insensitive and ton.run resolves lowercased (#118 / Codex P3). Then
  // append `.run`: `<label>.ton` → `<label>.ton.run`.
  const d = domain.toLowerCase()
  const cleanDomain = d.endsWith('.ton') ? d : `${d}.ton`
  return `https://${cleanDomain}.run`
}

/**
 * Human/agent-facing breadcrumb for a STORAGE-ONLY domain deploy (the only
 * kind `deploy()` does — it never writes a `site`/ADNL record). Explains why
 * `<domain>.ton` is not browser-openable via the ton.run RLDP gateway, what
 * URL it WOULD resolve at once a site record + reachable gateway exist, and
 * how to get there. When the bag is no longer seeded (`seed_status==='stopped'`)
 * it also notes the content is not retrievable until a reachable node seeds it.
 * (#118 — the deploy result carried no viewability signal, so a "green" deploy
 * could 404 everywhere with no breadcrumb.)
 */
export function storageOnlyViewabilityHint(args: {
  domain: string
  seedStatus: 'seeding' | 'stopped'
  testnet?: boolean
}): string {
  // ton.run is a MAINNET-only SITE gateway (no testnet selector), so only
  // advertise the would-be `<domain>.ton.run` URL for mainnet deploys —
  // mirrors the CLI DNS path's `!testnet` gate (src/cli/dns.ts). For testnet
  // there is no public SITE gateway, so we omit the dead URL (#118 / Codex P2).
  const gw = args.testnet ? null : siteGatewayUrl(args.domain)
  const browsableClause = gw
    ? `via the ton.run RLDP gateway (${gw} 404s)`
    : `(ton.run is mainnet-only — there is no public testnet SITE gateway)`
  const howTo = gw
    ? `To get a browser-openable ${gw} URL, set a site (ADNL) record with mesh_site_record (point the` +
      ` domain at a resident rldp-http-proxy ADNL) and run a public gateway (CLI: --site-auto --daemon-mode service).`
    : `Set a site (ADNL) record with mesh_site_record and run your own rldp-http-proxy gateway` +
      ` (CLI: --site-auto --daemon-mode service); ton.run will not serve a testnet domain.`
  const seedNote =
    args.seedStatus === 'stopped'
      ? ` Also, nothing is currently seeding this bag (seed_status=stopped): it is not retrievable` +
        ` until a reachable node seeds it (deploy with keep_alive:true / daemon_mode "detached" | "service").`
      : ''
  // Describe what THIS call did (storage only, no site write) rather than
  // asserting the domain's current site-record state — a redeploy leaves any
  // pre-existing site record intact, so it may already be browsable (Codex P2).
  return (
    `This deploy wrote the STORAGE (bag) record only — it did NOT write a site (ADNL) record. Without a` +
    ` site record, ${args.domain} is not browser-openable ${browsableClause} and renders only in a` +
    ` TON-DNS-native client (MyTonWallet / Tonkeeper in-app TON Browser) while a reachable node seeds the` +
    ` bag. ${howTo} (A site record from a previous call / --site-auto is left intact.)` +
    seedNote
  )
}
