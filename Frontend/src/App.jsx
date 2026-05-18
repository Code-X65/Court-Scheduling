import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { PreferencesProvider } from './context/PreferencesContext.jsx'
import { useToastController, ToastContainer } from './components/Toast.jsx'
import Navbar from './components/Navbar.jsx'
import Sidebar from './components/Sidebar.jsx'

// Lazy loading page components
const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px' }}>
    <span className="spinner" style={{ width: '40px', height: '40px' }} />
  </div>
)

const Login = lazy(() => import('./pages/Login.jsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Cases = lazy(() => import('./pages/Cases.jsx'))
const Judges = lazy(() => import('./pages/Judges.jsx'))
const Courtrooms = lazy(() => import('./pages/Courtrooms.jsx'))
const Schedule = lazy(() => import('./pages/Schedule.jsx'))
const AIInsights = lazy(() => import('./pages/AIInsights.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))
const Users = lazy(() => import('./pages/Users.jsx'))
const Calendar = lazy(() => import('./pages/Calendar.jsx'))
const Reports = lazy(() => import('./pages/Reports.jsx'))
const Settings = lazy(() => import('./pages/Settings.jsx'))
const GapAnalysis = lazy(() => import('./pages/GapAnalysis.jsx'))

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

function AppShell() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')
  const location = useLocation()
  const isLogin = location.pathname === '/login'
  const { toasts } = useToastController()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light')

  return (
    <div className="layout-shell">
      <ToastContainer toasts={toasts} />
      {!isLogin && <Sidebar theme={theme} />}
      <div className="main-content">
        {!isLogin && <Navbar theme={theme} toggleTheme={toggleTheme} />}
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard"  element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/cases"      element={<RequireAuth><Cases /></RequireAuth>} />
            <Route path="/judges"     element={<RequireAuth><Judges /></RequireAuth>} />
            <Route path="/courtrooms" element={<RequireAuth><Courtrooms /></RequireAuth>} />
            <Route path="/schedule"   element={<RequireAuth><Schedule /></RequireAuth>} />
            <Route path="/ai-insights" element={<RequireAuth><AIInsights /></RequireAuth>} />
            <Route path="/calendar"    element={<RequireAuth><Calendar /></RequireAuth>} />
            <Route path="/reports"     element={<RequireAuth><Reports /></RequireAuth>} />
            <Route path="/gap-analysis" element={<RequireAuth><GapAnalysis /></RequireAuth>} />
            <Route path="/settings"    element={<RequireAuth><Settings /></RequireAuth>} />
            <Route path="/profile"     element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="/users"       element={<RequireAuth><Users /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PreferencesProvider>
          <AppShell />
        </PreferencesProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
