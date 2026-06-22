import chalk from 'chalk'
import { listServices, stopService, ServiceError } from '../daemon/service'
import { listSiteServices, stopSiteService, SiteServiceError } from '../daemon/site-service'

/**
 * `ton-sovereign-deploy service list | stop <bag_id> | stop-site <domain>`
 * — manage the launchd / systemd daemons installed by `--daemon-mode service`:
 * bag seeders (#37) and `--site-auto` site gateways (②-C).
 */
export async function runServiceList(): Promise<void> {
  const services = listServices()
  const sites = listSiteServices()
  if (services.length === 0 && sites.length === 0) {
    console.log(chalk.dim('No service-mode daemons installed.'))
    return
  }
  if (services.length > 0) {
    console.log(chalk.bold('Bag seeders:'))
    for (const s of services) {
      const state = s.running ? chalk.green('running') : chalk.yellow('stopped')
      console.log(`  ${state}  ${s.bag_id}`)
      console.log(chalk.dim(`         label=${s.label}  api=${s.api_url}`))
      console.log(chalk.dim(`         db=${s.db_dir}`))
    }
  }
  if (sites.length > 0) {
    console.log(chalk.bold('Site gateways (--site-auto):'))
    for (const s of sites) {
      const state = s.running ? chalk.green('running') : chalk.yellow('stopped')
      console.log(`  ${state}  ${s.domain}`)
      console.log(chalk.dim(`         label=${s.label}  adnl=${s.adnl_short_id}`))
      console.log(chalk.dim(`         build=${s.build_dir}`))
    }
  }
}

export async function runServiceStop(bagId: string, opts: { purge?: boolean } = {}): Promise<void> {
  try {
    stopService(bagId, { removeDb: !!opts.purge })
  } catch (err) {
    if (err instanceof ServiceError) {
      console.error(chalk.red(err.message))
      process.exit(1)
    }
    throw err
  }
  console.log(
    chalk.green(`✓ stopped service for bag ${bagId}`) +
      (opts.purge ? chalk.dim(' (seed db removed)') : chalk.dim(' (seed db kept — re-deploy to re-seed)')),
  )
}

export async function runSiteServiceStop(domain: string, opts: { purge?: boolean } = {}): Promise<void> {
  try {
    stopSiteService(domain, { removeData: !!opts.purge })
  } catch (err) {
    if (err instanceof SiteServiceError) {
      console.error(chalk.red(err.message))
      process.exit(1)
    }
    throw err
  }
  console.log(
    chalk.green(`✓ stopped site gateway for ${domain}`) +
      (opts.purge
        ? chalk.dim(' (metadata removed; identity seed kept)')
        : chalk.dim(' (metadata + identity seed kept — re-run to restart)')),
  )
}
