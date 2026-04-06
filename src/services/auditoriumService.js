import axiosClient from '../api/axiosClient'

const auditoriumService = {
  getPageable: (params) => axiosClient.get('/admin/auditoriums', { params }),
  getAll: () => axiosClient.get('/auditoriums'),

  getById: (id) => axiosClient.get(`/auditoriums/${id}`),

  create: (data) => axiosClient.post('/admin/auditoriums', data),

  update: (id, data) => axiosClient.put(`/admin/auditoriums/${id}`, data),

  delete: (id) => axiosClient.delete(`/admin/auditoriums/${id}`),

  /**
   * PUT /api/admin/auditoriums/{id}/regenerate-seats
   * Dùng khi admin thay đổi layout vật lý phòng chiếu.
   * Toàn bộ ghế cũ bị xóa, generate lại theo SeatLayoutConfig mới.
   */
  regenerateSeats: (id, data) =>
    axiosClient.put(`/admin/auditoriums/${id}/regenerate-seats`, data),
}

export default auditoriumService
