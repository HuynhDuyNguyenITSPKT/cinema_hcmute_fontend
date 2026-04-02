import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import authService from '../services/authService'

const initialForm = {
  username: '',
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  dateOfBirth: '',
  phone: '',
}

function Register() {
  const [formData, setFormData] = useState(initialForm)
  const [otp, setOtp] = useState('')
  const [registerStep, setRegisterStep] = useState('register')
  const [verifyEmail, setVerifyEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const navigate = useNavigate()

  const handleInputChange = (field) => (e) => {
    const { value } = e.target
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (formData.password.length < 3) {
      const message = 'Mat khau phai co it nhat 3 ky tu.'
      setErrorMessage(message)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      const message = 'Mat khau xac nhan khong khop.'
      setErrorMessage(message)
      return
    }

    setLoading(true)

    try {
      const payload = {
        username: formData.username.trim(),
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        dateOfBirth: formData.dateOfBirth,
        phone: formData.phone.trim(),
      }

      const response = await authService.register(payload)
      const email = response?.data || payload.email
      const message = response?.message || 'OTP da duoc gui. Vui long kiem tra email.'

      setVerifyEmail(email)
      setRegisterStep('verify')
      setSuccessMessage(message)
    } catch (err) {
      const message = err?.message || 'Dang ky that bai. Vui long thu lai.'
      setErrorMessage(message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!otp.trim()) {
      const message = 'Vui long nhap ma OTP.'
      setErrorMessage(message)
      return
    }

    setLoading(true)

    try {
      const response = await authService.verifyOtp(verifyEmail, otp.trim())
      const message = response?.message || 'Xac thuc thanh cong. Ban co the dang nhap ngay bay gio.'
      setSuccessMessage(message)
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 1200)
    } catch (err) {
      const message = err?.message || 'Xac thuc OTP that bai. Vui long thu lai.'
      setErrorMessage(message)
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setErrorMessage('')
    setSuccessMessage('')

    const emailToResend = (verifyEmail || formData.email || '').trim()
    if (!emailToResend) {
      const message = 'Khong tim thay email de gui lai OTP.'
      setErrorMessage(message)
      return
    }

    setLoading(true)

    try {
      const response = await authService.resendOtp(emailToResend)
      const message = response?.message || 'Da gui lai OTP thanh cong.'
      setSuccessMessage(message)
    } catch (err) {
      const message = err?.message || 'Khong the gui lai OTP. Vui long thu lai.'
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
              'url("https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=1200") center/cover no-repeat',
          }}
        >
          <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-75"></div>
          <div className="position-relative z-index-1 text-center">
            <h1 className="display-4 fw-bolder mb-3 text-danger">MOVIETICKER</h1>
            <p className="lead px-4">
              Tạo tài khoản để đặt vé nhanh hơn, nhận ưu đãi sớm và quản lý lịch sử giao dịch.
            </p>
          </div>
        </div>

        <div className="col-12 col-md-6 d-flex justify-content-center align-items-center p-4 p-sm-5 bg-dark" style={{ minHeight: '100vh' }}>
          <div className="w-100 bg-dark p-4 p-md-5 rounded shadow" style={{ maxWidth: '560px', border: '1px solid #333' }}>
            {registerStep === 'register' ? (
              <>
                <h2 className="text-white fw-bold mb-2">Đăng ký tài khoản</h2>
                <p className="text-secondary mb-4">Nhập thông tin để nhận mã OTP xác thực email.</p>

                <form onSubmit={handleRegister}>
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label htmlFor="username" className="form-label text-light small fw-medium">
                        Tên tài khoản
                      </label>
                      <input
                        id="username"
                        type="text"
                        className="form-control bg-black text-white border-secondary shadow-none"
                        value={formData.username}
                        onChange={handleInputChange('username')}
                        placeholder="vd: thaibao"
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label htmlFor="fullName" className="form-label text-light small fw-medium">
                        Họ tên
                      </label>
                      <input
                        id="fullName"
                        type="text"
                        className="form-control bg-black text-white border-secondary shadow-none"
                        value={formData.fullName}
                        onChange={handleInputChange('fullName')}
                        placeholder="Nguyễn Văn A"
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label htmlFor="email" className="form-label text-light small fw-medium">
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        className="form-control bg-black text-white border-secondary shadow-none"
                        value={formData.email}
                        onChange={handleInputChange('email')}
                        placeholder="example@gmail.com"
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label htmlFor="password" className="form-label text-light small fw-medium">
                        Mật khẩu
                      </label>
                      <input
                        id="password"
                        type="password"
                        className="form-control bg-black text-white border-secondary shadow-none"
                        value={formData.password}
                        onChange={handleInputChange('password')}
                        placeholder="Nhập mật khẩu"
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label htmlFor="confirmPassword" className="form-label text-light small fw-medium">
                        Xác nhận mật khẩu
                      </label>
                      <input
                        id="confirmPassword"
                        type="password"
                        className="form-control bg-black text-white border-secondary shadow-none"
                        value={formData.confirmPassword}
                        onChange={handleInputChange('confirmPassword')}
                        placeholder="Nhập lại mật khẩu"
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label htmlFor="dateOfBirth" className="form-label text-light small fw-medium">
                        Ngày sinh
                      </label>
                      <input
                        id="dateOfBirth"
                        type="date"
                        className="form-control bg-black text-white border-secondary shadow-none"
                        value={formData.dateOfBirth}
                        onChange={handleInputChange('dateOfBirth')}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label htmlFor="phone" className="form-label text-light small fw-medium">
                        Số điện thoại
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        className="form-control bg-black text-white border-secondary shadow-none"
                        value={formData.phone}
                        onChange={handleInputChange('phone')}
                        placeholder="08xxxxxxxx"
                        required
                      />
                    </div>
                  </div>

                  {errorMessage ? <div className="alert alert-danger py-2 px-3 small mt-3">{errorMessage}</div> : null}
                  {successMessage ? <div className="alert alert-success py-2 px-3 small mt-3">{successMessage}</div> : null}

                  <button type="submit" disabled={loading} className="btn btn-danger w-100 fw-bold py-2 mt-3">
                    {loading ? 'Đang xử lý...' : 'Đăng ký và nhận OTP'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-white fw-bold mb-2">Xác thực OTP</h2>
                <p className="text-secondary mb-4">
                  Nhập mã OTP đã gửi tới email <span className="text-light">{verifyEmail}</span>
                </p>

                <form onSubmit={handleVerifyOtp}>
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

                  {errorMessage ? <div className="alert alert-danger py-2 px-3 small">{errorMessage}</div> : null}
                  {successMessage ? <div className="alert alert-success py-2 px-3 small">{successMessage}</div> : null}

                  <button type="submit" disabled={loading} className="btn btn-danger w-100 fw-bold py-2 mt-2">
                    {loading ? 'Đang xác thực...' : 'Xác thực và hoàn tất'}
                  </button>
                </form>

                <div className="d-flex justify-content-between align-items-center mt-3">
                  <button
                    type="button"
                    className="btn btn-link text-danger text-decoration-none p-0"
                    onClick={handleResendOtp}
                    disabled={loading}
                  >
                    Gửi lại OTP
                  </button>

                  <button
                    type="button"
                    className="btn btn-link text-secondary text-decoration-none p-0"
                    onClick={() => {
                      setRegisterStep('register')
                      setOtp('')
                      setErrorMessage('')
                      setSuccessMessage('')
                    }}
                    disabled={loading}
                  >
                    Sửa thông tin
                  </button>
                </div>
              </>
            )}

            <p className="text-center text-secondary small mt-4 mb-0">
              Đã có tài khoản?{' '}
              <Link to="/login" className="text-danger text-decoration-none fw-bold">
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

export default Register
