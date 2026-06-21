import chalk from 'chalk'

export interface DeployResult {
  bagId: string
  tonUrl: string
  // Browser-openable HTTP URL. Only meaningful once the bag is reachable
  // through a gateway — which today means a `.ton` domain pointing at it
  // (set via the DNS step below). A raw bag id is NOT served on-demand by
  // public gateways (e.g. ton.run/<bagId> returns 404 — verified 2026-06-21),
  // so this stays undefined for a bag-only deploy rather than advertising a
  // dead link.
  fallbackUrl?: string
  dns?: {
    domain: string
    txHash: string
  }
}

export function buildUrls(bagId: string): Pick<DeployResult, 'tonUrl'> {
  return {
    tonUrl: `ton://${bagId}`,
  }
}

export function printResult(result: DeployResult): void {
  console.log()
  console.log(chalk.green('✅ TON Storage:  ') + chalk.bold(result.tonUrl))
  console.log(chalk.dim('   content-addressed bag, served peer-to-peer by your running node'))
  if (result.dns) {
    console.log(chalk.green('🌐 .ton Site:    ') + chalk.bold(result.dns.domain))
  }
  if (result.fallbackUrl) {
    console.log(chalk.cyan('🔗 Gateway URL:  ') + result.fallbackUrl)
  }
  console.log()
  // Honest availability statement. The bag stays reachable only while at
  // least one PUBLICLY-REACHABLE node seeds it. A daemon behind NAT is
  // unreachable from the outside, so no one can download from it — run a
  // reachable seeder (public IP + open UDP port; see SOVEREIGN_ANNOUNCE_IP)
  // to actually keep the site online.
  console.log(chalk.bold('No server, no CDN, no registrar — your site stays online for as long as a reachable node seeds this bag.'))
  if (!result.dns) {
    console.log(
      chalk.dim('To open it in an ordinary browser, attach a .ton domain (--domain) and keep a reachable seeder up.'),
    )
  }
  console.log()
}

export function exportAsJson(result: DeployResult): string {
  return JSON.stringify(result, null, 2)
}
