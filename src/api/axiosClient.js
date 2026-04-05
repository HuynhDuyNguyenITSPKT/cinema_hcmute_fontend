import axios from 'axios'
import { clearTokens, getAccessToken } from '../utils/tokenStorage'

let isRedirectingToLogin = false

function normalizeMessage(message) {
  return typeof message === 'string' ? message.trim() : ''
}

function normalizeForMatch(message) {
  const normalizedMessage = normalizeMessage(message).toLowerCase()

  if (!normalizedMessage) {
    return ''
  }

  return normalizedMessage
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\?/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isLockedAccountMessage(message) {
  const normalizedMessage = normalizeForMatch(message)

  if (!normalizedMessage) {
    return false
  }

  return (
    normalizedMessage.includes('lock') ||
    normalizedMessage.includes('khoa') ||
    normalizedMessage.includes('khóa') ||
    normalizedMessage.includes('disabled') ||
    normalizedMessage.includes('blocked') ||
    normalizedMessage.includes('ban')
  )
}

function isUnverifiedUserMessage(message) {
  const rawMessage = normalizeMessage(message).toLowerCase()
  const normalizedMessage = normalizeForMatch(message)

  if (!rawMessage && !normalizedMessage) {
    return false
  }

  return (
    rawMessage.includes('chưa xác thực') ||
    rawMessage.includes('chua xac thuc') ||
    rawMessage.includes('không xác thực') ||
    rawMessage.includes('khong xac thuc') ||
    rawMessage.includes('not verified') ||
    rawMessage.includes('unverified') ||
    rawMessage.includes('unauthenticated') ||
    /ch[a-z]* xac th[a-z]*/.test(normalizedMessage)
  )
}

function isVerifyTokenRequest(requestUrl) {
  if (typeof requestUrl !== 'string') {
    return false
  }

  return (
    requestUrl.includes('/auth/me') ||
    requestUrl.includes('/auth/verify-token') ||
    requestUrl.includes('/auth/refresh')
  )
}

function forceLogoutAndRedirect(errorMessage) {
  if (typeof window === 'undefined') {
    return
  }

  clearTokens()

  if (isRedirectingToLogin) {
    return
  }

  isRedirectingToLogin = true

  const fallbackMessage = 'Tài khoản đã bị khóa hoặc phiên đăng nhập đã hết hiệu lực.'
  const message = normalizeMessage(errorMessage) || fallbackMessage
  const loginUrl = `/login?error=${encodeURIComponent(message)}`

  if (`${window.location.pathname}${window.location.search}` !== loginUrl) {
    window.location.replace(loginUrl)
    return
  }

  isRedirectingToLogin = false
}

function shouldForceLogoutByAuthFailure({ status, requestUrl, message, isPayloadFailure }) {
  const hasAccessToken = Boolean(getAccessToken())

  if (!hasAccessToken) {
    return false
  }

  const verifyRequest = isVerifyTokenRequest(requestUrl)
  const blockedMessage = isLockedAccountMessage(message) || isUnverifiedUserMessage(message)

  return (
    status === 423 ||
    blockedMessage ||
    (verifyRequest && (status === 401 || status === 403 || isPayloadFailure))
  )
}

function buildCustomError(error) {
  const status = error.response?.status
  const responseData = error.response?.data

  if (responseData) {
    if (typeof responseData === 'string') {
      const responseMessage = normalizeMessage(responseData)
      return {
        success: false,
        message: responseMessage || (status ? `Yêu cầu thất bại (${status}).` : 'Yêu cầu thất bại.'),
        data: null,
      }
    }

    if (typeof responseData === 'object') {
      const responseMessage = normalizeMessage(
        responseData.message || responseData.error || responseData.detail || responseData.title
      )

      return {
        ...responseData,
        success: responseData.success ?? false,
        message: responseMessage || (status ? `Yêu cầu thất bại (${status}).` : 'Yêu cầu thất bại.'),
      }
    }
  }

  const axiosMessage = normalizeMessage(error?.message)

  if (status) {
    return {
      success: false,
      message: axiosMessage || `Yêu cầu thất bại (${status}).`,
    }
  }

  if (axiosMessage.toLowerCase().includes('network')) {
    return {
      success: false,
      message: 'Không thể kết nối đến máy chủ. Kiểm tra backend đang chạy và cấu hình CORS.',
    }
  }

  return {
    success: false,
    message: axiosMessage || 'Không thể kết nối đến máy chủ.',
  }
}

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

axiosClient.interceptors.request.use((config) => {
  const token = getAccessToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

axiosClient.interceptors.response.use(
  (response) => {
    const payload = response.data

    if (payload && payload.success === false) {
      const backendMessage = normalizeMessage(payload?.message)
      const requestUrl = response.config?.url
      const shouldForceLogout = shouldForceLogoutByAuthFailure({
        status: response.status,
        requestUrl,
        message: backendMessage,
        isPayloadFailure: true,
      })

      if (shouldForceLogout) {
        forceLogoutAndRedirect(backendMessage)
      }

      return Promise.reject(payload)
    }

    return payload
  },
  (error) => {
    const status = error.response?.status
    const customError = buildCustomError(error)

    const backendMessage = normalizeMessage(customError?.message)
    const requestUrl = error.config?.url
    const shouldForceLogout = shouldForceLogoutByAuthFailure({
      status,
      requestUrl,
      message: backendMessage,
      isPayloadFailure: false,
    })

    if (shouldForceLogout) {
      forceLogoutAndRedirect(backendMessage)
    }

    return Promise.reject(customError)
  }
)

export default axiosClient