import { Outlet } from 'react-router-dom'

function GuestLayout() {
  return (
    <div className="min-vh-100 bg-black">
      <Outlet />
    </div>
  )
}

export default GuestLayout
