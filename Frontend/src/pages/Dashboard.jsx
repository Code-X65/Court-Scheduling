import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client.js'

const STAT_CONFIG = [
  { key: 'total_cases',        label: 'Total Cases',        icon: '⚖', link: '/cases',            color: '#0B1F3A' },
  { key: 'pending_cases',      label: 'Pending Cases',      icon: '⏳', link: '/cases?status=pending', color: '#B7770D' },
  { key: 'scheduled_this_week',label: 'Scheduled This Week',icon: '📅', link: '/schedule',         color: '#1A5276' },
  { key: 'total_judges',       label: 'Active Judges',      icon: '👨‍⚖️', link: '/judges',           color: '#1D7A4E' },
  { key: 'total_courtrooms',   label: 'Active Courtrooms',  icon: '🏛', link: '/courtrooms',       color: '#5B2C82' },
]

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    client.get('/dashboard/stats')
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const formatDate = (dt) => {
    if (!dt) return 'Never'
    return new Date(dt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-header-sub">System overview — {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {STAT_CONFIG.map(({ key, label, icon, link, color }, i) => (
          <button
            key={key}
            onClick={() => navigate(link)}
            className="card"
            style={{
              padding: '1.5rem', textAlign: 'left', border: 'none', cursor: 'pointer',
              transition: 'transform 160ms, box-shadow 160ms',
              animationDelay: `${i * 60}ms`,
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
            onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
          >
            <div style={{ fontSize: '1.6rem', marginBottom: '0.75rem' }}>{icon}</div>
            {loading ? (
              <div className="skeleton" style={{ width: '60px', height: '2rem', marginBottom: '0.5rem' }} />
            ) : (
              <div style={{ fontSize: '2rem', fontFamily: "'Libre Baskerville', serif", fontWeight: 700, color, lineHeight: 1, marginBottom: '0.35rem' }}>
                {stats?.[key] ?? '—'}
              </div>
            )}
            <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {label}
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color, fontWeight: 500 }}>View →</div>
          </button>
        ))}
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
