import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

function GroupSuccess() {
  const { state } = useLocation()
  const navigate = useNavigate()
  
  // Xử lý an toàn vì response của axiosClient có thể chứa nested data
  const rawBooking = state?.booking
  const bookingData = rawBooking?.data || rawBooking
  const bookingId = bookingData?.bookingId || bookingData?.id

  if (!bookingId) {
    return (
      <div className="container-fluid py-5 text-center" style={{ background: '#0f172a', minHeight: '100vh' }}>
        <h3 className="text-danger mt-5">Không tìm thấy thông tin đơn hàng!</h3>
        <button className="btn btn-outline-light mt-3" onClick={() => navigate('/')}>Về Trang Chủ</button>
      </div>
    )
  }

  const shortId = typeof bookingId === 'string' ? bookingId.split('-')[0].toUpperCase() : bookingId

  return (
    <div className="container-fluid d-flex flex-column align-items-center justify-content-center" style={{ background: '#0f172a', minHeight: '100vh', padding: '20px 0' }}>
      
      <div className="text-start w-100" style={{ position: 'absolute', top: 20, left: 20 }}>
        <button className="btn btn-outline-light" onClick={() => navigate('/')}>← Trang Chủ</button>
      </div>

      <div className="card bg-dark border-0 shadow-lg" style={{ maxWidth: 600, width: '100%', borderRadius: 16 }}>
        <div className="card-header border-0 text-center py-4" style={{ background: 'linear-gradient(135deg,#7c3aed,#2563eb)', borderRadius: '16px 16px 0 0' }}>
          <span style={{ fontSize: '4rem' }}>🤝</span>
          <h2 className="text-light fw-bold mt-2 mb-0">Yêu cầu Gửi Thành Công!</h2>
        </div>
        <div className="card-body p-5">
          <p className="text-light mb-4 text-center" style={{ fontSize: '1.1rem' }}>
            Hệ thống đã ghi nhận yêu cầu Khách Đoàn của bạn. <br/>
            Mã đơn: <strong className="text-warning fs-5">{shortId}</strong>
          </p>
          <div className="alert border-secondary mb-4" style={{ background: '#0f2340', color: '#93c5fd', border: '1px solid #1d4ed8' }}>
            <p className="mb-2">📋 <strong>Trạng thái:</strong> <span className="badge bg-warning text-dark ms-2">Chờ Xác Nhận (PENDING_APPROVAL)</span></p>
            <p className="mb-0 text-secondary">
              Quản lý Rạp lôi hệ thống ra xem xét yêu cầu và sẽ liên hệ trực tiếp đến bạn thông qua số điện thoại cung cấp để trao đổi về chiết khấu và chỗ ngồi.
              Sau khi được Duyệt, bạn có thể thanh toán trực tuyến.
            </p>
          </div>
          <button className="btn btn-lg w-100 fw-bold py-3 shadow" 
            style={{ background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none' }}
            onClick={() => navigate('/user/tickets')}>
            🎟️ Xem Lịch Sử Vé Của Tôi
          </button>
        </div>
      </div>
    </div>
  )
}

export default GroupSuccess
