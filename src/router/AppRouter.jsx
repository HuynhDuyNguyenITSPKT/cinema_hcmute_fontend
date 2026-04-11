import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import AdminLayout from '../layouts/AdminLayout'
import GuestLayout from '../layouts/GuestLayout'
import UserLayout from '../layouts/UserLayout'
import PublicLayout from '../layouts/PublicLayout'
// Existing Admin Pages
import AdminProfile from '../pages/AdminProfile'
import AdminUsers from '../pages/AdminUsers'
import AdminExtraServices from '../pages/AdminExtraServices'
import AdminPromotions from '../pages/AdminPromotions'
// New Admin Pages
import AdminMovies from '../pages/AdminMovies'
import AdminAuditoriums from '../pages/AdminAuditoriums'
import AdminShowtimes from '../pages/AdminShowtimes'
import AdminSeatTypes from '../pages/AdminSeatTypes'
import AdminBookings from '../pages/AdminBookings'
import AdminDashboard from '../pages/AdminDashboard'
import AdminReviews from '../pages/AdminReviews'
// Auth Pages
import Login from '../pages/Login'
import Register from '../pages/Register'
import Home from '../pages/Home'
import UserProfile from '../pages/UserProfile'
import ForgotPassword from '../pages/ForgotPassword'
import PaymentCallback from '../pages/PaymentCallback'
import RoleBasedRedirect from './RoleBasedRedirect'
// New Customer Pages
import MovieDetails from '../pages/MovieDetails'
import SeatSelection from '../pages/SeatSelection'
import Checkout from '../pages/Checkout'
import MyTickets from '../pages/MyTickets'
import MovieList from '../pages/MovieList'
import AdminGenres from '../pages/AdminGenres'

function AppRouter() {
  return (
    <Routes>
      {/* Guest routes: login / register / auth */}
      <Route element={<GuestLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      {/* Public routes: Home, Movie browsing, Checkout */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/movies" element={<MovieList />} />
        <Route path="/movies/:id" element={<MovieDetails />} />
        <Route path="/callpay" element={<PaymentCallback />} />
      </Route>

      {/* Auth required: Seat selection and Checkout */}
      <Route
        path="/seat-selection/:showtimeId"
        element={
          <ProtectedRoute allowedRoles={['USER', 'ADMIN']}>
            <SeatSelection />
          </ProtectedRoute>
        }
      />
      <Route
        path="/checkout"
        element={
          <ProtectedRoute allowedRoles={['USER', 'ADMIN']}>
            <Checkout />
          </ProtectedRoute>
        }
      />

      <Route
        path="/redirect"
        element={
          <ProtectedRoute>
            <RoleBasedRedirect />
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="profile" element={<AdminProfile />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="extra-services" element={<AdminExtraServices />} />
        <Route path="promotions" element={<AdminPromotions />} />
        {/* New admin routes */}
        <Route path="genres" element={<AdminGenres />} />
        <Route path="movies" element={<AdminMovies />} />
        <Route path="auditoriums" element={<AdminAuditoriums />} />
        <Route path="showtimes" element={<AdminShowtimes />} />
        <Route path="seat-types" element={<AdminSeatTypes />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="reviews" element={<AdminReviews />} />
      </Route>

      {/* User routes */}
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
        <Route path="tickets" element={<MyTickets />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRouter
