export default function FactCard({ children, color }) {
  return (
    <div
      className="bg-surface rounded-xl p-5"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <p className="text-xs uppercase tracking-widest text-muted mb-2">Did you know</p>
      <p className="text-sm leading-relaxed text-secondary italic">{children}</p>
    </div>
  )
}
