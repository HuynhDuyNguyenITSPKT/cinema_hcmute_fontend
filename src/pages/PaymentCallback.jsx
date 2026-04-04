import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'

function normalizeMethod(method) {
  const normalized = (method || '').toString().trim().toLowerCase()

  if (normalized === 'vnpay' || normalized === 'momo') {
    return normalized
  }

  return 'unknown'
}

function parseSuccess(value) {
  const normalized = (value || '').toString().trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'success'
}

function resolveMethodLabel(method) {
  if (method === 'vnpay') {
    return 'VNPay'
  }

  if (method === 'momo') {
    return 'MoMo'
  }

  return 'Không xác định'
}

function resolveStatusLabel(paymentStatus) {
  const normalized = (paymentStatus || '').toString().trim().toLowerCase()

  if (!normalized) {
    return 'Chưa có trạng thái'
  }

  if (normalized === 'paid' || normalized === 'success' || normalized === 'completed') {
    return 'Đã thanh toán'
  }

  if (normalized === 'failed' || normalized === 'cancelled' || normalized === 'canceled') {
    return 'Thanh toán lỗi'
  }

  if (normalized === 'pending' || normalized === 'processing') {
    return 'Đang xử lý'
  }

  return paymentStatus
}

function PaymentCallback() {
  const location = useLocation()

  const payload = useMemo(() => {
    const params = new URLSearchParams(location.search)
    const method = normalizeMethod(params.get('method'))

    return {
      isSuccess: parseSuccess(params.get('success')),
      message: (params.get('message') || '').trim(),
      bookingId: (params.get('bookingId') || '').trim(),
      paymentStatus: (params.get('paymentStatus') || '').trim(),
      gatewayCode: (params.get('gatewayCode') || '').trim(),
      method,
      methodLabel: resolveMethodLabel(method),
    }
  }, [location.search])

  const statusLabel = resolveStatusLabel(payload.paymentStatus)

  return (
    <section className="payment-callback-page">
      <div className="payment-callback-glow payment-callback-glow-left" aria-hidden="true" />
      <div className="payment-callback-glow payment-callback-glow-right" aria-hidden="true" />

      <article className="payment-callback-card" aria-live="polite">
        <header className="payment-callback-head">
          <p className="payment-callback-kicker">Transaction Summary</p>
          <h1>Kết quả thanh toán</h1>
          <p className={`payment-callback-result ${payload.isSuccess ? 'success' : 'danger'}`}>
            {payload.isSuccess ? 'Thanh toán thành công' : 'Thanh toán thất bại'}
          </p>
        </header>

        <div className="payment-callback-chip-row">
          <span className="payment-callback-chip">Phương thức: {payload.methodLabel}</span>
          <span className="payment-callback-chip">Trạng thái: {statusLabel}</span>
        </div>

        <dl className="payment-callback-grid">
          <div className="payment-callback-item">
            <dt>Mã đặt vé</dt>
            <dd>{payload.bookingId || 'N/A'}</dd>
          </div>

          <div className="payment-callback-item payment-callback-item-full">
            <dt>Thông điệp từ hệ thống</dt>
            <dd>{payload.message || 'Không có thông điệp chi tiết.'}</dd>
          </div>
        </dl>

        <div className="payment-callback-actions">
          <Link to="/" className="payment-btn payment-btn-primary">Về trang chủ</Link>
          <Link to="/user/profile" className="payment-btn payment-btn-soft">Xem hồ sơ</Link>
        </div>
      </article>
    </section>
  )
}

export default PaymentCallback