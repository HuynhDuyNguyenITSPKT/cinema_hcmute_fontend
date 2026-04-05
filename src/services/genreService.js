import axiosClient from '../api/axiosClient'

const genreService = {
  getPageable: ({ page = 0, size = 100 } = {}) =>
    axiosClient.get('/admin/genres', { params: { page, size } }),

  getAll: () => axiosClient.get('/genres'),

  create: (payload) => axiosClient.post('/admin/genres', payload),

  update: (id, payload) => axiosClient.put(`/admin/genres/${id}`, payload),

  remove: (id) => axiosClient.delete(`/admin/genres/${id}`),
}

export default genreService
