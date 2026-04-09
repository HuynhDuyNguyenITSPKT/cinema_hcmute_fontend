import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const adminTabs = [
  { to: '/admin/dashboard', label: 'Tổng quan', icon: '📊' },
  { to: '/admin/profile', label: 'Hồ sơ', icon: '👤' },
  { to: '/admin/users', label: 'Quản lí khách hàng', icon: '👥' },
  { to: '/admin/bookings', label: 'Quản lý Đặt Vé', icon: '🎟️' },
  { to: '/admin/movies', label: 'Quản lý Phim', icon: '🎬' },
  { to: '/admin/auditoriums', label: 'Phòng Chiếu', icon: '🏛️' },
  { to: '/admin/showtimes', label: 'Lịch Chiếu', icon: '📅' },
  { to: '/admin/seat-types', label: 'Loại Ghế & Giá', icon: '🪑' },
  { to: '/admin/extra-services', label: 'Dịch vụ Thêm', icon: '🍿' },
  { to: '/admin/promotions', label: 'Khuyến mãi', icon: '🏷️' },
]

function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const displayName = user?.fullName || user?.username || user?.email || 'Administrator'
  const avatarText = displayName.trim().charAt(0).toUpperCase()

  return (
    <div className="d-flex bg-body-tertiary text-dark" style={{ height: '100vh', overflow: 'hidden' }}>
      <aside
        className="d-flex flex-column text-white shadow"
        style={{
          width: isSidebarOpen ? '274px' : '88px',
          minWidth: isSidebarOpen ? '274px' : '88px',
          height: '100vh',
          position: 'sticky',
          top: 0,
          transition: 'width 0.28s ease',
          background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
        }}
      >
        <div className="border-bottom border-secondary-subtle px-3 d-flex align-items-center" style={{ minHeight: '76px' }}>
          <div className="d-flex align-items-center gap-2 w-100">
            <span className="badge rounded-pill text-bg-warning px-2 py-2">CM</span>
            {isSidebarOpen ? <span className="fw-bold text-uppercase small">Cinema Admin</span> : null}
          </div>
        </div>

        <nav className="flex-grow-1 p-3">
          <ul className="nav flex-column gap-2">
            {adminTabs.map((item) => (
              <li className="nav-item" key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `nav-link rounded-3 d-flex align-items-center ${isActive ? 'bg-primary text-white shadow-sm' : 'text-light-emphasis bg-transparent'}`
                  }
                  style={{ gap: '12px', padding: '11px 12px' }}
                  title={!isSidebarOpen ? item.label : ''}
                >
                  <span className="fs-6">{item.icon}</span>
                  {isSidebarOpen ? <span className="small fw-semibold text-truncate">{item.label}</span> : null}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-3 border-top border-secondary-subtle">
          {isSidebarOpen ? (
            <div className="small text-light-emphasis">Hệ thống quản trị rạp phim</div>
          ) : (
            <div className="text-center small text-light-emphasis">SYS</div>
          )}
        </div>
      </aside>

      <div className="flex-grow-1 d-flex flex-column min-w-0" style={{ height: '100vh', overflow: 'hidden' }}>
        <header className="bg-white border-bottom shadow-sm px-3 px-md-4 py-3" style={{ position: 'sticky', top: 0, zIndex: 20 }}>
          <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div className="d-flex align-items-center gap-2">
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                ☰
              </button>
              <div>
                <h1 className="h5 mb-0">Dashboard Admin</h1>
                <p className="text-secondary mb-0 small d-none d-sm-block">Quản lý tài khoản, phim và vé trong một nơi</p>
              </div>
            </div>

            <div className="d-flex align-items-center gap-3">
              <div className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center fw-bold" style={{ width: 38, height: 38 }}>
                {avatarText || 'A'}
              </div>
              <div className="text-end d-none d-md-block">
                <div className="fw-semibold">{displayName}</div>
                <small className="badge text-bg-primary">{user?.role || 'ADMIN'}</small>
              </div>
              <button className="btn btn-danger" onClick={handleLogout}>
                Đăng xuất
              </button>
            </div>
          </div>
        </header>

        <main className="flex-grow-1 overflow-auto p-3 p-md-4" style={{ background: 'linear-gradient(180deg, #eef2ff 0%, #f8fafc 48%, #f1f5f9 100%)', overscrollBehavior: 'contain' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
