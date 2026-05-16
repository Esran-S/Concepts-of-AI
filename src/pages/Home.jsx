import { TOPICS } from '../topics/meta'
import TopicCard from '../components/TopicCard'

const GROUP_ORDER = ['Foundations', 'Search strategies', 'Evolutionary', 'Hyper-heuristics', 'Special topics']

export default function Home() {
  const grouped = GROUP_ORDER.map(g => ({
    group: g,
    topics: TOPICS.filter(t => t.group === g),
  }))

  return (
    <div>
      {/* Hero */}
      <div className="pt-12 pb-14 text-center space-y-4">
        <div
          className="text-5xl md:text-6xl font-bold tracking-tight"
          style={{
            background: 'linear-gradient(160deg, var(--text-primary) 30%, var(--text-muted) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Concepts of AI
        </div>
        <p className="text-lg max-w-lg mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Eleven interactive topics — from classical search to large language models.
          Read the theory, play the game, or watch it run.
        </p>
        <div className="flex justify-center gap-2.5 flex-wrap pt-2">
          {[
            { label: 'Info',      desc: 'theory & concepts' },
            { label: 'Play',      desc: 'interactive games'  },
            { label: 'Visualise', desc: 'live simulations'   },
          ].map(({ label, desc }) => (
            <div
              key={label}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl text-[13px] font-medium"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
                color: 'var(--text-primary)',
              }}
            >
              <span className="font-semibold">{label}</span>
              <span style={{ color: 'var(--text-muted)' }}>— {desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Topics grouped by category */}
      {grouped.map(({ group, topics }) => (
        <div key={group} className="mb-12">
          <p
            className="text-[11px] font-bold uppercase tracking-widest mb-4"
            style={{ color: 'var(--text-muted)' }}
          >
            {group}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics.map(topic => (
              <TopicCard key={topic.id} {...topic} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
