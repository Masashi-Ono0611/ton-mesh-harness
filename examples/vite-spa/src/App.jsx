const wrap = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  maxWidth: 640,
  margin: '4rem auto',
  padding: '0 1rem',
  lineHeight: 1.6,
}

export default function App() {
  return (
    <main style={wrap}>
      <h1>💎 Vite + React on .ton</h1>
      <p>
        This single-page app is served from <strong>TON Storage</strong> — no
        server, no CDN, no DNS registrar.
      </p>
      <p>
        Flow: <code>npm run build</code> → <code>dist/</code> →{' '}
        <code>npx ton-sovereign-deploy ./dist</code>.
      </p>
      <p>
        See this directory's <code>README.md</code> for the TonConnect and
        agentic deploy commands.
      </p>
    </main>
  )
}
