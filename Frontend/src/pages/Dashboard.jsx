import PageSEO from '../seo/PageSEO.jsx'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePreferences } from '../context/PreferencesContext.jsx'
import { useQuery } from '../hooks/useQuery.js'
import { Scale, Clock, CalendarCheck, ListOrdered, BarChart2 } from 'lucide-react'

const STAT_CONFIG = [
  { key: 'total_cases',         label: 'Total Cases',         Icon: Scale,         link: '/cases',               color: 'var(--navy)',           size: 'small' },
  { key: 'pending_cases',       label: 'Pending Cases',       Icon: Clock,         link: '/cases?status=pending', color: 'var(--commercial)',     size: 'small' },
  { key: 'scheduled_this_week', label: 'Scheduled This Week', Icon: CalendarCheck, link: '/schedule',            color: 'var(--civil)',          size: 'small' },
  { key: 'upcoming_hearings',   label: 'Upcoming Hearings',   Icon: ListOrdered,   type: 'list',                 color: 'var(--family)',         size: 'large' },
  { key: 'workload_chart',      label: 'Judge Workload',      Icon: BarChart2,     type: 'chart',                color: 'var(--constitutional)', size: 'large' },
]

export default function Dashboard() {
  const { preferences, updatePreference } = usePreferences()
  const { data: stats, loading } = useQuery('/dashboard/stats')
  const [isCustomizing, setIsCustomizing] = useState(false)
  const navigate = useNavigate()

  const visibleWidgets = preferences.dashboardWidgets || []

  const toggleWidget = (key) => {
    const next = visibleWidgets.includes(key) 
      ? visibleWidgets.filter(k => k !== key) 
      : [...visibleWidgets, key]
    updatePreference('dashboardWidgets', next)
  }

  const moveWidget = (key, dir) => {
    const idx = visibleWidgets.indexOf(key)
    if (idx === -1) return
    const next = [...visibleWidgets]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    [next[idx], next[target]] = [next[target], next[idx]]
    updatePreference('dashboardWidgets', next)
  }

  const formatDate = (dt) => {
    if (!dt) return 'Never'
    return new Date(dt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
  }

  return (
    <div className="page-content">
      <PageSEO title="Dashboard" description="Overview of court cases, judge assignments, and scheduling metrics." />
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-header-sub">System overview — {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <button className={`btn ${isCustomizing ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setIsCustomizing(!isCustomizing)}>
          {isCustomizing ? 'Finish Customizing' : '⚙ Customize Dashboard'}
        </button>
      </div>

      {isCustomizing && (
        <div className="card animate-in" style={{ padding: '1.25rem', marginBottom: '1.5rem', background: 'var(--bg-accent)', border: '1px dashed var(--navy)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem' }}>Select widgets to display on your dashboard:</div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {STAT_CONFIG.map(s => (
              <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={visibleWidgets.includes(s.key)} onChange={() => toggleWidget(s.key)} />
                {s.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Widget Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {visibleWidgets.map((key, i) => {
          const config = STAT_CONFIG.find(s => s.key === key)
          if (!config) return null
          
          const isLarge = config.size === 'large'
          
          return (
            <div
              key={key}
              className="card"
              style={{
                padding: '1.5rem', textAlign: 'left', 
                gridColumn: isLarge ? 'span 2' : 'auto',
                transition: 'transform 160ms, box-shadow 160ms',
                animationDelay: `${i * 60}ms`,
                position: 'relative',
                display: 'flex', flexDirection: 'column', gap: '0.75rem'
              }}
            >
              {isCustomizing && (
                <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', display: 'flex', gap: '0.25rem' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => moveWidget(key, -1)}>←</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => moveWidget(key, 1)}>→</button>
                  <button className="btn btn-sm" style={{ background: '#fef2f2', color: 'var(--criminal)' }} onClick={() => toggleWidget(key)}>✕</button>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ color: config.color }}>
                  {config.Icon && <config.Icon size={22} strokeWidth={1.8} />}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {config.label}
                </div>
              </div>

              {loading ? (
                <div className="skeleton" style={{ height: isLarge ? '120px' : '40px' }} />
              ) : config.type === 'chart' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stats?.workload_chart?.length > 0 ? (
                  stats.workload_chart.map((item, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                        <span>{item.judge_name}</span>
                        <span style={{ fontWeight: 600 }}>{item.hearings} hearings</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'var(--bg-accent)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min((item.hearings / (stats.workload_chart[0]?.hearings || 1)) * 100, 100)}%`,
                          height: '100%',
                          background: `hsl(${210 - i * 25}, 65%, 42%)`,
                          borderRadius: '3px'
                        }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '1rem 0', textAlign: 'center' }}>
                    No hearing data yet. Schedule cases to see workload.
                  </div>
                )}
              </div>
              ) : config.type === 'list' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {stats?.upcoming_hearings?.length > 0 ? (
              stats.upcoming_hearings.map((h, x) => (
                <div key={x} style={{ fontSize: '0.8rem', padding: '0.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                 <span style={{ fontWeight: 500 }}>{h.case_number || h.case_id}</span>
                  <span style={{ color: 'var(--text-muted)' }}>
                  {h.start_time ? new Date(h.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
                </span>
            </div>
            ))
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>
                No upcoming hearings scheduled.
              </div>
              )}
            </div>
              ) : (
                <>
                  <div style={{ fontSize: '2rem', fontFamily: "'Libre Baskerville', serif", fontWeight: 700, color: config.color, lineHeight: 1 }}>
                    {stats?.[key] ?? '—'}
                  </div>
                  {!isCustomizing && config.link && (
                    <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start', marginTop: 'auto' }} onClick={() => navigate(config.link)}>
                      View Details →
                    </button>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Last run */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Last Schedule Run
          </div>
          <div style={{ fontWeight: 500, color: 'var(--navy)' }}>
            {loading ? <span className="skeleton" style={{ width: '200px', display: 'inline-block' }} /> : formatDate(stats?.last_schedule_run)}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/schedule')}>
          Generate Schedule
        </button>
      </div>

      {/* Quick guide */}
      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Getting Started</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {[
            { step: '1', title: 'Add Judges', desc: 'Register judges with their specializations and available days.', link: '/judges' },
            { step: '2', title: 'Add Courtrooms', desc: 'Register courtrooms with their seating capacities.', link: '/courtrooms' },
            { step: '3', title: 'Register Cases', desc: 'Add pending cases and assign them to judges.', link: '/cases' },
            { step: '4', title: 'Generate Schedule', desc: 'Select a week and cases, then run the AI scheduler.', link: '/schedule' },
          ].map(({ step, title, desc, link }) => (
            <div key={step} className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: 'var(--navy)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
              }}>{step}</div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>{title}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{desc}</div>
                <button className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem' }} onClick={() => navigate(link)}>
                  Go →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
