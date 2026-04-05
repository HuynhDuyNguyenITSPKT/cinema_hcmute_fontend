import { createContext, useContext, useEffect, useState } from 'react'
import authService from '../services/authService'
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '../utils/tokenStorage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    const initializeAuth = async () => {
      const accessToken = getAccessToken()

      if (!accessToken) {
        setIsInitializing(false)
        return
      }

      try {
        const profileResponse = await authService.getMe()
        setUser(profileResponse?.data || null)
      } catch {
        clearTokens()
        setUser(null)
      } finally {
        setIsInitializing(false)
      }
    }

    initializeAuth()
  }, [])

  const login = async ({ username, password }) => {
    const loginResponse = await authService.login(username, password)
    const tokenData = loginResponse?.data

    if (!tokenData?.accessToken) {
      throw new Error(loginResponse?.message || 'Đăng nhập thất bại.')
    }

    setTokens(tokenData)

    const profileResponse = await authService.getMe()
    const profile = profileResponse?.data

    if (!profile) {
      clearTokens()
      throw new Error('Không thể lấy thông tin người dùng.')
    }

    setUser(profile)
    return profile
  }

  const loginWithTokens = async (accessToken, refreshToken) => {
    setTokens({ accessToken, refreshToken })

    const profileResponse = await authService.getMe()
    const profile = profileResponse?.data

    if (!profile) {
      clearTokens()
      throw new Error('Không thể lấy thông tin người dùng.')
    }

    setUser(profile)
    return profile
  }

  const loginWithOAuthCode = async (code) => {
    const exchangeResponse = await authService.exchangeOAuthCode(code)
    const tokenData = exchangeResponse?.data

    if (!tokenData?.accessToken) {
      throw new Error(exchangeResponse?.message || 'Đổi mã đăng nhập Google thất bại.')
    }

    return loginWithTokens(tokenData.accessToken, tokenData.refreshToken)
  }

  const refreshProfile = async () => {
    const profileResponse = await authService.getMe()
    const profile = profileResponse?.data || null
    setUser(profile)
    return profile
  }

  const setCurrentUser = (profile) => {
    setUser(profile)
  }

  const logout = async () => {
    const refreshToken = getRefreshToken()

    try {
      if (refreshToken) {
        await authService.logout(refreshToken)
      }
    } catch {
      // Ignore logout API error and still clear local session.
    } finally {
      clearTokens()
      setUser(null)
    }
  }

  const value = {
    user,
    isAuthenticated: Boolean(user),
    isInitializing,
    login,
    loginWithTokens,
    loginWithOAuthCode,
    refreshProfile,
    setCurrentUser,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
