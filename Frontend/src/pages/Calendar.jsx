import { useState, useEffect, useMemo, useCallback } from 'react'
import client from '../api/client.js'
import { toast } from '../components/Toast.jsx'
import { Badge } from '../components/StatusBadge.jsx'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday']
const HOURS = Array.from({ length: 9 }, (_, i) => i + 9) // 9 AM to 5 PM

export default function Calendar() {
  const [view, setView] = useState('weekly') // 'monthly' | 'weekly' | 'timeline' | 'daily'
  const [hearings, setHearings] = useState([])
  const [courtrooms, setCourtrooms] = useState([])
  const [selectedCourtroom, setSelectedCourtroom] = useState('all')
  const [loading, setLoading] = useState(true)
  const [draggedHearing, setDraggedHearing] = useState(null)

  useEffect(() => {
    Promise.all([
      client.get('/hearings'),
      client.get('/courtrooms')
    ]).then(([h, c]) => {
      setHearings(h.data)
      setCourtrooms(c.data)
    }).catch(() => toast('Failed to load calendar data.', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const filteredHearings = useMemo(() => 
    hearings.filter(h => selectedCourtroom === 'all' || h.courtroom_id === selectedCourtroom),
  [hearings, selectedCourtroom])

  const handleDragStart = useCallback((e, hearing) => {
    setDraggedHearing(hearing)
    e.dataTransfer.setData('hearingId', hearing.id)
    e.currentTarget.style.opacity = '0.4'
  }, [])

  const handleDragEnd = useCallback((e) => {
    e.currentTarget.style.opacity = '1'
  }, [])

  const handleDrop = useCallback(async (e, day, time) => {
    e.preventDefault()
    if (!draggedHearing) return

    const newHearing = { ...draggedHearing, scheduled_date: day, start_time: time }
    setHearings(prev => prev.map(h => h.id === draggedHearing.id ? newHearing : h))
    
    try {
      await client.patch(`/hearings/${draggedHearing.id}`, { 
        scheduled_date: day, 
        start_time: time 
      })
      toast(`Rescheduled to ${day} at ${time}`, 'success')
    } catch {
      toast('Failed to reschedule.', 'error')
    }
    setDraggedHearing(null)
  }, [draggedHearing])

  const handleDragOver = useCallback((e) => e.preventDefault(), [])

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Calendar</h1>
          <p className="page-header-sub">System-wide resource and hearing schedules</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div className="radio-group">
            {['monthly', 'weekly', 'timeline', 'daily'].map(v => (
              <label key={v} className="radio-pill" style={{ textTransform: 'capitalize' }}>
                <input type="radio" checked={view === v} onChange={() => setView(v)} />
                {v}
              </label>
            ))}
          </div>
          <select 
            className="form-select" 
            style={{ width: 'auto', minWidth: '180px' }}
            value={selectedCourtroom}
            onChange={e => setSelectedCourtroom(e.target.value)}
          >
            <option value="all">All Courtrooms</option>
            {courtrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: '1rem', minHeight: '640px', overflowX: 'auto', background: 'var(--bg-secondary)' }}>
        {view === 'weekly' && (
          <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(5, 1fr)', border: '1px solid var(--border)' }}>
            <div style={{ padding: '0.75rem', background: 'var(--bg-accent)', borderBottom: '2px solid var(--border)' }} />
            {DAYS.map(d => (
              <div key={d} style={{ 
                padding: '0.75rem', textAlign: 'center', fontWeight: 700, 
                background: 'var(--bg-accent)', borderBottom: '2px solid var(--border)', borderLeft: '1px solid var(--border)',
                color: 'var(--text-primary)'
              }}>
                {d}
              </div>
            ))}

            {HOURS.map(h => {
              const timeStr = `${String(h).padStart(2,'0')}:00`
              return (
                <div key={h} style={{ display: 'contents' }}>
                  <div style={{ 
                    padding: '1rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', 
                    textAlign: 'right', borderBottom: '1px solid var(--border)', background: 'var(--bg-accent)'
                  }}>
                    {timeStr}
                  </div>
                  {DAYS.map((d, di) => (
                    <div 
                      key={d} 
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, d, timeStr)}
                      style={{ 
                        padding: '0.5rem', minHeight: '80px', borderBottom: '1px solid var(--border)', 
                        borderLeft: '1px solid var(--border)', background: 'var(--bg-secondary)' 
                      }}
                    >
                      {filteredHearings
                        .filter(hr => hr.start_time.startsWith(String(h).padStart(2,'0')) && (new Date(hr.scheduled_date).getDay() === di + 1))
                        .map(hr => (
                          <div
                            key={hr.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, hr)}
                            onDragEnd={handleDragEnd}
                            style={{ 
                              padding: '0.4rem', borderRadius: '4px', background: 'var(--bg-accent)', 
                              border: '1px solid var(--border)', fontSize: '0.7rem', marginBottom: '0.4rem',
                              cursor: 'grab', color: 'var(--text-primary)'
                            }}
                          >
                            <strong>{hr.case_number}</strong>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{hr.courtroom_name}</div>
                          </div>
                        ))
                      }
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        {view === 'monthly' && <MonthlyView hearings={filteredHearings} />}
        {view === 'timeline' && <TimelineView hearings={filteredHearings} courtrooms={courtrooms} />}
        {view === 'daily' && <DailyView hearings={filteredHearings} />}
      </div>
    </div>
  )
}

function MonthlyView({ hearings }) {
  const [currentDate] = useState(new Date())
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)' }}>
      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
        <div key={d} style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 700, background: 'var(--bg-accent)', fontSize: '0.8rem' }}>{d}</div>
      ))}
      {blanks.map(i => <div key={`blank-${i}`} style={{ background: 'var(--bg-primary)', opacity: 0.5 }} />)}
      {days.map(d => {
        const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
        const dayHearings = hearings.filter(h => h.scheduled_date === dateStr)
        return (
          <div key={d} style={{ 
            minHeight: '100px', background: 'var(--bg-secondary)', padding: '0.5rem',
            display: 'flex', flexDirection: 'column', gap: '0.25rem', border: '1px solid var(--border)'
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{d}</div>
            {dayHearings.map(h => (
              <div key={h.id} style={{ 
                fontSize: '0.65rem', padding: '2px 4px', borderRadius: '2px', 
                background: 'var(--navy)', color: '#fff', overflow: 'hidden', whiteSpace: 'nowrap' 
              }}>
                {h.case_number}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function TimelineView({ hearings, courtrooms }) {
  const COLORS = ['#0B1F3A', '#1A5276', '#1D7A4E', '#B7770D', '#EF4444', '#C084FC']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem' }}>
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', paddingBottom: '0.75rem', background: 'var(--bg-accent)', borderRadius: '4px' }}>
        <div style={{ width: '150px', flexShrink: 0, fontWeight: 700, paddingLeft: '1rem', color: 'var(--text-primary)' }}>COURTROOM</div>
        <div style={{ display: 'flex', flex: 1 }}>
          {HOURS.map(h => (
            <div key={h} style={{ flex: 1, textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              {String(h).padStart(2,'0')}:00
            </div>
          ))}
        </div>
      </div>
      {courtrooms.map((c, ci) => (
        <div key={c.id} style={{ display: 'flex', alignItems: 'center', height: '64px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: '150px', flexShrink: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', paddingLeft: '1rem' }}>
            {c.name}
          </div>
          <div style={{ display: 'flex', flex: 1, position: 'relative', height: '70%', background: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border)' }}>
             {HOURS.map(h => <div key={h} style={{ flex: 1, borderRight: '1px solid var(--border)', opacity: 0.3 }} />)}
             {hearings.filter(h => h.courtroom_id === c.id).map(h => {
                const start = parseInt(h.start_time.split(':')[0])
                const left = ((start - 9) / 9) * 100
                const width = (1 / 9) * 100
                return (
                  <div key={h.id} style={{ 
                    position: 'absolute', left: `${left}%`, width: `${width - 0.5}%`, top: '10%', height: '80%',
                    background: COLORS[ci % COLORS.length], color: '#fff', borderRadius: '4px', fontSize: '0.65rem',
                    padding: '4px 8px', overflow: 'hidden', display: 'flex', alignItems: 'center', fontWeight: 600,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)', zIndex: 1
                  }}>
                    {h.case_number}
                  </div>
                )
             })}
          </div>
        </div>
      ))}
    </div>
  )
}

function DailyView({ hearings }) {
  const todayDate = new Date()
  const todayStr = todayDate.toISOString().split('T')[0]
  const todayHearings = hearings.filter(h => h.scheduled_date === todayStr)

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
       <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
            {todayDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </h2>
          <Badge value={`${todayHearings.length} Hearings Today`} />
       </div>
       {todayHearings.length === 0 ? (
         <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>No hearings scheduled for today.</div>
       ) : (
         todayHearings.map(h => (
           <div key={h.id} className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <div style={{ width: '80px', textAlign: 'center', borderRight: '2px solid var(--navy)', paddingRight: '1rem' }}>
                 <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy)' }}>{h.start_time}</div>
                 <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{h.duration_prediction}m</div>
              </div>
              <div style={{ flex: 1 }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{h.case_number}</span>
                    <Badge value={h.case_type} />
                 </div>
                 <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{h.title}</div>
                 <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    🏛 {h.courtroom_name} · 👨‍⚖️ {h.judge_name}
                 </div>
              </div>
              <button className="btn btn-secondary btn-sm">View Details</button>
           </div>
         ))
       )}
    </div>
  )
}
