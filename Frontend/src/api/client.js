import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Inject Basic Auth from sessionStorage on every request
apiClient.interceptors.request.use((config) => {
  const creds = sessionStorage.getItem('auth')
  if (creds) {
    config.headers['Authorization'] = `Basic ${creds}`
  }
  return config
})

// On 401 — clear session and redirect to login
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem('auth')
      sessionStorage.removeItem('username')
      window.location.href = '/login?expired=1'
    }
    return Promise.reject(err)
  }
)

export default apiClient