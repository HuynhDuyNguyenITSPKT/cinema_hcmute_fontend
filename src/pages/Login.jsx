import { GoogleLogin } from '@react-oauth/google'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getDefaultPathByRole } from '../utils/roleRoute'

function Login() {
  const [formData, setFormData] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const { login, loginWithGoogleToken, isAuthenticated, isInitializing, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!isInitializing && isAuthenticated) {
      const rolePath = getDefaultPathByRole(user?.role)
      const redirectPath = location.state?.from?.pathname || rolePath
      navigate(redirectPath, { replace: true })
    }
  }, [
    isAuthenticated,
    isInitializing,
    location.state,
    navigate,
    user?.role,
  ])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const profile = await login(formData)
      const rolePath = getDefaultPathByRole(profile?.role)
      const redirectPath = location.state?.from?.pathname || rolePath
      navigate(redirectPath, { replace: true })
    } catch (err) {
      const message = err?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLoginSuccess = async (credentialResponse) => {
    const tokenId = credentialResponse?.credential

    if (!tokenId) {
      setError('Không thể lấy token từ Google. Vui lòng thử lại.')
      return
    }

    setGoogleLoading(true)
    setError('')

    try {
      const profile = await loginWithGoogleToken(tokenId)
      const rolePath = getDefaultPathByRole(profile?.role)
      const redirectPath = location.state?.from?.pathname || rolePath
      navigate(redirectPath, { replace: true })
    } catch (err) {
      const message = err?.message || 'Đăng nhập Google thất bại. Vui lòng thử lại.'
      setError(message)
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleGoogleLoginError = () => {
    setError('Đăng nhập Google thất bại. Vui lòng thử lại.')
  }

  return (
    <main className="d-flex flex-column min-vh-100 bg-black">
      <header className="border-bottom border-secondary-subtle bg-black">
        <div className="container-fluid px-3 px-md-4 py-3 d-flex justify-content-between align-items-center">
          <Link className="text-decoration-none text-danger fw-bolder fs-4" to="/">
            MOVIE<span className="text-white">TICKER</span>
          </Link>
          <div className="d-flex align-items-center gap-2">
            <Link to="/" className="btn btn-outline-light btn-sm">
              Về trang chủ
            </Link>
          </div>
        </div>
      </header>

      <div className="container-fluid m-0 p-0 d-flex flex-column flex-md-row flex-grow-1">
        {/* Left Side: Image */}
        <div className="col-12 col-md-6 d-none d-md-flex flex-column justify-content-center align-items-center text-white p-5 position-relative" style={{ 
            background: 'url("https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=1200") center/cover no-repeat'
          }}>
          <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-75"></div>
          <div className="position-relative z-1 text-center">
            <h1 className="display-4 fw-bolder mb-3 text-danger">MOVIETICKER</h1>
            <p className="lead px-4">Khám phá thế giới điện ảnh và đặt vé xem phim nhanh chóng, tiện lợi nhất.</p>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="col-12 col-md-6 d-flex justify-content-center align-items-center p-4 p-sm-5 bg-dark">
          <div className="w-100 bg-dark p-4 p-md-5 rounded shadow" style={{ maxWidth: '500px', border: '1px solid #333' }}>
            <h2 className="text-white fw-bold mb-2">Đăng nhập</h2>
            <p className="text-secondary mb-4">Chào mừng bạn trở lại! Vui lòng đăng nhập để tiếp tục.</p>

            <form onSubmit={handleLogin}>
              <div className="mb-3">
                <label htmlFor="username" className="form-label text-light small fw-medium">Tên tài khoản</label>
                <input
                  id="username"
                  type="text"
                  className="form-control bg-black text-white border-secondary shadow-none"
                  value={formData.username}
                  onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                  placeholder="Nhập tên tài khoản"
                  required
                />
              </div>

              <div className="mb-3">
                <label htmlFor="password" className="form-label text-light small fw-medium">Mật khẩu</label>
                <input
                  id="password"
                  type="password"
                  className="form-control bg-black text-white border-secondary shadow-none"
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Nhập mật khẩu"
                  required
                />
              </div>

              <div className="d-flex justify-content-between align-items-center mb-4 mt-2">
                <div className="form-check">
                  <input type="checkbox" className="form-check-input" id="rememberMe" />
                  <label className="form-check-label text-secondary small" htmlFor="rememberMe">Ghi nhớ</label>
                </div>
                <Link to="/forgot-password" className="text-danger text-decoration-none small">Quên mật khẩu?</Link>
              </div>

              {error && <div className="alert alert-danger py-2 px-3 small">{error}</div>}
              
              <button type="submit" disabled={loading} className="btn btn-danger w-100 fw-bold py-2 mb-3">
                {loading ? 'Đang xử lý...' : 'Đăng nhập'}
              </button>
            </form>

            <div className="text-center mb-3">
              <span className="text-secondary small">hoặc</span>
            </div>

            {googleClientId ? (
              <div className="mb-4">
                <div className={`d-flex justify-content-center ${(loading || googleLoading) ? 'opacity-50 pe-none' : ''}`}>
                  <GoogleLogin
                    onSuccess={handleGoogleLoginSuccess}
                    onError={handleGoogleLoginError}
                    text="signin_with"
                    theme="outline"
                    shape="rectangular"
                    locale="vi"
                  />
                </div>
                {googleLoading && (
                  <p className="text-secondary small text-center mt-2 mb-0">Đang xác thực Google...</p>
                )}
              </div>
            ) : (
              <div className="alert alert-warning py-2 px-3 small mb-4" role="alert">
                Thiếu cấu hình VITE_GOOGLE_CLIENT_ID nên chưa thể đăng nhập bằng Google.
              </div>
            )}

            <p className="text-center text-secondary small mb-0">
              Chưa có tài khoản?{' '}
              <Link to="/register" className="text-danger text-decoration-none fw-bold">
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

export default Login