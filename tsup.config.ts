import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli.ts', 'src/mcp.ts', 'src/sdk.ts'],
  format: ['cjs'],
  target: 'node18',
  clean: true,
  shims: true,
  // Emit .d.ts only for the SDK entry — CLI / MCP are binaries, not
  // library entry points, so consumers don't need types for those.
  dts: { entry: { sdk: 'src/sdk.ts' } },
  // `@ton/walletkit@0.0.12-alpha.3` ships `dist/cjs/utils/mnemonic.mjs`
  // with a directory import (`from '../errors'`) that Node 22+ rejects
  // in strict ESM resolver mode (ERR_UNSUPPORTED_DIR_IMPORT). Inlining
  // via tsup resolves those imports at bundle time so the published
  // CLI / MCP works on Node 22 and 24.
  noExternal: ['@ton/walletkit'],
})
