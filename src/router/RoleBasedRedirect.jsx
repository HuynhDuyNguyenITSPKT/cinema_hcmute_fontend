import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getDefaultPathByRole } from '../utils/roleRoute'

function RoleBasedRedirect() {
  const { user } = useAuth()

  return <Navigate to={getDefaultPathByRole(user?.role)} replace />
}

export default RoleBasedRedirect
