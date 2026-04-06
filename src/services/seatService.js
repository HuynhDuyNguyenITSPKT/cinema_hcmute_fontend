import axiosClient from '../api/axiosClient'

const seatService = {
  /**
   * GET /api/showtimes/{showtimeId}/seat-map
   * Trả về mảng ghế với trạng thái: AVAILABLE | LOCKED | BOOKED
   */
  getSeatMap: (showtimeId) =>
    axiosClient.get(`/showtimes/${showtimeId}/seat-map`),

  /**
   * POST /api/showtimes/{showtimeId}/seats/lock
   * Lock tạm danh sách ghế (TTL 10 phút RAM).
   * All-or-nothing: nếu 1 ghế bị giật trước thì throw error toàn bộ.
   */
  lockSeats: (showtimeId, seatIds) =>
    axiosClient.post(`/showtimes/${showtimeId}/seats/lock`, { seatIds }),

  /**
   * DELETE /api/showtimes/{showtimeId}/seats/unlock
   * Nhả ghế khi user thoát trang hoặc hết TTL.
   */
  unlockSeats: (showtimeId, seatIds) =>
    axiosClient.delete(`/showtimes/${showtimeId}/seats/unlock`, { data: { seatIds } }),
}

export default seatService
