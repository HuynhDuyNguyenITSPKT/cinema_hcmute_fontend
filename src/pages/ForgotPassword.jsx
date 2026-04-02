import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import authService from '../services/authService'
import { notifySuccess } from '../utils/notify'

function ForgotPassword() {
  const [step, setStep] = useState('request')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const navigate = useNavigate()

  const resetMessages = () => {
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    resetMessages()

    const normalizedEmail = email.trim()
    if (!normalizedEmail) {
      const message = 'Vui lòng nhập email.'
      setErrorMessage(message)
      return
    }

    setLoading(true)

    try {
      const response = await authService.forgotPassword(normalizedEmail)
      const message = response?.message || 'OTP đặt lại mật khẩu đã được gửi.'
      setEmail(normalizedEmail)
      setStep('reset')
      setSuccessMessage(message)
    } catch (err) {
      const message = err?.message || 'Không thể gửi OTP. Vui lòng thử lại.'
      setErrorMessage(message)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    resetMessages()

    if (!otp.trim()) {
      const message = 'Vui lòng nhập mã OTP.'
      setErrorMessage(message)
      return
    }

    if (newPassword.length < 3) {
      const message = 'Mật khẩu mới phải có ít nhất 3 ký tự.'
      setErrorMessage(message)
      return
    }

    if (newPassword !== confirmPassword) {
      const message = 'Mật khẩu xác nhận không khớp.'
      setErrorMessage(message)
      return
    }

    setLoading(true)

    try {
      const response = await authService.resetPassword(email.trim(), otp.trim(), newPassword)
      const message = response?.message || 'Đặt lại mật khẩu thành công.'
      setSuccessMessage(message)
      notifySuccess(message, { duration: 1700 })
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 1200)
    } catch (err) {
      const message = err?.message || 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.'
      setErrorMessage(message)
    } finally {
      setLoading(false)
    }
  }

  const handleResendForgotOtp = async () => {
    resetMessages()

    const normalizedEmail = email.trim()
    if (!normalizedEmail) {
      const message = 'Vui lòng nhập email trước khi gửi lại OTP.'
      setErrorMessage(message)
      return
    }

    setLoading(true)

    try {
      const response = await authService.forgotPassword(normalizedEmail)
      const message = response?.message || 'Đã gửi lại OTP đặt lại mật khẩu.'
      setSuccessMessage(message)
    } catch (err) {
      const message = err?.message || 'Không thể gửi lại OTP. Vui lòng thử lại.'
      setErrorMessage(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="d-flex min-vh-100 bg-black">
      <div className="container-fluid m-0 p-0 d-flex flex-column flex-md-row">
        <div
          className="col-12 col-md-6 d-none d-md-flex flex-column justify-content-center align-items-center text-white p-5 position-relative"
          style={{
            background:
              'url("https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&q=80&w=1200") center/cover no-repeat',
          }}
        >
          <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-75"></div>
          <div className="position-relative z-index-1 text-center">
            <h1 className="display-4 fw-bolder mb-3 text-danger">MOVIETICKER</h1>
            <p className="lead px-4">Khôi phục tài khoản nhanh chóng bằng email xác thực OTP.</p>
          </div>
        </div>

        <div className="col-12 col-md-6 d-flex justify-content-center align-items-center p-4 p-sm-5 bg-dark" style={{ minHeight: '100vh' }}>
          <div className="w-100 bg-dark p-4 p-md-5 rounded shadow" style={{ maxWidth: '500px', border: '1px solid #333' }}>
            {step === 'request' ? (
              <>
                <h2 className="text-white fw-bold mb-2">Quên mật khẩu</h2>
                <p className="text-secondary mb-4">Nhập email để nhận OTP đặt lại mật khẩu.</p>

                <form onSubmit={handleRequestOtp}>
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label text-light small fw-medium">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="form-control bg-black text-white border-secondary shadow-none"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@gmail.com"
                      required
                    />
                  </div>

                  {errorMessage ? <div className="alert alert-danger py-2 px-3 small">{errorMessage}</div> : null}
                  {successMessage ? <div className="alert alert-success py-2 px-3 small">{successMessage}</div> : null}

                  <button type="submit" disabled={loading} className="btn btn-danger w-100 fw-bold py-2 mt-2">
                    {loading ? 'Đang gửi OTP...' : 'Gửi OTP'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-white fw-bold mb-2">Đặt lại mật khẩu</h2>
                <p className="text-secondary mb-4">
                  OTP đã gửi tới email <span className="text-light">{email}</span>
                </p>

                <form onSubmit={handleResetPassword}>
                  <div className="mb-3">
                    <label htmlFor="verifyEmail" className="form-label text-light small fw-medium">
                      Email
                    </label>
                    <input
                      id="verifyEmail"
                      type="email"
                      className="form-control bg-black text-white border-secondary shadow-none"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="otp" className="form-label text-light small fw-medium">
                      Mã OTP
                    </label>
                    <input
                      id="otp"
                      type="text"
                      className="form-control bg-black text-white border-secondary shadow-none"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Nhập mã OTP"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="newPassword" className="form-label text-light small fw-medium">
                      Mật khẩu mới
                    </label>
                    <input
                      id="newPassword"
                      type="password"
                      className="form-control bg-black text-white border-secondary shadow-none"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nhập mật khẩu mới"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="confirmPassword" className="form-label text-light small fw-medium">
                      Xác nhận mật khẩu mới
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      className="form-control bg-black text-white border-secondary shadow-none"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới"
                      required
                    />
                  </div>

                  {errorMessage ? <div className="alert alert-danger py-2 px-3 small">{errorMessage}</div> : null}
                  {successMessage ? <div className="alert alert-success py-2 px-3 small">{successMessage}</div> : null}

                  <button type="submit" disabled={loading} className="btn btn-danger w-100 fw-bold py-2 mt-2">
                    {loading ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
                  </button>
                </form>

                <div className="d-flex justify-content-between align-items-center mt-3">
                  <button
                    type="button"
                    className="btn btn-link text-danger text-decoration-none p-0"
                    onClick={handleResendForgotOtp}
                    disabled={loading}
                  >
                    Gửi lại OTP
                  </button>

                  <button
                    type="button"
                    className="btn btn-link text-secondary text-decoration-none p-0"
                    onClick={() => {
                      setStep('request')
                      setOtp('')
                      setNewPassword('')
                      setConfirmPassword('')
                      resetMessages()
                    }}
                    disabled={loading}
                  >
                    Đổi email
                  </button>
                </div>
              </>
            )}

            <p className="text-center text-secondary small mt-4 mb-0">
              Quay lại{' '}
              <Link to="/login" className="text-danger text-decoration-none fw-bold">
                đăng nhập
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

export default ForgotPassword
