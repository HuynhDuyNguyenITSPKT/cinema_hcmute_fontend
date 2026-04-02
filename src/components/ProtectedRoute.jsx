import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getDefaultPathByRole } from '../utils/roleRoute'

function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, isInitializing, user } = useAuth()
  const location = useLocation()

  if (isInitializing) {
    return (
      <div className="auth-loading">
        <p>Đang kiểm tra phiên đăng nhập...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to={getDefaultPathByRole(user?.role)} replace />
  }

  return children
}

export default ProtectedRoute
