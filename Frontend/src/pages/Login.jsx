import PageSEO from '../seo/PageSEO.jsx'
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import client from '../api/client.js'

export default function Login() {
  const { login, isAuthenticated } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const navigate = useNavigate()
  const [params] = useSearchParams()

  useEffect(() => {
    if (params.get('expired')) setError('Your session has expired. Please log in again.')
    if (isAuthenticated) navigate('/dashboard')
  }, [isAuthenticated])

  const isDemo = import.meta.env.VITE_DEMO_MODE === 'true'

  const handleSubmit = async (e) => {
  e.preventDefault()
  if (!username || !password) {
    setError('Please enter both username and password.')
    return
  }

  setLoading(true)
  setError('')

  try {
    if (isDemo) {
      // --- Demo / mock path ---
      await new Promise(r => setTimeout(r, 800))
      if (password.length < 4) throw new Error('Password too short.')
      let role = 'admin'
      if (username.toLowerCase().includes('judge')) role = 'judge'
      else if (username.toLowerCase().includes('clerk')) role = 'clerk'
      login({ username, role })
      sessionStorage.setItem('username', username)
      sessionStorage.setItem('role', role)
    } else {
      // --- Real API path ---
      const r       = await client.post('/auth/login', { username, password })
      const payload = r.data?.data || r.data
      const user    = payload?.user
      const token   = payload?.token

      if (!token) {
        setError('Login failed: no token received.')
        return
      }

      localStorage.setItem('access_token', token)
      login({
        username:  user.username,
        full_name: user.full_name,
        role:      user.role,
        token,
      })
    }
    navigate('/dashboard')
  } catch (err) {
    const detail = err.response?.data?.detail || err.response?.data?.error?.message || err.message
    setError(detail === 'Password too short.'
      ? 'Password must be at least 4 characters.'
      : 'Invalid username or password.')
  } finally {
    setLoading(false)
  }
}

  return (
    <>
      <PageSEO title="Sign In" description="Secure sign-in portal for Court Scheduling System." />
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--off-white)', padding: '2rem',
      }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Seal */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ display: 'block', margin: '0 auto 1rem' }}>
            <circle cx="32" cy="32" r="30" stroke="#0B1F3A" strokeWidth="2"/>
            <circle cx="32" cy="32" r="23" stroke="#C8922A" strokeWidth="1.5"/>
            <circle cx="32" cy="32" r="16" stroke="rgba(200,146,42,0.3)" strokeWidth="1"/>
            <path d="M32 12L34.4 20h8.3L36.1 24.7l2.6 8L32 28.3l-6.7 4.4 2.6-8L21.3 20h8.3L32 12z" fill="#C8922A"/>
            <rect x="20" y="40" width="24" height="2.5" rx="1.25" fill="rgba(11,31,58,0.5)"/>
            <rect x="24" y="44" width="16" height="2" rx="1" fill="rgba(11,31,58,0.3)"/>
          </svg>
          <h1 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '1.4rem', color: 'var(--navy)', marginBottom: '0.25rem' }}>
            Court Scheduling System
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Administrator Portal
          </p>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          {error && (
            <div className="info-box info-box-red animate-in" style={{ marginBottom: '1.25rem' }}>
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                className="form-input"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ marginTop: '0.5rem', justifyContent: 'center', padding: '0.75rem' }}
            >
              {loading ? <><span className="spinner spinner-white" /> Verifying...</> : 'Log In'}
            </button>
          </form>
        </div>

<p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
           Federal High Court · AI-Assisted Scheduling
         </p>
         
         {import.meta.env.VITE_DEMO_MODE === 'true' && (
           <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--amber-pale)', border: '1px solid var(--amber)', borderRadius: '4px' }}>
             <p style={{ fontSize: '0.75rem', color: 'var(--navy)', margin: 0 }}>
               <strong>Demo Mode:</strong> Use any username/password to login
             </p>
           </div>
         )}
       </div>
      </div>
    </>
  )
}
