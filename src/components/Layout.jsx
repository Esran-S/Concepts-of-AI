import Nav from './Nav'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-bg text-primary">
      <Nav />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
