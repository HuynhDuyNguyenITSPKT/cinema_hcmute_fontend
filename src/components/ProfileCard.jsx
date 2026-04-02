import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import authService from '../services/authService'
import userService from '../services/userService'

function createProfileForm(user) {
  return {
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    dateOfBirth: user?.dateOfBirth || '',
  }
}

function ProfileCard({ heading, description }) {
  const { user, refreshProfile, setCurrentUser } = useAuth()
  const [profileForm, setProfileForm] = useState(() => createProfileForm(user))
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  })
  const [profileFeedback, setProfileFeedback] = useState({ type: '', message: '' })
  const [passwordFeedback, setPasswordFeedback] = useState({ type: '', message: '' })
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  useEffect(() => {
    setProfileForm(createProfileForm(user))
  }, [user])

  const handleProfileInputChange = (field) => (event) => {
    const { value } = event.target
    setProfileForm((prev) => ({ ...prev, [field]: value }))
  }

  const handlePasswordInputChange = (field) => (event) => {
    const { value } = event.target
    setPasswordForm((prev) => ({ ...prev, [field]: value }))
  }

  const resetPasswordForm = () => {
    setPasswordForm({
      oldPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    })
  }

  const feedbackClassMap = {
    success: 'alert alert-success py-2 px-3 mb-0',
    error: 'alert alert-danger py-2 px-3 mb-0',
  }

  const handleUpdateProfile = async (event) => {
    event.preventDefault()
    setProfileFeedback({ type: '', message: '' })

    const payload = {
      fullName: profileForm.fullName.trim(),
      email: profileForm.email.trim(),
      phone: String(profileForm.phone).trim(),
      dateOfBirth: profileForm.dateOfBirth,
    }

    if (!payload.fullName || !payload.email) {
      setProfileFeedback({ type: 'error', message: 'Vui lòng nhập đầy đủ họ tên và email.' })
      return
    }

    setIsUpdatingProfile(true)

    try {
      const response = await userService.updateProfile(payload)
      const nextUser = response?.data

      if (nextUser) {
        setCurrentUser(nextUser)
      } else {
        await refreshProfile()
      }

      setProfileFeedback({
        type: 'success',
        message: response?.message || 'Cập nhật thông tin cá nhân thành công.',
      })
    } catch (error) {
      setProfileFeedback({
        type: 'error',
        message: error?.message || 'Cập nhật thông tin thất bại.',
      })
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handleChangePassword = async (event) => {
    event.preventDefault()
    setPasswordFeedback({ type: '', message: '' })

    const oldPassword = passwordForm.oldPassword
    const newPassword = passwordForm.newPassword
    const confirmNewPassword = passwordForm.confirmNewPassword

    if (!oldPassword || !newPassword || !confirmNewPassword) {
      setPasswordFeedback({ type: 'error', message: 'Vui lòng nhập đầy đủ thông tin đổi mật khẩu.' })
      return
    }

    if (newPassword.length < 3) {
      setPasswordFeedback({ type: 'error', message: 'Mật khẩu mới phải có ít nhất 3 ký tự.' })
      return
    }

    if (oldPassword === newPassword) {
      setPasswordFeedback({ type: 'error', message: 'Mật khẩu mới không được giống mật khẩu cũ.' })
      return
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordFeedback({ type: 'error', message: 'Xác nhận mật khẩu mới không khớp.' })
      return
    }

    setIsChangingPassword(true)

    try {
      const response = await authService.changePassword(oldPassword, newPassword)
      setPasswordFeedback({
        type: 'success',
        message: response?.message || 'Đổi mật khẩu thành công.',
      })
      resetPasswordForm()
    } catch (error) {
      setPasswordFeedback({
        type: 'error',
        message: error?.message || 'Đổi mật khẩu thất bại.',
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <section className="container-fluid px-2 px-md-3 px-xl-4">
      <div className="card border-0 shadow-sm overflow-hidden">
        <div className="bg-primary-subtle px-4 py-4 border-bottom">
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
            <div>
              <h2 className="h4 mb-1">{heading}</h2>
              <p className="text-secondary mb-0">{description}</p>
            </div>
            <span className="badge rounded-pill text-bg-dark px-3 py-2">{user?.role || '-'}</span>
          </div>
        </div>

        <div className="card-body p-4">
          <div className="row g-4 align-items-center border rounded-3 p-3 p-md-4 mb-4 bg-light-subtle">
            <div className="col-12 col-md-auto">
              <div className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center fw-bold fs-4 p-4 lh-1">
                {user?.fullName?.trim()?.charAt(0)?.toUpperCase() || user?.username?.trim()?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            </div>

            <div className="col-12 col-md">
              <h3 className="h5 mb-1">{user?.fullName || '-'}</h3>
              <p className="text-secondary mb-1">@{user?.username || '-'}</p>
              <p className="mb-0 text-body-secondary">{user?.email || '-'}</p>
            </div>

            <div className="col-12 col-md-auto">
              <span className="badge text-bg-primary-subtle text-primary-emphasis px-3 py-2">{user?.phone || 'Chưa cập nhật SĐT'}</span>
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-12 col-md-6 col-xl-4">
              <div className="card h-100 border-light-subtle">
                <div className="card-body">
                  <p className="text-secondary small mb-1">Username</p>
                  <p className="mb-0 fw-semibold">{user?.username || '-'}</p>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-xl-4">
              <div className="card h-100 border-light-subtle">
                <div className="card-body">
                  <p className="text-secondary small mb-1">Email</p>
                  <p className="mb-0 fw-semibold">{user?.email || '-'}</p>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-xl-4">
              <div className="card h-100 border-light-subtle">
                <div className="card-body">
                  <p className="text-secondary small mb-1">Ngày sinh</p>
                  <p className="mb-0 fw-semibold">{user?.dateOfBirth || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4">
            <div className="col-12 col-xl-7">
              <div className="card border-light-subtle h-100">
                <div className="card-header bg-white border-bottom-0 pt-3 pb-0">
                  <h3 className="h5 mb-0">Cập nhật hồ sơ</h3>
                </div>

                <div className="card-body">
                  <form className="row g-3" onSubmit={handleUpdateProfile}>
                    <div className="col-12 col-md-6">
                      <label htmlFor="profileFullName" className="form-label">
                        Họ tên
                      </label>
                      <input
                        id="profileFullName"
                        type="text"
                        className="form-control"
                        value={profileForm.fullName}
                        onChange={handleProfileInputChange('fullName')}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label htmlFor="profileEmail" className="form-label">
                        Email
                      </label>
                      <input
                        id="profileEmail"
                        type="email"
                        className="form-control"
                        value={profileForm.email}
                        onChange={handleProfileInputChange('email')}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label htmlFor="profilePhone" className="form-label">
                        Số điện thoại
                      </label>
                      <input
                        id="profilePhone"
                        type="tel"
                        className="form-control"
                        value={profileForm.phone}
                        onChange={handleProfileInputChange('phone')}
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label htmlFor="profileDob" className="form-label">
                        Ngày sinh
                      </label>
                      <input
                        id="profileDob"
                        type="date"
                        className="form-control"
                        value={profileForm.dateOfBirth}
                        onChange={handleProfileInputChange('dateOfBirth')}
                      />
                    </div>

                    <div className="col-12 d-flex flex-wrap gap-2 pt-1">
                      <button type="submit" className="btn btn-primary" disabled={isUpdatingProfile}>
                        {isUpdatingProfile ? 'Đang cập nhật...' : 'Cập nhật thông tin'}
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setProfileForm(createProfileForm(user))}
                        disabled={isUpdatingProfile}
                      >
                        Đặt lại
                      </button>
                    </div>

                    {profileFeedback.message ? (
                      <div className="col-12">
                        <p className={feedbackClassMap[profileFeedback.type] || feedbackClassMap.error}>{profileFeedback.message}</p>
                      </div>
                    ) : null}
                  </form>
                </div>
              </div>
            </div>

            <div className="col-12 col-xl-5">
              <div className="card border-light-subtle h-100">
                <div className="card-header bg-white border-bottom-0 pt-3 pb-0">
                  <h3 className="h5 mb-0">Đổi mật khẩu</h3>
                </div>

                <div className="card-body">
                  <form className="row g-3" onSubmit={handleChangePassword}>
                    <div className="col-12">
                      <label htmlFor="oldPassword" className="form-label">
                        Mật khẩu cũ
                      </label>
                      <input
                        id="oldPassword"
                        type="password"
                        className="form-control"
                        value={passwordForm.oldPassword}
                        onChange={handlePasswordInputChange('oldPassword')}
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label htmlFor="newPassword" className="form-label">
                        Mật khẩu mới
                      </label>
                      <input
                        id="newPassword"
                        type="password"
                        className="form-control"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordInputChange('newPassword')}
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label htmlFor="confirmNewPassword" className="form-label">
                        Xác nhận mật khẩu mới
                      </label>
                      <input
                        id="confirmNewPassword"
                        type="password"
                        className="form-control"
                        value={passwordForm.confirmNewPassword}
                        onChange={handlePasswordInputChange('confirmNewPassword')}
                        required
                      />
                    </div>

                    <div className="col-12 d-flex flex-wrap gap-2 pt-1">
                      <button type="submit" className="btn btn-primary" disabled={isChangingPassword}>
                        {isChangingPassword ? 'Đang đổi...' : 'Đổi mật khẩu'}
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={resetPasswordForm}
                        disabled={isChangingPassword}
                      >
                        Làm mới ô nhập
                      </button>
                    </div>

                    {passwordFeedback.message ? (
                      <div className="col-12">
                        <p className={feedbackClassMap[passwordFeedback.type] || feedbackClassMap.error}>{passwordFeedback.message}</p>
                      </div>
                    ) : null}
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ProfileCard
