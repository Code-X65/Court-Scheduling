import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Navbar({ theme, toggleTheme, toggleSidebar }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const username = user?.username || 'Admin'
  const role     = user?.role || 'admin'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="navbar">
      <nav aria-label="Main navigation" style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="navbar-left">
        <button 
          className="btn-icon mobile-menu-btn" 
          onClick={toggleSidebar}
          aria-label="Toggle Menu"
        >
          ☰
        </button>
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="Search cases, judges..." 
            className="form-input search-input" 
          />
        </div>
      </div>

      <div className="navbar-right">
        <button 
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        <div className="nav-user-info">
          <NavLink to="/profile" className="nav-username" aria-label="View user profile">
            {username}
          </NavLink>
          <div className="nav-role" aria-hidden="true">
            {role}
          </div>
        </div>
        
        <div className="nav-divider" aria-hidden="true" />

        <button 
          onClick={handleLogout} 
          className="btn-signout"
          aria-label="Sign out of system"
        >
          Sign Out
        </button>
      </div>
      </nav>
    </header>
  )
}
