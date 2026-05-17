import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

// 24 hour session TTL
const SESSION_TTL = 24 * 60 * 60 * 1000 

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    const authData = localStorage.getItem('auth_session')
    if (authData) {
      try {
        const { user, timestamp } = JSON.parse(authData)
        if (Date.now() - timestamp < SESSION_TTL) {
          setUser(user)
        } else {
          localStorage.removeItem('auth_session')
        }
      } catch (e) {
        localStorage.removeItem('auth_session')
      }
    }
    setInitializing(false)
  }, [])

  const login = (userData) => {
    const session = {
      user: userData,
      timestamp: Date.now()
    }
    localStorage.setItem('auth_session', JSON.stringify(session))
    setUser(userData)
    // sessionStorage used by Profile.jsx and the api client interceptor
    sessionStorage.setItem('username', userData.username)
    sessionStorage.setItem('role', userData.role)
  }

  const logout = () => {
    localStorage.removeItem('auth_session')
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
