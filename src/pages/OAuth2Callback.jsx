import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { notifyError } from '../utils/notify'
import { getDefaultPathByRole } from '../utils/roleRoute'

const oauthCodeExchangeStatus = new Map()

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

function resolveAuthorizationCode(params) {
  return params.get('code') || ''
}

function OAuth2Callback() {
  const location = useLocation()
  const navigate = useNavigate()
  const { loginWithOAuthCode, user } = useAuth()

  useEffect(() => {
    const params = getOAuthParams(location.search, location.hash)
    const callbackError = resolveOAuthError(params)
    const authorizationCode = resolveAuthorizationCode(params)

    if (callbackError) {
      notifyError(callbackError, 'Đăng nhập Google thất bại')
      navigate('/login', {
        replace: true,
        state: { error: callbackError },
      })
      return
    }

    if (authorizationCode) {
      const exchangeStatus = oauthCodeExchangeStatus.get(authorizationCode)

      if (exchangeStatus === 'in-flight') {
        return
      }

      if (exchangeStatus === 'done') {
        const rolePath = getDefaultPathByRole(user?.role)
        navigate(rolePath, { replace: true })
        return
      }

      oauthCodeExchangeStatus.set(authorizationCode, 'in-flight')

      loginWithOAuthCode(authorizationCode)
        .then((profile) => {
          oauthCodeExchangeStatus.set(authorizationCode, 'done')
          const rolePath = getDefaultPathByRole(profile?.role)
          navigate(rolePath, { replace: true })
        })
        .catch((err) => {
          oauthCodeExchangeStatus.delete(authorizationCode)
          const message = err?.message || 'Đăng nhập Google thất bại.'
          notifyError(message, 'Đăng nhập Google thất bại')
          navigate('/login', { replace: true, state: { error: message } })
        })
    } else {
      const message = 'Không nhận được mã xác thực từ Google.'
      notifyError(message, 'Đăng nhập Google thất bại')
      navigate('/login', { replace: true, state: { error: message } })
    }
  }, [location.search, location.hash, loginWithOAuthCode, navigate, user?.role])

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 bg-dark text-white">
      <h2 className="h4 mb-0">Đang xác thực đăng nhập Google...</h2>
    </div>
  )
}

export default OAuth2Callback
