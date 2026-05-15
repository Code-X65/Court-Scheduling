import { NavLink, useNavigate } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/dashboard',  label: 'Dashboard' },
  { to: '/cases',      label: 'Cases' },
  { to: '/judges',     label: 'Judges' },
  { to: '/courtrooms', label: 'Courtrooms' },
  { to: '/schedule',   label: 'Schedule' },
]

export default function Navbar() {
  const navigate = useNavigate()
  const username = sessionStorage.getItem('username') || 'Admin'

  const handleLogout = () => {
    sessionStorage.removeItem('auth')
    sessionStorage.removeItem('username')
    navigate('/login')
  }

  return (
    <nav style={{
      background: '#0B1F3A',
      borderBottom: '3px solid #C8922A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2.5rem',
      height: '60px',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <CourtSealIcon />
        <div>
          <div style={{ fontFamily: "'Libre Baskerville', serif", fontWeight: 700, color: '#fff', fontSize: '0.95rem', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
            Court Scheduling
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Administration System
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', height: '100%' }}>
        {NAV_LINKS.map(({ to, label }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            padding: '0 1rem', height: '100%', display: 'flex', alignItems: 'center',
            color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
            fontSize: '0.875rem', fontWeight: isActive ? 600 : 400,
            borderBottom: isActive ? '3px solid #C8922A' : '3px solid transparent',
            marginBottom: '-3px', transition: 'color 160ms, border-color 160ms', textDecoration: 'none',
          })}>
            {label}
          </NavLink>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
          Logged in as: <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{username}</span>
        </span>
        <button onClick={handleLogout} style={{
          padding: '0.35rem 0.9rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer',
          transition: 'background 160ms',
        }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        >
          Logout
        </button>
      </div>
    </nav>
  )
}

function CourtSealIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="15" stroke="#C8922A" strokeWidth="1.5"/>
      <circle cx="16" cy="16" r="11" stroke="rgba(200,146,42,0.4)" strokeWidth="1"/>
      <path d="M16 6L17.2 10h4l-3.3 2.4 1.3 4L16 14l-3.2 2.4 1.3-4L10.8 10h4L16 6z" fill="#C8922A"/>
      <rect x="10" y="20" width="12" height="1.5" rx="0.75" fill="rgba(200,146,42,0.7)"/>
      <rect x="12" y="22.5" width="8" height="1.5" rx="0.75" fill="rgba(200,146,42,0.5)"/>
    </svg>
  )
}
