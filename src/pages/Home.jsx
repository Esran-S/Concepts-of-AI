import { TOPICS } from '../topics/meta'
import TopicCard from '../components/TopicCard'

export default function Home() {
  return (
    <div>
      <div className="py-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary mb-3">
          Concepts of AI
        </h1>
        <p className="text-lg text-secondary mb-6">
          Pick a topic. Understand it, play it, or watch it run.
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <span className="bg-surface border border-border rounded-full px-4 py-1.5 text-sm text-secondary">
            Read
          </span>
          <span className="bg-surface border border-border rounded-full px-4 py-1.5 text-sm text-secondary">
            Play
          </span>
          <span className="bg-surface border border-border rounded-full px-4 py-1.5 text-sm text-secondary">
            Visualise
          </span>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-xs uppercase tracking-widest text-muted">Explore all topics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOPICS.map(topic => (
          <TopicCard key={topic.id} {...topic} />
        ))}
      </div>
    </div>
  )
}
