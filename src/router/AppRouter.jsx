import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import AdminLayout from '../layouts/AdminLayout'
import GuestLayout from '../layouts/GuestLayout'
import UserLayout from '../layouts/UserLayout'
import PublicLayout from '../layouts/PublicLayout'
import AdminProfile from '../pages/AdminProfile'
import AdminUsers from '../pages/AdminUsers'
import Login from '../pages/Login'
import Register from '../pages/Register'
import Home from '../pages/Home'
import UserProfile from '../pages/UserProfile'
import ForgotPassword from '../pages/ForgotPassword'
import OAuth2Callback from '../pages/OAuth2Callback'
import RoleBasedRedirect from './RoleBasedRedirect'

function AppRouter() {
  return (
    <Routes>
      <Route element={<GuestLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/oauth2/callback" element={<OAuth2Callback />} />
      </Route>

      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
      </Route>

      <Route
        path="/redirect"
        element={
          <ProtectedRoute>
            <RoleBasedRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="profile" replace />} />
        <Route path="profile" element={<AdminProfile />} />
        <Route path="users" element={<AdminUsers />} />
      </Route>

      <Route
        path="/user"
        element={
          <ProtectedRoute allowedRoles={['USER']}>
            <UserLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="profile" replace />} />
        <Route path="profile" element={<UserProfile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRouter
