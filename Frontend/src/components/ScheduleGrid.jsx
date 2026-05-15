import { useState } from 'react'
import client from '../api/client.js'
import { toast } from './Toast.jsx'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday']
const CASE_TYPE_COLORS = {
  criminal:      { bg: '#FDF2F2', border: '#C0392B', text: '#922B21' },
  civil:         { bg: '#EAF2FB', border: '#1A5276', text: '#154360' },
  family:        { bg: '#EAFAF1', border: '#1D7A4E', text: '#145A32' },
  commercial:    { bg: '#FEF9EC', border: '#B7770D', text: '#7D6608' },
  land:          { bg: '#F5EDE6', border: '#6D4C2B', text: '#4A2F1A' },
  constitutional:{ bg: '#F5EEFB', border: '#5B2C82', text: '#3F1F5A' },
}

// Convert "09:00" string to minutes from midnight
function toMin(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
const COURT_START = 9 * 60   // 540
const COURT_END   = 16 * 60  // 960
const LUNCH_START = 13 * 60
const LUNCH_END   = 14 * 60
const TOTAL_MINS  = COURT_END - COURT_START  // 420

// Row time labels every 30 min
const TIME_LABELS = []
for (let m = COURT_START; m <= COURT_END; m += 30) {
  const h = Math.floor(m / 60)
  const min = m % 60
  TIME_LABELS.push(`${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`)
}

const STATUS_OPTIONS = ['scheduled','completed','adjourned','cancelled']

export default function ScheduleGrid({ hearings, weekStart, onStatusChange }) {
  const [updatingId, setUpdatingId] = useState(null)

  // Group hearings by day-of-week index (0=Mon)
  const byDay = [[], [], [], [], []]
  hearings.forEach(h => {
    const d = new Date(h.scheduled_date)
    const dow = d.getDay() - 1 // Mon=0
    if (dow >= 0 && dow <= 4) byDay[dow].push(h)
  })

  const handleStatusChange = async (hearingId, newStatus) => {
    setUpdatingId(hearingId)
    try {
      await client.patch(`/hearings/${hearingId}/status`, { status: newStatus })
      toast(`Hearing status updated to ${newStatus}.`)
      onStatusChange && onStatusChange()
    } catch { toast('Failed to update status.', 'error') }
    finally { setUpdatingId(null) }
  }

  const GRID_HEIGHT = 560

  return (
    <div className="schedule-grid-wrapper" style={{ overflowX: 'auto' }}>
      {/* Print header */}
      <div className="print-header" style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontFamily: "'Libre Baskerville', serif" }}>Court Schedule — Week of {weekStart}</h2>
      </div>

      <div style={{ display: 'flex', minWidth: '800px' }}>
        {/* Time labels */}
        <div style={{ width: '52px', flexShrink: 0, paddingTop: '36px', position: 'relative', height: GRID_HEIGHT + 36 }}>
          {TIME_LABELS.map((t, i) => (
            <div key={t} style={{
              position: 'absolute',
              top: 36 + (i / (TIME_LABELS.length - 1)) * GRID_HEIGHT,
              right: 8,
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              transform: 'translateY(-50%)',
              lineHeight: 1,
            }}>{t}</div>
          ))}
        </div>

        {/* Day columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', flex: 1, gap: '1px', background: 'var(--border)' }}>
          {DAYS.map((day, di) => {
            const colDate = weekStart ? (() => {
              const d = new Date(weekStart)
              d.setDate(d.getDate() + di)
              return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
            })() : ''
            return (
              <div key={day} style={{ background: 'var(--white)', display: 'flex', flexDirection: 'column' }}>
                {/* Day header */}
                <div style={{
                  padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)',
                  background: 'var(--off-white)', height: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{day}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{colDate}</span>
                </div>

                {/* Grid body */}
                <div style={{ position: 'relative', height: GRID_HEIGHT, background: 'var(--off-white)' }}>
                  {/* Hour lines */}
                  {TIME_LABELS.map((_, i) => (
                    <div key={i} style={{
                      position: 'absolute',
                      top: (i / (TIME_LABELS.length - 1)) * GRID_HEIGHT,
                      left: 0, right: 0,
                      borderTop: i % 2 === 0 ? '1px solid var(--border)' : '1px dashed rgba(0,0,0,0.06)',
                    }} />
                  ))}

                  {/* Lunch block */}
                  <div style={{
                    position: 'absolute',
                    top: ((LUNCH_START - COURT_START) / TOTAL_MINS) * GRID_HEIGHT,
                    height: ((LUNCH_END - LUNCH_START) / TOTAL_MINS) * GRID_HEIGHT,
                    left: 0, right: 0,
                    background: 'rgba(11,31,58,0.05)',
                    borderTop: '1px dashed rgba(11,31,58,0.15)',
                    borderBottom: '1px dashed rgba(11,31,58,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Lunch Break
                    </span>
                  </div>

                  {/* Hearings */}
                  {byDay[di].map(h => {
                    const startMin = toMin(h.start_time)
                    const endMin   = toMin(h.end_time)
                    const top    = ((startMin - COURT_START) / TOTAL_MINS) * GRID_HEIGHT
                    const height = Math.max(((endMin - startMin) / TOTAL_MINS) * GRID_HEIGHT, 28)
                    const colors = CASE_TYPE_COLORS[h.case_type] || CASE_TYPE_COLORS.civil
                    const isUpdating = updatingId === h.id

                    return (
                      <div
                        key={h.id}
                        style={{
                          position: 'absolute',
                          top, left: 4, right: 4, height,
                          background: colors.bg,
                          border: `1.5px solid ${colors.border}`,
                          borderRadius: 4,
                          padding: '4px 6px',
                          overflow: 'hidden',
                          cursor: 'default',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                          transition: 'box-shadow 160ms',
                          zIndex: 1,
                        }}
                        onMouseOver={e => e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,0.14)'}
                        onMouseOut={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'}
                      >
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: colors.text, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {h.case_number}
                        </div>
                        {height > 40 && (
                          <div style={{ fontSize: '0.62rem', color: colors.text, opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                            {h.judge_name?.split(' ').pop()}
                          </div>
                        )}
                        {height > 55 && (
                          <div style={{ fontSize: '0.6rem', color: colors.text, opacity: 0.7 }}>{h.courtroom_name}</div>
                        )}
                        {height > 68 && (
                          <div style={{ marginTop: 3 }}>
                            <select
                              value={h.status}
                              onChange={e => handleStatusChange(h.id, e.target.value)}
                              disabled={isUpdating}
                              style={{
                                fontSize: '0.6rem', padding: '1px 3px', border: `1px solid ${colors.border}`,
                                borderRadius: 3, background: 'rgba(255,255,255,0.8)', color: colors.text, cursor: 'pointer',
                                width: '100%',
                              }}
                              onClick={e => e.stopPropagation()}
                            >
                              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                            </select>
                          </div>
                        )}
                        <div style={{ fontSize: '0.58rem', color: colors.text, opacity: 0.6, marginTop: 1 }}>
                          {h.start_time}–{h.end_time}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem', padding: '0.75rem', background: 'var(--off-white)', borderRadius: 6, border: '1px solid var(--border)' }}>
        {Object.entries(CASE_TYPE_COLORS).map(([type, colors]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: colors.bg, border: `1.5px solid ${colors.border}`, flexShrink: 0 }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
