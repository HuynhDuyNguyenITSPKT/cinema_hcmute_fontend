import { useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppFooter from '../components/layout/AppFooter';

function PublicLayout({ children }) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN') {
      navigate('/admin/profile', { replace: true });
    }
  }, [isAuthenticated, user?.role, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="d-flex flex-column min-vh-100 bg-dark text-white">
      {/* Header using Bootstrap Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-black shadow-sm py-3" style={{ borderBottom: '1px solid #333' }}>
        <div className="container">
          <Link className="navbar-brand text-danger fw-bolder fs-4" to="/">MOVIE<span className="text-white">TICKER</span></Link>
          
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarPublic" aria-controls="navbarPublic" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          
          <div className="collapse navbar-collapse" id="navbarPublic">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0 fw-medium">
              <li className="nav-item">
                <Link className="nav-link active" to="/">Trang Chủ</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/movies">Lịch Chiếu</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/">Khuyến Mãi</Link>
              </li>
            </ul>
            
            <div className="d-flex align-items-center gap-3">
              {isAuthenticated ? (
                <div className="dropdown">
                  <button className="btn btn-outline-light dropdown-toggle d-flex align-items-center gap-2" type="button" id="userDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                    <div className="bg-danger rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                      {user?.fullName?.[0] || user?.email?.[0] || 'U'}
                    </div>
                    <span>{user?.fullName || user?.email}</span>
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end dropdown-menu-dark" aria-labelledby="userDropdown">
                    <li>
                      <Link className="dropdown-item" to={user?.role === 'ADMIN' ? '/admin/profile' : '/user/profile'}>Hồ Sơ Của Tôi</Link>
                    </li>
                    {user?.role !== 'ADMIN' && (
                      <li>
                        <Link className="dropdown-item" to="/user/tickets">🎟️ Vé Của Tôi</Link>
                      </li>
                    )}
                    <li><hr className="dropdown-divider" /></li>
                    <li><button className="dropdown-item text-danger" onClick={handleLogout}>Đăng Xuất</button></li>
                  </ul>
                </div>
              ) : (
                <Link to="/login" className="btn btn-danger px-4 fw-medium">Đăng Nhập</Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow-1 bg-black">
        {children || <Outlet />}
      </main>

      {/* Footer */}
      <AppFooter />
    </div>
  );
}

export default PublicLayout;