import { Link } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'

export default function Nav() {
  return (
    <nav
      className="sticky top-0 z-50 w-full h-14 flex items-center justify-between px-5 md:px-10"
      style={{
        background: 'var(--nav-bg)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <Link
        to="/"
        className="text-[15px] font-semibold tracking-tight hover:opacity-60 transition-opacity duration-200"
        style={{ color: 'var(--text-primary)' }}
      >
        Concepts of AI
      </Link>
      <ThemeToggle />
    </nav>
  )
}
