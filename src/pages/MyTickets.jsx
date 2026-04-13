import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import bookingService from '../services/bookingService'
import { notifyError, notifySuccess } from '../utils/notify'

const STATUS_BADGE = {
  RESERVED:         { label: 'Chờ Thanh Toán', badge: 'bg-warning text-dark' },
  SUCCESS:          { label: 'Thành Công',      badge: 'bg-success' },
  CANCELLED:        { label: 'Đã Hủy',          badge: 'bg-secondary' },
  PENDING_APPROVAL: { label: 'Chờ Admin Duyệt', badge: 'bg-info text-dark' },
  PENDING:          { label: 'Đang Xử Lý',      badge: 'bg-warning text-dark' },
}

function MyTickets() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [payingId, setPayingId] = useState(null)
  const [payMethod, setPayMethod] = useState({}) // bookingId → 'VNPAY' | 'MOMO'
  const navigate = useNavigate()

  useEffect(() => {
    bookingService.getMyBookings()
      .then(res => {
        const data = res.data || res || []
        const arr = Array.isArray(data) ? [...data] : []
        arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        setBookings(arr)
      })
      .catch(() => setBookings([]))
      .finally(() => setLoading(false))
  }, [])

  const handleCancel = async (id) => {
    if (!window.confirm('Bạn có chắc muốn hủy vé này không?')) return
    try {
      await bookingService.cancelBooking(id)
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'CANCELLED' } : b))
      notifySuccess('Đã hủy vé thành công')
    } catch (err) {
      notifyError(err?.message || 'Không thể hủy vé này.')
    }
  }

  const handlePay = async (booking) => {
    const method = payMethod[booking.id] || 'VNPAY'
    setPayingId(booking.id)
    try {
      const res = await bookingService.createPaymentUrl(
        booking.id,
        Math.round(Number(booking.totalAmount || 0)),
        booking.movieName,
        method
      )
      const url = res.data || res
      if (typeof url === 'string' && url.startsWith('http')) {
        window.location.href = url
      } else {
        notifyError('Không lấy được URL thanh toán.')
      }
    } catch (err) {
      notifyError(err?.message || 'Lỗi khởi tạo thanh toán.')
    } finally {
      setPayingId(null)
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
            const canCancel  = ['RESERVED', 'PENDING_APPROVAL'].includes(booking.status)
            const isB2B      = booking.note?.includes('KHÁCH ĐOÀN') || booking.note?.includes('GROUP')
            // B2B RESERVED: User có thể thanh toán
            const canPay     = booking.status === 'RESERVED'
            const isPending  = payingId === booking.id

            return (
              <div key={booking.id} className="card border-0 shadow"
                style={{ background: '#1e293b', border: '1px solid #334155' }}>
                <div className="card-body p-4">
                  {/* Header: Phim + Badge + Tiền */}
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
                      {isB2B && <span className="badge ms-1 mb-1" style={{ background: '#7c3aed' }}>🏢 B2B</span>}
                      <div className="text-warning fw-bold fs-6">
                        {Number(booking.totalAmount || 0).toLocaleString('vi-VN')}đ
                      </div>
                    </div>
                  </div>

                  {/* Ghế */}
                  {booking.tickets?.length > 0 && (
                    <div className="d-flex flex-wrap gap-2 mb-3">
                      {booking.tickets.slice(0, 15).map(t => (
                        <span key={t.id} className="badge border border-secondary text-secondary"
                          style={{ background: '#0f172a', fontSize: 10 }}>
                          {t.seatName}{t.seatTypeName ? ` (${t.seatTypeName})` : ''}
                        </span>
                      ))}
                      {booking.tickets.length > 15 && (
                        <span className="badge bg-secondary">+{booking.tickets.length - 15}</span>
                      )}
                    </div>
                  )}

                  {/* Extras */}
                  {booking.extras?.length > 0 && (
                    <div className="text-secondary small mb-2">
                      🍿 {booking.extras.map(e => `${e.extraServiceName} x${e.quantity}`).join(', ')}
                    </div>
                  )}

                  {/* Thông báo chờ duyệt B2B */}
                  {booking.status === 'PENDING_APPROVAL' && isB2B && (
                    <div className="alert mb-3 py-2 small"
                      style={{ background: '#0f2340', color: '#93c5fd', border: '1px solid #1d4ed8' }}>
                      ⏳ <strong>Đơn đang chờ Admin xác nhận.</strong> Sau khi được duyệt, bạn sẽ thấy nút thanh toán xuất hiện ở đây.
                    </div>
                  )}

                  {/* Thanh toán (chỉ khi RESERVED) */}
                  {canPay && (
                    <div className="rounded p-3 mb-3"
                      style={{ background: '#0f2340', border: '1px solid #1d4ed8' }}>
                      <div className="text-info fw-semibold small mb-2">
                        💳 Chọn phương thức thanh toán
                      </div>
                      <div className="d-flex gap-3 mb-3 flex-wrap">
                        {['VNPAY', 'MOMO'].map(m => (
                          <label key={m} className="d-flex align-items-center gap-2 cursor-pointer" style={{ cursor: 'pointer' }}>
                            <input type="radio" name={`pay-${booking.id}`}
                              value={m}
                              checked={(payMethod[booking.id] || 'VNPAY') === m}
                              onChange={() => setPayMethod(prev => ({ ...prev, [booking.id]: m }))} />
                            <span className="text-light small fw-semibold">{m}</span>
                          </label>
                        ))}
                      </div>
                      <button
                        className="btn btn-sm fw-bold w-100"
                        style={{ background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none' }}
                        onClick={() => handlePay(booking)}
                        disabled={isPending}>
                        {isPending ? '⏳ Đang khởi tạo...' : `💳 Thanh Toán ${(payMethod[booking.id] || 'VNPAY')} — ${Number(booking.totalAmount || 0).toLocaleString('vi-VN')}đ`}
                      </button>
                    </div>
                  )}

                  {/* Footer: Mã + Cancel */}
                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-secondary">
                      Mã: {booking.id?.slice(0, 8).toUpperCase()}
                      {booking.createdAt && ` · ${new Date(booking.createdAt).toLocaleDateString('vi-VN')}`}
                    </small>
                    {canCancel && (
                      <button className="btn btn-outline-danger btn-sm"
                        onClick={() => handleCancel(booking.id)}>
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
