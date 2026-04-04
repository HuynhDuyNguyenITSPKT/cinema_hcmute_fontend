import axiosClient from '../api/axiosClient'

const authService = {
  login: async (username, password) => {
    return axiosClient.post('/auth/login', { username, password })
  },

  register: async (payload) => {
    return axiosClient.post('/auth/register', payload)
  },

  verifyOtp: async (email, otp) => {
    return axiosClient.post('/auth/verify-otp', { email, otp })
  },

  resendOtp: async (email) => {
    return axiosClient.post('/auth/resend-otp', null, {
      params: { email },
    })
  },

  forgotPassword: async (email) => {
    return axiosClient.post('/auth/forgot-password', { email })
  },

  resetPassword: async (email, otp, newPassword) => {
    return axiosClient.post('/auth/reset-password', { email, otp, newPassword })
  },

  changePassword: async (oldPassword, newPassword) => {
    return axiosClient.post('/auth/change-password', { oldPassword, newPassword })
  },

  getMe: async () => {
    return axiosClient.get('/auth/me')
  },

  exchangeOAuthCode: async (code) => {
    return axiosClient.post('/auth/oauth2/exchange', { code })
  },

  logout: async (refreshToken) => {
    return axiosClient.post('/auth/logout', { token: refreshToken })
  },

  refreshToken: async (refreshToken) => {
    return axiosClient.post('/auth/refresh', { token: refreshToken })
  },
}

export default authService