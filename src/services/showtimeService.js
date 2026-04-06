import axiosClient from '../api/axiosClient'

const showtimeService = {
  getAll: () => axiosClient.get('/admin/showtimes'),

  getById: (id) => axiosClient.get(`/admin/showtimes/${id}`),

  create: (data) => axiosClient.post('/admin/showtimes', data),

  update: (id, data) => axiosClient.put(`/admin/showtimes/${id}`, data),

  delete: (id) => axiosClient.delete(`/admin/showtimes/${id}`),
}

export default showtimeService
