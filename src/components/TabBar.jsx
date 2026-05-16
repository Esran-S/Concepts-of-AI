import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'

const TABS = [
  { label: 'Info',      view: 'info' },
  { label: 'Play',      view: 'game' },
  { label: 'Visualise', view: 'viz'  },
]

export default function TabBar({ slug, accentColor }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeView = searchParams.get('view') || 'info'

  return (
    <div className="mb-7">
      <div
        className="inline-flex p-1 rounded-2xl gap-0.5"
        style={{
          background: 'var(--surface)',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--border)',
        }}
      >
        {TABS.map(({ label, view }) => {
          const isActive = activeView === view
          return (
            <button
              key={view}
              onClick={() => setSearchParams({ view })}
              className="relative px-5 py-2 text-[13px] font-medium rounded-xl transition-colors duration-150"
              style={{ color: isActive ? '#fff' : 'var(--text-secondary)' }}
            >
              {isActive && (
                <motion.div
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: accentColor }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative z-10">{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
