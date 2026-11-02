/// <reference types="vite/client" />
import axios from 'axios'
import { validateUploadSize } from '../constants/uploadLimits'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor — reject oversized uploads early, attach access token
apiClient.interceptors.request.use(
  (config) => {
    if (config.data instanceof FormData) {
      for (const value of config.data.values()) {
        const message = value instanceof File ? validateUploadSize(value) : null
        if (message) {
          return Promise.reject(Object.assign(new Error(message), { response: { status: 413, data: { message } } }))
        }
      }
    }
    const token = localStorage.getItem('admin_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Track whether a token refresh is in progress to avoid parallel refresh loops
let isRefreshing = false
type PendingRequest = { resolve: (token: string) => void; reject: (error: unknown) => void }
let pendingRequests: PendingRequest[] = []

function onRefreshed(newToken: string) {
  pendingRequests.forEach(({ resolve }) => resolve(newToken))
  pendingRequests = []
}

function onRefreshFailed(error: unknown) {
  pendingRequests.forEach(({ reject }) => reject(error))
  pendingRequests = []
}

function redirectToLogin() {
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_refresh_token')
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

/** Auth endpoints answer 401 for wrong credentials; that is not an expired session. */
function isAuthEndpoint(url?: string) {
  return !!url && /\/auth\/(login|refresh|logout)/.test(url)
}

// Response interceptor — retry with refreshed token on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint(originalRequest.url)) {
      const refreshToken = localStorage.getItem('admin_refresh_token')

      if (!refreshToken) {
        redirectToLogin()
        return Promise.reject(error)
      }

      if (isRefreshing) {
        // Queue the request until refresh completes
        return new Promise((resolve, reject) => {
          pendingRequests.push({
            resolve: (newToken: string) => {
              originalRequest.headers.Authorization = `Bearer ${newToken}`
              resolve(apiClient(originalRequest))
            },
            reject,
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        })

        const newAccessToken = response.data.accessToken
        const newRefreshToken = response.data.refreshToken

        localStorage.setItem('admin_token', newAccessToken)
        if (newRefreshToken) {
          localStorage.setItem('admin_refresh_token', newRefreshToken)
        }

        window.dispatchEvent(
          new CustomEvent('ilm-admin-token-refreshed', { detail: { accessToken: newAccessToken } }),
        )

        onRefreshed(newAccessToken)
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        onRefreshFailed(refreshError)
        redirectToLogin()
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
