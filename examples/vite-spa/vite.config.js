import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' is REQUIRED for TON Storage / .ton hosting.
//
// A deployed site is a content-addressed bag. Under a `.ton` domain it
// is served from the domain root, but via a public gateway it is served
// under a `/<bag-id>/` path prefix. Absolute asset paths (`/assets/...`)
// 404 in the gateway case; relative paths (`./assets/...`) resolve in
// both. Setting base to './' emits relative URLs, so the same build
// works whether opened at `yourname.ton` or `gateway/<bag-id>/`.
export default defineConfig({
  plugins: [react()],
  base: './',
})
