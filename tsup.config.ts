import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli.ts', 'src/mcp.ts'],
  format: ['cjs'],
  target: 'node18',
  clean: true,
  shims: true,
})
