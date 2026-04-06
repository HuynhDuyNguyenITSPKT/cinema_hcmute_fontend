import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import bookingService from '../services/bookingService'

const STATUS_BADGE = {
  RESERVED:         { label: 'Chờ Thanh Toán', badge: 'bg-warning text-dark' },
  SUCCESS:          { label: 'Thành Công',      badge: 'bg-success' },
  CANCELLED:        { label: 'Đã Hủy',          badge: 'bg-secondary' },
  PENDING_APPROVAL: { label: 'Chờ Admin Duyệt', badge: 'bg-info text-dark' },
}

function MyTickets() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    bookingService.getMyBookings()
      .then(res => setBookings(res.data || res || []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false))
  }, [])

  const handleCancel = async (id) => {
    if (!window.confirm('Bạn có chắc muốn hủy vé này không?')) return
    try {
      await bookingService.cancelBooking(id)
      setBookings(prev => prev.map(b => b.id === id
        ? { ...b, status: 'CANCELLED' } : b))
    } catch (err) {
      alert(err?.message || 'Không thể hủy vé này.')
    }
  }

  if (loading) return (
    <div className="text-center py-5"><div className="spinner-border text-danger" /></div>
  )

  return (
    <div className="container py-4" style={{ maxWidth: 860 }}>
      <h3 className="text-light mb-4">🎟️ Lịch Sử Đặt Vé Của Tôi</h3>

      {bookings.length === 0 ? (
        <div className="text-center py-5 text-secondary">
          <div style={{ fontSize: 64 }}>🎬</div>
          <p className="mt-3">Bạn chưa có đơn đặt vé nào.</p>
          <button className="btn btn-danger" onClick={() => navigate('/')}>Khám Phá Phim Ngay</button>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {bookings.map(booking => {
            const statusInfo = STATUS_BADGE[booking.status] || { label: booking.status, badge: 'bg-secondary' }
            const canCancel = ['RESERVED', 'PENDING_APPROVAL'].includes(booking.status)

            return (
              <div key={booking.id} className="card bg-dark border-secondary">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h5 className="text-light mb-1">{booking.movieName || 'Không rõ phim'}</h5>
                      <div className="text-secondary small">
                        {booking.auditoriumName && `🏛️ ${booking.auditoriumName}`}
                        {booking.startTime && ` · 📅 ${new Date(booking.startTime).toLocaleString('vi-VN')}`}
                      </div>
                    </div>
                    <div className="text-end">
                      <span className={`badge ${statusInfo.badge} mb-1`}>{statusInfo.label}</span>
                      <div className="text-warning fw-bold">
                        {Number(booking.totalAmount || 0).toLocaleString('vi-VN')}đ
                      </div>
                    </div>
                  </div>

                  {/* Tickets */}
                  {booking.tickets?.length > 0 && (
                    <div className="d-flex flex-wrap gap-2 mb-3">
                      {booking.tickets.map(t => (
                        <span key={t.id} className="badge bg-dark border border-secondary text-secondary">
                          {t.seatName} {t.seatTypeName ? `(${t.seatTypeName})` : ''}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Extras */}
                  {booking.extras?.length > 0 && (
                    <div className="text-secondary small mb-2">
                      🍿 {booking.extras.map(e => `${e.extraServiceName} x${e.quantity}`).join(', ')}
                    </div>
                  )}

                  {booking.note && booking.note.includes('GROUP') && (
                    <div className="badge bg-info text-dark mb-2">🏢 Đặt Vé Đoàn B2B</div>
                  )}

                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-secondary">
                      Mã: {booking.id?.slice(0, 8).toUpperCase()}
                      {booking.createdAt && ` · ${new Date(booking.createdAt).toLocaleDateString('vi-VN')}`}
                    </small>
                    {canCancel && (
                      <button className="btn btn-outline-danger btn-sm" onClick={() => handleCancel(booking.id)}>
                        Hủy Vé
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default MyTickets
