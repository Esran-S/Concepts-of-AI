import Nav from './Nav'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <Nav />
      <main className="max-w-4xl mx-auto px-5 md:px-8 py-8 md:py-12">
        {children}
      </main>
    </div>
  )
}
