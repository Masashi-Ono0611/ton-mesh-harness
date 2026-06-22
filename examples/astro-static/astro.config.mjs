import { defineConfig } from 'astro/config'

// Astro is static by default (no adapter → a fully static site in `dist/`),
// which is exactly what a censorship-resistant `.ton` deploy needs.
export default defineConfig({
  // outDir defaults to ./dist — that's what we hand to ton-mesh-harness.
})
