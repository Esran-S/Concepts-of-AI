import { Link } from 'react-router-dom'

export default function TopicCard({ id, slug, title, subtitle, color }) {
  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col hover:-translate-y-1 transition-all duration-200 cursor-default"
      style={{
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Accent bar */}
      <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${color}, ${color}60)` }} />

      <div className="p-5 flex-1">
        <div className="flex items-center justify-between mb-3">
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ color, background: color + '18' }}
          >
            {String(id).padStart(2, '0')}
          </span>
        </div>
        <h3 className="text-[15px] font-semibold leading-snug mb-1.5" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {subtitle}
        </p>
      </div>

      <div className="px-5 pb-4 flex gap-2">
        <Link
          to={`/topic/${slug}?view=info`}
          className="flex-1 text-center text-[12px] py-1.5 rounded-xl font-medium transition-colors hover:opacity-80"
          style={{
            background: 'var(--bg)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          Info
        </Link>
        <Link
          to={`/topic/${slug}?view=game`}
          className="flex-1 text-center text-[12px] py-1.5 rounded-xl font-medium text-white transition-opacity hover:opacity-85"
          style={{ background: color }}
        >
          Play
        </Link>
        <Link
          to={`/topic/${slug}?view=viz`}
          className="flex-1 text-center text-[12px] py-1.5 rounded-xl font-medium transition-colors hover:opacity-80"
          style={{
            background: 'var(--bg)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          Viz
        </Link>
      </div>
    </div>
  )
}
