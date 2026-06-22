// systemd --user lingering advisory for service-mode reboot survival (#83).
//
// A `systemd --user` unit only runs while the user has an active login session,
// so after an UNATTENDED reboot of a headless VM it will NOT restart unless
// lingering was enabled once (`loginctl enable-linger`). Both service-mode
// installers hit this: the bag seeder (#37) and the --site-auto site gateway
// (#81). We detect it and print the exact command — never running the
// privileged op ourselves (parity with the --site-auto `ip addr add` advisory).
//
// Linux-only: macOS launchd survives reboots via RunAtLoad, so there is nothing
// to advise there.

import { execFileSync } from 'node:child_process'
import os from 'node:os'

/**
 * Advisory line when a `--daemon-mode service` unit will NOT survive an
 * unattended reboot — i.e. the host is Linux AND systemd lingering is disabled
 * for the current user. Returns `null` when:
 *   - not Linux (launchd handles reboot via RunAtLoad), or
 *   - lingering is already enabled, or
 *   - we can't determine it (loginctl absent / user not known to logind) —
 *     stay quiet rather than print a command that might not apply.
 */
export function lingerAdvisory(): string | null {
  if (process.platform !== 'linux') return null
  try {
    const user = os.userInfo().username
    // `--value` (systemd 240+) prints just `yes`/`no`; older systemd prints
    // `Linger=yes`. split('=').pop() normalizes both forms.
    const out = execFileSync('loginctl', ['show-user', user, '--property=Linger', '--value'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
    const value = out.split('=').pop()?.trim()
    if (value === 'yes') return null
    return (
      `For reboot survival, enable systemd lingering once: sudo loginctl enable-linger ${user} ` +
      `— a systemd --user service otherwise only runs while you are logged in.`
    )
  } catch {
    // loginctl missing (non-systemd host) or user unknown to logind: we can't
    // assert the state, so don't nag with a possibly-wrong command.
    return null
  }
}
