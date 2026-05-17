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
    config.headers.Authorization = `Basic ${creds}`
  }
  // Optional: let callers append custom headers per-request via options.headers
  if (config.options?.headers) {
    Object.assign(config.headers, config.options.headers)
    delete config.options.headers
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
      sessionStorage.removeItem('role')
      window.location.href = '/login?expired=1'
    }
    return Promise.reject(err)
  }
)

/**
 * Unwrap a backend response envelope.
 * Backend returns: { success: true, data: ..., message: '...' }
 * or:               { success: false, error: { message, detail } }
 */
export function unwrap(response) {
  return response.data
}

export default apiClient