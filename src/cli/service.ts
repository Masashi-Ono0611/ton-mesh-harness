import chalk from 'chalk'
import { listServices, stopService, ServiceError } from '../daemon/service'

/**
 * `ton-sovereign-deploy service list | stop <bag_id>` (#37) — manage the
 * launchd / systemd seed daemons installed by `--daemon-mode service`.
 */
export async function runServiceList(): Promise<void> {
  const services = listServices()
  if (services.length === 0) {
    console.log(chalk.dim('No service-mode seed daemons installed.'))
    return
  }
  console.log(chalk.bold('Service-mode seed daemons:'))
  for (const s of services) {
    const state = s.running ? chalk.green('running') : chalk.yellow('stopped')
    console.log(`  ${state}  ${s.bag_id}`)
    console.log(chalk.dim(`         label=${s.label}  api=${s.api_url}`))
    console.log(chalk.dim(`         db=${s.db_dir}`))
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
