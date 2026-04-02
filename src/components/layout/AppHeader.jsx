import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

function AppHeader({ navLinks = [], title, subtitle, showAuthActions = false }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="app-header">
      <div className="brand-block">
        <p className="brand-title">MovieTicker</p>
        <h1>{title}</h1>
        {subtitle ? <p className="brand-subtitle">{subtitle}</p> : null}
      </div>

      <div className="header-right">
        {navLinks.length > 0 ? (
          <nav className="header-tabs">
            {navLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  isActive ? 'header-tab active' : 'header-tab'
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        ) : null}

        {showAuthActions ? (
          <div className="user-actions">
            <div className="user-pill">
              <span>{user?.fullName || user?.username || user?.email}</span>
              <strong>{user?.role || 'USER'}</strong>
            </div>
            <button className="btn-ghost" onClick={handleLogout}>
              Đăng xuất
            </button>
          </div>
        ) : null}
      </div>
    </header>
  )
}

export default AppHeader
