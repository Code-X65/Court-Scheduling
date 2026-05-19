import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import {
  LayoutDashboard, Scale, User, Building2, CalendarDays,
  Calendar, BarChart2, TrendingUp, Settings, Brain, Users
} from 'lucide-react'

const NAV_LINKS = [
  { to: '/dashboard',    label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/cases',        label: 'Cases',         icon: Scale },
  { to: '/judges',       label: 'Judges',        icon: User },
  { to: '/courtrooms',   label: 'Courtrooms',    icon: Building2 },
  { to: '/schedule',     label: 'Schedule',      icon: CalendarDays },
  { to: '/calendar',     label: 'Calendar',      icon: Calendar },
  { to: '/reports',      label: 'Reports',       icon: BarChart2 },
  { to: '/gap-analysis', label: 'Gap Analysis',  icon: TrendingUp },
]

const ADMIN_LINKS = [
  { to: '/settings',    label: 'Settings',    icon: Settings },
  { to: '/ai-insights', label: 'AI Insights', icon: Brain },
  { to: '/users',       label: 'Users',       icon: Users },
]

export default function Sidebar({ isOpen }) {
  const { user } = useAuth()
  const role = user?.role || 'admin'

  const filterLinks = (links) => links.filter(link => {
    if (role === 'admin' || role === 'superadmin') return true
    if (role === 'clerk') return ['/dashboard','/cases','/schedule','/calendar','/reports','/gap-analysis'].includes(link.to)
    if (role === 'judge') return ['/dashboard','/cases','/calendar','/gap-analysis'].includes(link.to)
    return false
  })

  return (
    <aside className={`sidebar no-print ${isOpen ? 'open' : ''}`}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--sidebar-border)' }}>
        <div style={{ fontFamily: "'Libre Baskerville', serif", fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem' }}>
          CourtBridge
        </div>
        <div style={{ color: 'var(--amber)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.2rem' }}>
          Scheduling Portal
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0' }}>
        <div className="sidebar-section">
          <div style={{ padding: '0 1.5rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Main Navigation
          </div>
          <nav className="sidebar-nav" role="navigation" aria-label="Main Navigation">
            {filterLinks(NAV_LINKS).map(link => (
              <SidebarLink key={link.to} {...link} />
            ))}
          </nav>
        </div>

        {(role === 'admin' || role === 'superadmin') && (
          <div className="sidebar-section" style={{ marginTop: '1.5rem' }}>
            <div style={{ padding: '0 1.5rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Administration
            </div>
            <nav className="sidebar-nav" role="navigation" aria-label="Administration">
              {ADMIN_LINKS.map(link => (
                <SidebarLink key={link.to} {...link} />
              ))}
            </nav>
          </div>
        )}
      </div>

      <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--sidebar-border)', background: 'var(--bg-accent)' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Version 1.2.0-stable</div>
      </div>
    </aside>
  )
}

function SidebarLink({ to, label, icon: Icon }) {
  const [hover, setHover] = useState(false)

  return (
    <NavLink
      to={to}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.5rem',
        color: isActive || hover ? 'var(--navy)' : 'var(--sidebar-text)',
        background: isActive ? 'var(--bg-accent)' : hover ? 'rgba(11,31,58,0.03)' : 'transparent',
        borderLeft: isActive ? '3px solid var(--amber)' : '3px solid transparent',
        fontSize: '0.875rem', fontWeight: isActive ? 600 : 400,
        textDecoration: 'none', transition: 'all 160ms'
      })}
    >
      <Icon size={17} strokeWidth={1.8} />
      {label}
    </NavLink>
  )
}