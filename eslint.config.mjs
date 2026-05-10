/**
 * ESLint v9 flat config — minimal, scoped to enforce SDK contracts.
 *
 * The single load-bearing rule is `no-console` on `src/sdk/**`: the SDK
 * core MUST NOT emit `console.*` so its events stay machine-readable
 * (per `docs/v0.8/mcp-core-requirements.md` §NF1, [F2] / [S4] #14).
 *
 * The CLI (`src/cli.ts`, `src/cli/**`) and entry stubs (`src/mcp.ts`)
 * are explicitly NOT in scope here — they're the renderers / fail-fast
 * paths and may use console freely.
 *
 * This config is intentionally narrow. Broader style/lint rules are
 * out of scope for [S4]; revisit in v0.8.x if useful.
 */

import tseslint from 'typescript-eslint'

export default [
  // Ignore globs
  {
    ignores: ['dist/**', 'node_modules/**', '**/*.d.ts'],
  },
  // SDK rule: no console.* anywhere in src/sdk/**
  {
    files: ['src/sdk/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'no-console': ['error'],
    },
  },
]
