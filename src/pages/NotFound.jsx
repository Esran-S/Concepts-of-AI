import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-primary mb-3">
        Page not found
      </h1>
      <p className="text-sm text-secondary mb-6">
        The page you are looking for does not exist.
      </p>
      <Link
        to="/"
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← Back to all topics
      </Link>
    </div>
  )
}
