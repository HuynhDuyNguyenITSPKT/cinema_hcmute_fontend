import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import bookingService from '../services/bookingService'
import seatService from '../services/seatService'

const MIN_GROUP_SEATS = 20

function GroupBooking() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { movie, showtime, seatIds = [] } = state || {}

  // Auto-fill từ context user
  const [formData, setFormData] = useState({
    contactName: '',
    contactPhone: '',
    note: ''
  })

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        contactName: user.fullName || user.username || '',
        contactPhone: user.phone || '',
      }))
    }
  }, [user])

  const [pricePreview, setPricePreview] = useState(null)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [countdown, setCountdown] = useState(600)
  const countdownRef = useRef(null)

  // Guard: Bắt buộc có movie VÀ đủ >= 20 ghế (luật GroupBookingBuilder)
  useEffect(() => {
    if (!movie) {
      navigate('/')
      return
    }
    if (seatIds.length < MIN_GROUP_SEATS) {
      alert(`Đặt vé đoàn yêu cầu tối thiểu ${MIN_GROUP_SEATS} ghế. Bạn chỉ chọn ${seatIds.length} ghế.`)
      navigate(-1)
      return
    }

    // Đồng hồ đếm ngược khoá ghế
    const updateTimer = () => {
      setCountdown(prev => {
        if (prev <= 1) {
          handleExpire()
          return 0
        }
        return prev - 1
      })
    }
    countdownRef.current = setInterval(updateTimer, 1000)
    return () => clearInterval(countdownRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie, seatIds.length])

  const handleExpire = async () => {
    clearInterval(countdownRef.current)
    if (showtime && seatIds.length > 0) {
      await seatService.unlockSeats(showtime.id, seatIds).catch(() => {})
    }
    alert('Hết thời gian giữ ghế! Vui lòng chọn lại.')
    navigate(-1)
  }

  // Preview giá qua Pipeline (GroupDiscountStep 5% + TaxStep)
  const calculatePrice = useCallback(() => {
    if (!showtime?.id || seatIds.length === 0) return
    setLoadingPrice(true)
    bookingService.calculatePreviewPrice({
      showtimeId: showtime.id,
      seatIds,
      extras: {},
      bookingType: 'GROUP'
    })
      .then(res => setPricePreview(res.data || res))
      .catch(() => setPricePreview(null))
      .finally(() => setLoadingPrice(false))
  }, [showtime, seatIds])

  useEffect(() => { calculatePrice() }, [calculatePrice])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    if (!formData.contactName || !formData.contactPhone) {
      return alert('Vui lòng điền họ tên và số điện thoại liên hệ!')
    }

    setSubmitting(true)
    try {
      clearInterval(countdownRef.current)

      const b2bNote = `[KHÁCH ĐOÀN] Tên: ${formData.contactName} | SĐT: ${formData.contactPhone}${formData.note ? ` | Ghi chú: ${formData.note}` : ''}`

      const res = await bookingService.createBooking({
        showtimeId: showtime.id,
        seatIds,
        extras: {},
        paymentMethod: 'VNPAY',
        bookingType: 'GROUP',
        note: b2bNote
      })

      navigate('/group-success', { state: { booking: res.data || res } })
    } catch (err) {
      alert(err?.message || 'Không thể tạo đơn Đặt Đoàn. Vui lòng thử lại!')
    } finally {
      setSubmitting(false)
    }
  }

  const fmt = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ'
  const formatCountdown = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="container-fluid py-4" style={{ background: '#0f172a', minHeight: '100vh' }}>
      <div className="container" style={{ maxWidth: 960 }}>

        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <div>
            <h3 className="text-light mb-1">🤝 Đặt Vé Đoàn — Chờ Admin Duyệt</h3>
            <small className="text-secondary">
              Sau khi gửi, Admin sẽ liên hệ xác nhận và bạn có thể thanh toán trong Lịch sử vé.
            </small>
          </div>
          <div className={`badge fs-6 px-3 py-2 ${countdown < 60 ? 'bg-danger' : 'bg-warning text-dark'}`}>
            ⏱ Hết hạn sau: {formatCountdown(countdown)}
          </div>
        </div>

        <div className="row g-4">
          {/* Form liên hệ */}
          <div className="col-lg-7">
            <div className="card border-0 shadow-lg" style={{ background: '#1e293b' }}>
              <div className="card-header border-0 fw-bold text-light"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#2563eb)', borderRadius: '12px 12px 0 0' }}>
                📝 Thông Tin Người Liên Hệ
              </div>
              <div className="card-body p-4">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label text-secondary fw-semibold">
                      Họ và Tên <span className="text-danger">*</span>
                    </label>
                    <input type="text" className="form-control bg-dark text-light border-secondary"
                      placeholder="Nguyễn Văn A / Khoa CNTT HCMUTE"
                      value={formData.contactName}
                      onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                      required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary fw-semibold">
                      Số điện thoại <span className="text-danger">*</span>
                    </label>
                    <input type="tel" className="form-control bg-dark text-light border-secondary"
                      placeholder="09xx..."
                      value={formData.contactPhone}
                      onChange={e => setFormData({ ...formData, contactPhone: e.target.value })}
                      required />
                  </div>
                  <div className="mb-4">
                    <label className="form-label text-secondary fw-semibold">Ghi chú bổ sung (Tùy chọn)</label>
                    <textarea className="form-control bg-dark text-light border-secondary" rows="3"
                      placeholder="Yêu cầu về hóa đơn VAT, sắp xếp chỗ, suất chiếu ưu tiên..."
                      value={formData.note}
                      onChange={e => setFormData({ ...formData, note: e.target.value })} />
                  </div>

                  <div className="alert border-secondary small mb-4"
                    style={{ background: '#0f2340', color: '#93c5fd', border: '1px solid #1d4ed8' }}>
                    ℹ️ Sau khi gửi, hệ thống sẽ giữ <strong>{seatIds.length} ghế</strong> cho đơn này.
                    Admin sẽ liên hệ xác nhận qua số điện thoại của bạn. Bạn sẽ thanh toán sau khi được duyệt.
                  </div>

                  <button type="submit"
                    className="btn w-100 fw-bold py-3 fs-5 shadow"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none' }}
                    disabled={submitting || loadingPrice}>
                    {submitting ? '⏳ Đang Gửi Yêu Cầu...' : '📋 Gửi Yêu Cầu & Chờ Admin Duyệt'}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Hóa đơn tạm tính B2B */}
          <div className="col-lg-5">
            <div className="card border-0 shadow-lg sticky-top" style={{ top: 24, background: '#1e293b' }}>
              <div className="card-header border-0 fw-bold text-light"
                style={{ background: 'linear-gradient(135deg,#065f46,#0f766e)', borderRadius: '12px 12px 0 0' }}>
                📋 Hóa Đơn Tạm Tính B2B
              </div>
              <div className="card-body p-4">
                <h5 className="text-light fw-bold mb-1">{movie?.title}</h5>
                <div className="text-secondary small mb-2">
                  {showtime?.startTime && new Date(showtime.startTime).toLocaleString('vi-VN')}
                  {showtime?.auditoriumName && ` • ${showtime.auditoriumName}`}
                </div>

                {/* Danh sách ghế tóm tắt */}
                <div className="mb-3">
                  <span className="badge bg-warning text-dark me-1 mb-1">
                    🪑 {seatIds.length} ghế đã chọn
                  </span>
                </div>

                {/* Discount label */}
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span className="badge" style={{ background: '#7c3aed' }}>🏢 Khách Đoàn</span>
                  <span className="badge bg-success">Giảm 5% Chiết Khấu B2B</span>
                </div>

                <hr className="border-secondary" />

                {loadingPrice ? (
                  <div className="text-center py-3"><div className="spinner-border text-warning" /></div>
                ) : pricePreview ? (
                  <>
                    <div className="d-flex justify-content-between text-light py-1">
                      <span className="text-secondary">Giá gốc</span>
                      <span>{fmt(Number(pricePreview.baseSubtotal) + Number(pricePreview.surchargesTotal))}</span>
                    </div>
                    {Number(pricePreview.promotionDiscount) > 0 && (
                      <div className="d-flex justify-content-between text-success py-1 fw-semibold">
                        <span>Chiết khấu Đoàn (-5%)</span>
                        <span>-{fmt(pricePreview.promotionDiscount)}</span>
                      </div>
                    )}
                    {Number(pricePreview.taxAmount) > 0 && (
                      <div className="d-flex justify-content-between text-secondary py-1">
                        <span>VAT (10%)</span>
                        <span>+{fmt(pricePreview.taxAmount)}</span>
                      </div>
                    )}
                    <hr className="border-secondary my-2" />
                    <div className="d-flex justify-content-between text-warning fw-bold fs-4 align-items-center">
                      <span>TỔNG CỘNG</span>
                      <span>{fmt(pricePreview.finalTotal)}</span>
                    </div>
                    <div className="text-secondary small mt-2 text-end">
                      *Giá cuối sẽ được xác nhận bởi Admin
                    </div>
                  </>
                ) : (
                  <div className="text-secondary text-center small py-3">Không tải được giá tạm tính.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GroupBooking
