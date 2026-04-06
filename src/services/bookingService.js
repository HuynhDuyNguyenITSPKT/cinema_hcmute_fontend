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

  // ─── ADMIN ─────────────────────────────────────────────────────────────────
  getAllBookings: (status) =>
    axiosClient.get('/admin/bookings', { params: status ? { status } : {} }),

  adminCreateBooking: (data) => axiosClient.post('/admin/bookings', data),

  approveBooking: (id) => axiosClient.put(`/admin/bookings/${id}/approve`),

  adminCancelBooking: (id) => axiosClient.put(`/admin/bookings/${id}/cancel`),
}

export default bookingService
