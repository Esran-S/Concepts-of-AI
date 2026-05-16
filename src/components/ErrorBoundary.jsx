import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  // Intentionally not logging error details to console in production
  // to avoid leaking internal stack traces to end users.
  componentDidCatch() {}

  render() {
    if (this.state.hasError) {
      return (
        <div className="mt-6 rounded-xl p-6 text-center border border-border" style={{ background: 'var(--surface)' }}>
          <p className="text-3xl mb-3">⚠️</p>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Something went wrong loading this section
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Try refreshing the page.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
