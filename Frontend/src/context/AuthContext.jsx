import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)
const SESSION_TTL = 24 * 60 * 60 * 1000

export function AuthProvider({ children }) {
  const [user, setUser]             = useState(null)
  const [initializing, setInit]     = useState(true)

  useEffect(() => {
    const authData = localStorage.getItem('auth_session')
    const token    = localStorage.getItem('access_token')
    if (authData && token) {
      try {
        const { user, timestamp } = JSON.parse(authData)
        if (Date.now() - timestamp < SESSION_TTL) {
          setUser(user)
        } else {
          localStorage.removeItem('auth_session')
          localStorage.removeItem('access_token')
        }
      } catch (e) {
        localStorage.removeItem('auth_session')
        localStorage.removeItem('access_token')
      }
    }
    setInit(false)
  }, [])

  const login = (userData) => {
    const session = { user: userData, timestamp: Date.now() }
    localStorage.setItem('auth_session', JSON.stringify(session))
    if (userData.token) {
      localStorage.setItem('access_token', userData.token)
    }
    sessionStorage.setItem('username', userData.username)
    sessionStorage.setItem('role',     userData.role)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('auth_session')
    localStorage.removeItem('access_token')
    sessionStorage.clear()
    setUser(null)
  }

  if (initializing) return null

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export function RoleGuard({ roles, children, fallback = null }) {
  const { user } = useAuth()
  if (!user || !roles.includes(user.role)) return fallback
  return children
}