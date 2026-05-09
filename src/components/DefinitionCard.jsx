export default function DefinitionCard({ children, color }) {
  return (
    <div
      className="bg-surface rounded-xl p-5"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <p className="text-sm leading-relaxed text-secondary italic">{children}</p>
    </div>
  )
}
