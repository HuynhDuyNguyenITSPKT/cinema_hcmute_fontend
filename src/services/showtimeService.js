import axiosClient from '../api/axiosClient'

const showtimeService = {
  getAll: () => axiosClient.get('/admin/showtimes'),

  getById: (id) => axiosClient.get(`/admin/showtimes/${id}`),

  create: (payload) => axiosClient.post('/admin/showtimes', payload),

  update: (id, payload) => axiosClient.put(`/admin/showtimes/${id}`, payload),

  remove: (id) => axiosClient.delete(`/admin/showtimes/${id}`),

  // Backward-compatible alias for old callers.
  delete: (id) => axiosClient.delete(`/admin/showtimes/${id}`),
}

export default showtimeService
