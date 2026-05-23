export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: '4rem auto', padding: '0 1rem', lineHeight: 1.6 }}>
      <h1>💎 Next.js (static export) on .ton</h1>
      <p>
        Built with <code>output: &apos;export&apos;</code> → <code>out/</code> →{' '}
        <code>npx ton-sovereign-deploy ./out</code>.
      </p>
      <p>
        Fully static — no server-side rendering, no API routes, immutable and
        censorship-resistant. See this directory&apos;s <code>README.md</code> for
        the deploy commands and Next-specific routing caveats.
      </p>
    </main>
  )
}
