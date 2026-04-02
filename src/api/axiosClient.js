import axios from 'axios'
import { getAccessToken } from '../utils/tokenStorage'

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
      return Promise.reject(payload)
    }

    return payload
  },
  (error) => {
    const customError = error.response?.data || {
      success: false,
      message: 'Không thể kết nối đến máy chủ.',
    }

    return Promise.reject(customError)
  }
)

export default axiosClient