export const metadata = {
  title: 'Next.js static export on .ton',
  description: 'A statically-exported Next.js site served from TON Storage.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, sans-serif', margin: 0 }}>
        {children}
      </body>
    </html>
  )
}
