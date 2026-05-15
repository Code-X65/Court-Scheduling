import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useToastController, ToastContainer } from './components/Toast.jsx'
import Navbar from './components/Navbar.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Cases from './pages/Cases.jsx'
import Judges from './pages/Judges.jsx'
import Courtrooms from './pages/Courtrooms.jsx'
import Schedule from './pages/Schedule.jsx'

function RequireAuth({ children }) {
  const auth = sessionStorage.getItem('auth')
  const location = useLocation()
  if (!auth) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

function AppShell() {
  const location = useLocation()
  const isLogin = location.pathname === '/login'
  const { toasts } = useToastController()

  return (
    <>
      <ToastContainer toasts={toasts} />
      {!isLogin && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard"  element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/cases"      element={<RequireAuth><Cases /></RequireAuth>} />
        <Route path="/judges"     element={<RequireAuth><Judges /></RequireAuth>} />
        <Route path="/courtrooms" element={<RequireAuth><Courtrooms /></RequireAuth>} />
        <Route path="/schedule"   element={<RequireAuth><Schedule /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
