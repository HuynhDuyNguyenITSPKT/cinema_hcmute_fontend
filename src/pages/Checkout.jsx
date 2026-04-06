import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import bookingService from '../services/bookingService'
import seatService from '../services/seatService'
import axiosClient from '../api/axiosClient'

function Checkout() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { showtimeId, selectedIds = [], selectedSeatNames = [], movie, showtime, lockExpiresAt } = state || {}

  const [extras, setExtras] = useState([]) // { id, name, price, qty }
  const [promoCode, setPromoCode] = useState('')
  const [promoError, setPromoError] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('VNPAY')
  const [pricePreview, setPricePreview] = useState(null)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [availableExtras, setAvailableExtras] = useState([])
  const [isGroupBooking] = useState(selectedIds.length >= 20)
  const [countdown, setCountdown] = useState(null)
  
  const countdownRef = useRef(null)

  // Countdown timer logic
  useEffect(() => {
    if (!lockExpiresAt) return
    const updateTimer = () => {
      const remaining = Math.floor((lockExpiresAt - Date.now()) / 1000)
      if (remaining <= 0) {
        setCountdown(0)
        handleExpire()
      } else {
        setCountdown(remaining)
      }
    }
    updateTimer()
    countdownRef.current = setInterval(updateTimer, 1000)
    return () => clearInterval(countdownRef.current)
  }, [lockExpiresAt])

  const handleExpire = async () => {
    clearInterval(countdownRef.current)
    if (selectedIds.length > 0) {
      await seatService.unlockSeats(showtimeId, selectedIds).catch(() => {})
    }
    alert('Hết thời gian giữ ghế! Các ghế của bạn đã được giải phóng. Vui lòng chọn lại.')
    navigate(-1) // Quay lại trang chọn ghế
  }

  // Lấy các extra service options
  useEffect(() => {
    if (selectedIds.length === 0) {
       navigate('/')
       return
    }
    axiosClient.get('/extra-services')
      .then(res => setAvailableExtras(res.data?.currentItems || res.data || []))
      .catch(() => {})
  }, [selectedIds, navigate])

  const doCalculatePrice = useCallback((payload, isFallback = false) => {
    setLoadingPrice(true)
    bookingService.calculatePreviewPrice(payload)
      .then(res => {
        setPricePreview(res.data || res)
        if (!isFallback) setPromoError('')
      })
      .catch(err => {
        if (!isFallback && payload.promotionCode) {
          setPromoError(err?.message || 'Khuyến mãi không tồn tại hoặc không hợp lệ')
          // Tính lại giá gốc không khuyết mãi
          doCalculatePrice({ ...payload, promotionCode: null }, true)
        } else {
          setPricePreview(null)
        }
      })
      .finally(() => {
        if (isFallback) setLoadingPrice(false)
        else if (!payload.promotionCode || !promoError) setLoadingPrice(false)
      })
  }, [promoError])

  const calculatePrice = useCallback(() => {
    if (selectedIds.length === 0) return
    const extrasMap = {}
    extras.forEach(e => { if (e.qty > 0) extrasMap[e.id] = e.qty })

    doCalculatePrice({
      showtimeId,
      seatIds: selectedIds,
      extras: extrasMap,
      promotionCode: isGroupBooking ? null : (promoCode || null),
      paymentMethod,
      bookingType: isGroupBooking ? 'GROUP' : 'STANDARD',
    })
  }, [showtimeId, selectedIds, extras, promoCode, isGroupBooking, paymentMethod, doCalculatePrice])

  useEffect(() => {
    const timer = setTimeout(calculatePrice, 600)
    return () => clearTimeout(timer)
  }, [calculatePrice])

  const handleExtraChange = (extra, qty) => {
    setExtras(prev => {
      const existing = prev.find(e => e.id === extra.id)
      if (existing) return prev.map(e => e.id === extra.id ? { ...e, qty } : e)
      return [...prev, { id: extra.id, name: extra.name, price: extra.price, qty }]
    })
  }

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const extrasMap = {}
      extras.forEach(e => { if (e.qty > 0) extrasMap[e.id] = e.qty })

      const res = await bookingService.createBooking({
        showtimeId,
        seatIds: selectedIds,
        extras: extrasMap,
        promotionCode: isGroupBooking ? null : (promoCode || null),
        paymentMethod,
        bookingType: isGroupBooking ? 'GROUP' : 'STANDARD',
        note: isGroupBooking ? 'Đặt vé đoàn' : null,
      })

      const data = res.data || res
      if (isGroupBooking) {
        navigate('/group-success', { state: { booking: data } })
      } else if (data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        navigate('/user/tickets')
      }
    } catch (err) {
      alert(err?.message || 'Đặt vé thất bại, vui lòng thử lại!')
    } finally {
      setSubmitting(false)
    }
  }

  const fmt = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ'
  const formatCountdown = (s) => s === null ? '--:--' : `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="container-fluid py-4" style={{ background: '#0f172a', minHeight: '100vh' }}>
      <div className="container" style={{ maxWidth: 960 }}>
        
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="text-light mb-0">🧾 Xác Nhận Đặt Vé</h3>
          {countdown !== null && (
            <div className={`badge fs-6 px-3 py-2 ${countdown < 60 ? 'bg-danger' : 'bg-warning text-dark'}`}>
              ⏱ Ghế sẽ bị hủy sau: {formatCountdown(countdown)}
            </div>
          )}
        </div>

        {/* Movie & Showtime info */}
        <div className="card bg-dark border-secondary mb-4 shadow">
          <div className="card-body text-light">
            <div className="row g-2">
              <div className="col-md-6">
                <h5 className="fw-bold mb-1">{movie?.title}</h5>
                <div className="text-secondary mt-1">
                  {showtime && new Date(showtime.startTime).toLocaleString('vi-VN')}
                  {showtime?.auditoriumName && ` · ${showtime.auditoriumName}`}
                </div>
              </div>
              <div className="col-md-6 text-md-end">
                <div className="text-secondary">Ghế đã chọn ({selectedIds.length})</div>
                <div className="text-warning fw-bold fs-5 text-break">
                  {selectedSeatNames.length > 0 ? selectedSeatNames.join(', ') : selectedIds.join(', ')}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4">
          {/* Left: Extra Services & Promo */}
          <div className="col-lg-7">
            {/* Extra Services */}
            {availableExtras.length > 0 && (
              <div className="card bg-dark border-secondary mb-3 shadow">
                <div className="card-header border-secondary text-light fw-bold">🍿 Bắp & Nước</div>
                <div className="card-body">
                  {availableExtras.map(ex => (
                    <div key={ex.id} className="d-flex align-items-center justify-content-between py-3 border-bottom border-secondary">
                      <div>
                        <div className="text-light fw-semibold">{ex.name}</div>
                        <small className="text-warning">{fmt(ex.price)}</small>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <button className="btn btn-outline-secondary btn-sm" onClick={() => {
                          const cur = extras.find(e => e.id === ex.id)?.qty || 0
                          if (cur > 0) handleExtraChange(ex, cur - 1)
                        }}>-</button>
                        <span className="text-light fw-bold" style={{ minWidth: 24, textAlign: 'center' }}>
                          {extras.find(e => e.id === ex.id)?.qty || 0}
                        </span>
                        <button className="btn btn-outline-danger btn-sm" onClick={() => {
                          const cur = extras.find(e => e.id === ex.id)?.qty || 0
                          handleExtraChange(ex, cur + 1)
                        }}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Promo Code */}
            {!isGroupBooking && (
              <div className="card bg-dark border-secondary mb-3 shadow">
                <div className="card-header border-secondary text-light fw-bold">🏷️ Mã Khuyến Mãi</div>
                <div className="card-body">
                  <div className="input-group">
                    <input type="text" className={`form-control bg-dark text-light border-secondary ${promoError ? 'border-danger' : ''}`}
                      placeholder="Nhập mã voucher (vd: GIA1S2...)"
                      value={promoCode}
                      onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError('') }} />
                  </div>
                  {promoError && <div className="text-danger small mt-2 fw-semibold">⚠️ {promoError}</div>}
                  {pricePreview?.promotionDescription && !promoError && (
                    <div className="text-success small mt-2 fw-semibold">✅ Áp dụng thành công: {pricePreview.promotionDescription}</div>
                  )}
                </div>
              </div>
            )}

            {isGroupBooking && (
              <div className="alert alert-warning shadow">
                🏢 <strong>Đặt vé Đoàn:</strong> Mã voucher cá nhân không áp dụng. Hệ thống đã tự chiết khấu ưu đãi B2B ở Đơn hàng.
              </div>
            )}

            {/* Payment Method */}
            <div className="card bg-dark border-secondary shadow">
              <div className="card-header border-secondary text-light fw-bold">💳 Phương Thức Thanh Toán</div>
              <div className="card-body d-flex gap-4 py-4">
                {['VNPAY', 'MOMO'].map(method => (
                  <div key={method} className="form-check cursor-pointer">
                    <input className="form-check-input" type="radio" name="payment" id={method}
                      value={method} checked={paymentMethod === method}
                      onChange={() => setPaymentMethod(method)} style={{ cursor: 'pointer' }} />
                    <label className="form-check-label text-light fw-semibold" htmlFor={method} style={{ cursor: 'pointer' }}>{method}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Invoice */}
          <div className="col-lg-5">
            <div className="card bg-dark border-secondary sticky-top shadow" style={{ top: 24 }}>
              <div className="card-header border-secondary text-light fw-bold py-3 fs-5">📋 Tóm Tắt Đơn Hàng</div>
              <div className="card-body">
                {loadingPrice ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-danger" />
                    <div className="text-secondary small mt-2">Đang tính giá...</div>
                  </div>
                ) : pricePreview ? (
                  <>
                    <div className="d-flex justify-content-between text-light py-2">
                      <span>Tiền Vé ({selectedIds.length} ghế)</span>
                      <span>{fmt(Number(pricePreview.baseSubtotal) + Number(pricePreview.surchargesTotal))}</span>
                    </div>
                    {Number(pricePreview.extrasTotal) > 0 && (
                      <div className="d-flex justify-content-between text-light py-2">
                         <span>Bắp & Nước</span>
                        <span>{fmt(pricePreview.extrasTotal)}</span>
                      </div>
                    )}
                    {Number(pricePreview.promotionDiscount) > 0 && (
                      <div className="d-flex justify-content-between text-success py-2 fw-semibold">
                        <span>Giảm Giá Voucher</span>
                        <span>-{fmt(pricePreview.promotionDiscount)}</span>
                      </div>
                    )}
                    {Number(pricePreview.groupDiscount) > 0 && (
                      <div className="d-flex justify-content-between text-success py-2 fw-semibold">
                        <span>Chiết Khấu B2B</span>
                        <span>-{fmt(pricePreview.groupDiscount)}</span>
                      </div>
                    )}
                    {Number(pricePreview.taxAmount) > 0 && (
                      <div className="d-flex justify-content-between text-secondary py-2 border-top border-secondary mt-2">
                        <span>Thuế VAT (10%)</span>
                        <span>{fmt(pricePreview.taxAmount)}</span>
                      </div>
                    )}
                    <hr className="border-secondary my-3" />
                    <div className="d-flex justify-content-between text-warning fw-bold fs-4 align-items-center">
                      <span>TỔNG CỘNG</span>
                      <span>{fmt(pricePreview.finalTotal)}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-secondary text-center small py-5">Không thể tính giá vé lúc này.</div>
                )}

                <button className="btn btn-danger w-100 mt-4 fw-bold py-3 fs-5 shadow"
                  disabled={submitting || loadingPrice || !pricePreview || countdown === 0}
                  onClick={handleSubmit}>
                  {submitting ? '⏳ Đang xử lý...' : isGroupBooking ? '📋 Gửi Mẫu Đặt Đoàn' : `💳 Thanh Toán ${paymentMethod}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Checkout
