export default function DefinitionCard({ children, color }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: color + '10',
        border: `1px solid ${color}30`,
      }}
    >
      <p
        className="text-[13px] leading-relaxed"
        style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}
      >
        {children}
      </p>
    </div>
  )
}
