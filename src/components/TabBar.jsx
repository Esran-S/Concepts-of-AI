import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'

const TABS = [
  { label: 'Info', view: 'info' },
  { label: 'Game', view: 'game' },
  { label: 'Visualise', view: 'viz' },
]

export default function TabBar({ slug, accentColor }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeView = searchParams.get('view') || 'info'

  function handleTab(view) {
    setSearchParams({ view })
  }

  return (
    <div className="flex border-b border-border">
      {TABS.map(({ label, view }) => {
        const isActive = activeView === view
        return (
          <button
            key={view}
            onClick={() => handleTab(view)}
            className="relative px-5 py-3 text-sm font-medium transition-colors duration-150"
            style={{ color: isActive ? accentColor : undefined }}
          >
            {!isActive && (
              <span className="text-secondary">{label}</span>
            )}
            {isActive && label}
            {isActive && (
              <motion.div
                layoutId="tab-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ backgroundColor: accentColor }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
