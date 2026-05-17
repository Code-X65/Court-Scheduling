import { Badge } from './StatusBadge.jsx'

export default function ConflictMatrix({ hearings, weekStart }) {
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const HOURS = Array.from({ length: 9 }, (_, i) => i + 9) // 9 AM to 5 PM
  
  // Group by day -> hour -> conflicts
  const matrix = DAYS.map((day, di) => {
    return HOURS.map(h => {
      const timeStr = `${String(h).padStart(2, '0')}:00`
      const matches = hearings.filter(hr => {
        const hrDay = new Date(hr.scheduled_date).getDay()
        return (hrDay === di + 1) && hr.start_time.startsWith(String(h).padStart(2, '0'))
      })
      
      // Check for judge or courtroom double bookings
      const judgeConflicts = []
      const roomConflicts  = []
      
      const judges = {}
      const rooms  = {}
      
      matches.forEach(m => {
        if (judges[m.assigned_judge_id]) judgeConflicts.push(m)
        else judges[m.assigned_judge_id] = m
        
        if (rooms[m.courtroom_id]) roomConflicts.push(m)
        else rooms[m.courtroom_id] = m
      })

      return {
        time: timeStr,
        count: matches.length,
        hasConflict: judgeConflicts.length > 0 || roomConflicts.length > 0,
        judgeConflicts,
        roomConflicts,
        matches
      }
    })
  })

  return (
    <div className="card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
      <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>📊</span> Conflict Visualization Matrix
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(5, 1fr)', border: '1px solid var(--border)' }}>
        <div style={{ background: 'var(--bg-accent)', borderBottom: '2px solid var(--border)', padding: '0.75rem' }} />
        {DAYS.map(d => (
          <div key={d} style={{ 
            background: 'var(--bg-accent)', borderBottom: '2px solid var(--border)', borderLeft: '1px solid var(--border)',
            padding: '0.75rem', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem'
          }}>{d}</div>
        ))}

        {HOURS.map((h, hi) => (
          <div key={h} style={{ display: 'contents' }}>
            <div style={{ 
              padding: '1rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right', 
              borderBottom: '1px solid var(--border)', background: 'var(--bg-accent)' 
            }}>
              {h}:00
            </div>
            {DAYS.map((d, di) => {
              const cell = matrix[di][hi]
              return (
                <div key={d} style={{ 
                  padding: '0.5rem', minHeight: '60px', borderBottom: '1px solid var(--border)', 
                  borderLeft: '1px solid var(--border)', background: cell.hasConflict ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-secondary)',
                  display: 'flex', flexDirection: 'column', gap: '0.25rem', justifyContent: 'center', alignItems: 'center'
                }}>
                  {cell.count > 0 && (
                    <div style={{ 
                      width: '32px', height: '32px', borderRadius: '50%', 
                      background: cell.hasConflict ? 'var(--criminal)' : 'var(--navy)',
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.85rem', fontWeight: 700, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      {cell.count}
                    </div>
                  )}
                  {cell.hasConflict && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--criminal)', fontWeight: 700, textTransform: 'uppercase' }}>Conflict</span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'var(--navy)' }} />
          <span>Optimal Allocation</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'var(--criminal)' }} />
          <span>Resource Overlap Detected</span>
        </div>
      </div>
    </div>
  )
}
