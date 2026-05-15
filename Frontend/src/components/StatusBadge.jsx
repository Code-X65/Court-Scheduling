export function Badge({ value, type = 'status' }) {
  if (!value) return null
  const key = value.toLowerCase().replace(/\s+/g, '-')
  return (
    <span className={`badge badge-${key}`}>
      {value}
    </span>
  )
}

export function PriorityDot({ priority }) {
  const colors = { urgent: '#C0392B', normal: '#1A5276', low: '#9BAAB8' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: colors[priority] || colors.normal,
        display: 'inline-block', flexShrink: 0,
      }} />
      <span style={{ textTransform: 'capitalize' }}>{priority}</span>
    </span>
  )
}
