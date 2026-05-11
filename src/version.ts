/**
 * Single source of truth for the kit's version string. Imported by
 * `src/cli.ts` and `src/mcp.ts`; previously each file hardcoded its
 * own copy and they drifted (rc2 → rc5 sync was missed twice).
 *
 * MUST match `package.json#version` exactly. The `scripts/cli-smoke.cjs`
 * CI step validates the published binary surfaces a semver-shaped
 * string, so a forgotten bump here triggers a build-time failure even
 * if `package.json` is correct.
 *
 * NO `console.*` IN THIS FILE — lint-enforced.
 */
export const SOVEREIGN_DEPLOY_VERSION = '0.8.0-rc5'
