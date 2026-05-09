import { Link } from 'react-router-dom'

export default function TopicCard({ id, slug, title, subtitle, color }) {
  return (
    <div
      className="bg-card rounded-xl border border-border hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 flex flex-col"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="p-5 flex-1">
        <p className="text-xs text-muted uppercase tracking-widest mb-1">
          {String(id).padStart(2, '0')}
        </p>
        <h3 className="text-base font-semibold text-primary leading-snug mb-1">
          {title}
        </h3>
        <p className="text-sm text-secondary leading-relaxed">{subtitle}</p>
      </div>
      <div className="px-5 pb-4 flex gap-2">
        <Link
          to={`/topic/${slug}?view=info`}
          className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
        >
          Info
        </Link>
        <Link
          to={`/topic/${slug}?view=game`}
          className="text-xs px-3 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800"
        >
          Play
        </Link>
        <Link
          to={`/topic/${slug}?view=viz`}
          className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
        >
          Visualise
        </Link>
      </div>
    </div>
  )
}
