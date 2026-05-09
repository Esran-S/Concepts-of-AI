import { Link } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'

export default function Nav() {
  return (
    <nav className="sticky top-0 z-50 w-full h-14 flex items-center justify-between px-4 md:px-8 bg-bg border-b border-border">
      <Link
        to="/"
        className="font-bold tracking-tight text-primary hover:opacity-80 transition-opacity"
      >
        Concepts of AI
      </Link>
      <ThemeToggle />
    </nav>
  )
}
