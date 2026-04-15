import axiosClient from '../api/axiosClient'
import { getAccessToken } from '../utils/tokenStorage'

function normalizeSeatIds(seatIds) {
  if (!Array.isArray(seatIds)) return []
  return [...new Set(seatIds.filter(Boolean))]
}

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

  /**
   * Best-effort unlock during pagehide/reload/close.
   * Uses fetch keepalive to increase chance request reaches server before tab dies.
   */
  unlockSeatsOnExit: (showtimeId, seatIds) => {
    const normalizedIds = normalizeSeatIds(seatIds)
    if (!showtimeId || normalizedIds.length === 0 || typeof window === 'undefined') {
      return
    }

    const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/$/, '')
    const token = getAccessToken()
    const headers = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    fetch(`${apiBase}/showtimes/${showtimeId}/seats/unlock-on-exit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ seatIds: normalizedIds }),
      keepalive: true,
    }).catch(() => {})
  },
}

export default seatService
