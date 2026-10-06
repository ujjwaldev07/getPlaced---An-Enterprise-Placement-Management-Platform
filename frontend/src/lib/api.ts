import axios from 'axios'

const TOKEN_KEY = 'getplaced_token'

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export const saveSession = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch (e) {
    console.error('Failed to save session token', e)
  }
}

export const clearSession = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch (e) {
    console.error('Failed to clear session token', e)
  }
}

export const hasSession = (): boolean => {
  return !!getToken()
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3050/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach Bearer token to all outgoing requests if available
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

// Centralized response interceptor for handling 401s and cleaning up stale sessions
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const url = error?.config?.url || ''

    // If a protected resource returns 401 (excluding deliberate login attempts), clear stale session
    if (status === 401 && !url.includes('/auth/login')) {
      if (getToken()) {
        clearSession()
        window.dispatchEvent(new CustomEvent('getplaced:session_expired'))
      }
    }

    return Promise.reject(error)
  }
)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const response = isRecord(error) && isRecord(error.response) ? error.response : undefined
  const data = response && isRecord(response.data) ? response.data : undefined
  if (typeof data?.message === 'string' && data.message) {
    return data.message
  }
  if (typeof data?.error === 'string' && data.error) {
    return data.error
  }
  if (isRecord(error) && error.message === 'Network Error') {
    return 'Unable to connect to the server. Please check your network connection.'
  }
  return fallback
}
