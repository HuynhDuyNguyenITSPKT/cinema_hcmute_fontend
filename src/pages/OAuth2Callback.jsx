import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { notifyError } from '../utils/notify'
import { getDefaultPathByRole } from '../utils/roleRoute'

function getOAuthParams(search, hash) {
  const params = new URLSearchParams(search)

  if (hash) {
    const normalizedHash = hash.startsWith('#') ? hash.slice(1) : hash
    const hashParams = new URLSearchParams(normalizedHash)

    hashParams.forEach((value, key) => {
      if (!params.has(key)) {
        params.set(key, value)
      }
    })
  }

  return params
}

function resolveOAuthError(params) {
  const errorMessage =
    params.get('error_description') ||
    params.get('error') ||
    params.get('message') ||
    ''

  return typeof errorMessage === 'string' ? errorMessage.trim() : ''
}

function resolveAccessToken(params) {
  return (
    params.get('accessToken') ||
    params.get('access_token') ||
    params.get('token') ||
    ''
  )
}

function resolveRefreshToken(params) {
  return (
    params.get('refreshToken') ||
    params.get('refresh_token') ||
    ''
  )
}

function OAuth2Callback() {
  const location = useLocation()
  const navigate = useNavigate()
  const { loginWithTokens } = useAuth()

  useEffect(() => {
    const params = getOAuthParams(location.search, location.hash)
    const callbackError = resolveOAuthError(params)
    const accessToken = resolveAccessToken(params)
    const refreshToken = resolveRefreshToken(params)

    if (callbackError) {
      notifyError(callbackError, 'Đăng nhập Google thất bại')
      navigate('/login', {
        replace: true,
        state: { error: callbackError },
      })
      return
    }

    if (accessToken) {
      loginWithTokens(accessToken, refreshToken)
        .then((profile) => {
          const rolePath = getDefaultPathByRole(profile?.role)
          navigate(rolePath, { replace: true })
        })
        .catch((err) => {
          const message = err?.message || 'Đăng nhập Google thất bại.'
          notifyError(message, 'Đăng nhập Google thất bại')
          navigate('/login', { replace: true, state: { error: message } })
        })
    } else {
      const message = 'Không nhận được access token từ Google.'
      notifyError(message, 'Đăng nhập Google thất bại')
      navigate('/login', { replace: true, state: { error: message } })
    }
  }, [location.search, location.hash, loginWithTokens, navigate])

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 bg-dark text-white">
      <h2 className="h4 mb-0">Đang xác thực đăng nhập Google...</h2>
    </div>
  )
}

export default OAuth2Callback
