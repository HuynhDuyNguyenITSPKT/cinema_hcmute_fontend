import axiosClient from '../api/axiosClient'

const movieService = {
  getPageable: ({ page = 0, size = 10 } = {}) =>
    axiosClient.get('/admin/movies', { params: { page, size } }),

  getById: (id) => axiosClient.get(`/admin/movies/${id}`),

  create: (payload) => axiosClient.post('/admin/movies', payload),

  update: (id, payload) => axiosClient.put(`/admin/movies/${id}`, payload),

  remove: (id) => axiosClient.delete(`/admin/movies/${id}`),
}

export default movieService
