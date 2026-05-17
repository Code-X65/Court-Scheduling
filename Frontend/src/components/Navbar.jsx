import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Navbar({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const username = user?.username || 'Admin'
  const role     = user?.role || 'admin'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header style={{
      background: 'var(--navbar-bg)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2.5rem',
      height: '64px',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '1rem' }}>🔍</span>
          <input 
            type="text" 
            placeholder="Search cases, judges, or files (Ctrl + /)" 
            className="form-input" 
            style={{ paddingLeft: '2.5rem', borderRadius: '20px', background: 'var(--bg-primary)', border: 'none' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <button 
          onClick={toggleTheme}
          style={{
            background: 'var(--bg-accent)', border: '1px solid var(--border)',
            width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', cursor: 'pointer', transition: 'all 0.3s ease'
          }}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <NavLink 
            to="/profile" 
            style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--navy)', textDecoration: 'none' }}
            aria-label="View user profile"
          >
            {username}
          </NavLink>
          <div style={{ fontSize: '0.7rem', color: 'var(--amber)', fontWeight: 700, textTransform: 'uppercase' }} aria-hidden="true">
            {role}
          </div>
        </div>
        
        <div style={{ width: '1px', height: '24px', background: 'var(--border)' }} aria-hidden="true" />

        <button 
          onClick={handleLogout} 
          style={{
            padding: '0.45rem 1rem', background: 'var(--off-white)', border: '1px solid var(--border)',
            color: 'var(--navy)', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
            transition: 'all 160ms',
          }}
          onMouseOver={e => { e.currentTarget.style.background = 'var(--criminal)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--criminal)' }}
          onMouseOut={e => { e.currentTarget.style.background = 'var(--off-white)'; e.currentTarget.style.color = 'var(--navy)'; e.currentTarget.style.borderColor = 'var(--border)' }}
          aria-label="Sign out of system"
        >
          Sign Out
        </button>
      </div>
    </header>
  )
}
