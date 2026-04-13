import axiosClient from '../api/axiosClient'

const bookingService = {
  /**
   * POST /api/bookings
   * Tạo booking — Gọi BookingFacade orchestration (Proxy → Lock → Builder → IPayment)
   */
  createBooking: (data) => axiosClient.post('/bookings', data),

  /**
   * POST /api/bookings/calculate-price
   * Preview hóa đơn không lưu DB. Payload giống createBooking.
   * Trả về PricePreviewResponse: baseSubtotal, surchargesTotal, promotionDiscount, extrasTotal, taxAmount, finalTotal
   */
  calculatePreviewPrice: (data) => axiosClient.post('/bookings/calculate-price', data),

  /**
   * GET /api/bookings/my
   * Lịch sử đặt vé của user đang đăng nhập.
   */
  getMyBookings: () => axiosClient.get('/bookings/my'),

  /**
   * GET /api/bookings/{id}
   */
  getBookingById: (id) => axiosClient.get(`/bookings/${id}`),

  /**
   * POST /api/bookings/{id}/cancel
   */
  cancelBooking: (id) => axiosClient.post(`/bookings/${id}/cancel`),

  /**
   * POST /api/payment/user/payment-url?method=VNPAY|MOMO
   * Dành cho User tạo URL thanh toán cho booking RESERVED (bao gồm B2B đã được Admin duyệt).
   */
  createPaymentUrl: (bookingId, amount, movieName, method) =>
    axiosClient.post(`/payment/user/payment-url?method=${method}`, {
      bookingId,
      amount,
      description: `Mua ve xem phim ${movieName || ''}`,
    }),

  // ─── ADMIN ─────────────────────────────────────────────────────────────────

  getAllBookings: (status) =>
    axiosClient.get('/admin/bookings', { params: status ? { status } : {} }),

  /**
   * PUT /api/admin/bookings/{id}/update-seats
   * Admin cập nhật ghế cuối cùng + duyệt đơn B2B.
   * Hệ thống gọi lại GroupBookingBuilder để tính lại Pipeline giá (GroupDiscount 5% + VAT).
   * @param {string} id - bookingId
   * @param {{ showtimeId?: string, seatIds: string[], adminNote?: string }} data
   */
  updateGroupSeats: (id, data) => axiosClient.put(`/admin/bookings/${id}/update-seats`, data),

  /**
   * PUT /api/admin/bookings/{id}/approve
   * Duyệt nhanh (không đổi ghế) — PENDING_APPROVAL → RESERVED
   */
  approveBooking: (id) => axiosClient.put(`/admin/bookings/${id}/approve`),

  adminCancelBooking: (id) => axiosClient.put(`/admin/bookings/${id}/cancel`),
}

export default bookingService
