import { createContext, useContext, useState, useEffect } from 'react'

const PreferencesContext = createContext()

export function PreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(() => {
    const saved = localStorage.getItem('court_bridge_prefs')
    return saved ? JSON.parse(saved) : {
      dashboardWidgets: ['total_cases', 'pending_cases', 'scheduled_this_week', 'upcoming_hearings', 'workload_chart'],
      sidebarCollapsed: false,
      compactView: false,
      notifications: true
    }
  })

  useEffect(() => {
    localStorage.setItem('court_bridge_prefs', JSON.stringify(preferences))
  }, [preferences])

  const updatePreference = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  return (
    <PreferencesContext.Provider value={{ preferences, updatePreference }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export const usePreferences = () => useContext(PreferencesContext)
