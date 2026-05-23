/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a fully static site to out/ — no Node server at runtime.
  output: 'export',
  // There is no server to run the Image Optimization API, so serve images as-is.
  images: { unoptimized: true },
  // Folder-style routes (/about → /about/index.html) — static-host friendly,
  // so a gateway that maps a path to a file finds index.html for each route.
  trailingSlash: true,
}

export default nextConfig
