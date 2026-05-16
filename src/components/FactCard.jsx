export default function FactCard({ children, color }) {
  return (
    <div
      className="rounded-2xl p-5 space-y-2"
      style={{
        background: color + '10',
        border: `1px solid ${color}30`,
      }}
    >
      <p
        className="text-[11px] font-bold uppercase tracking-widest"
        style={{ color }}
      >
        Did you know
      </p>
      <p
        className="text-[13px] leading-relaxed"
        style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}
      >
        {children}
      </p>
    </div>
  )
}
