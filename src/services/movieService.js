import axiosClient from '../api/axiosClient'

const movieService = {
  // PUBLIC
  getPublicMovies: (params = {}) =>
    axiosClient.get('/public/cinema/movies', { params }),

  getShowtimesByMovieAndDate: (movieId, date) =>
    axiosClient.get(`/public/cinema/movies/${movieId}/showtimes`, { params: { date } }),

  getMovieById: (id) => axiosClient.get(`/public/cinema/movies/${id}`),

  // ADMIN (new naming)
  getPageable: ({ page = 0, size = 10, keyword = '', genreId = '' } = {}) =>
    axiosClient.get('/admin/movies', {
      params: {
        page,
        size,
        ...(keyword ? { keyword } : {}),
        ...(genreId ? { genreId } : {}),
      },
    }),

  getById: (id) => axiosClient.get(`/admin/movies/${id}`),

  create: (payload) => axiosClient.post('/admin/movies', payload),

  update: (id, payload) => axiosClient.put(`/admin/movies/${id}`, payload),

  remove: (id) => axiosClient.delete(`/admin/movies/${id}`),

  // ADMIN (legacy aliases - keep old callers working)
  getAllMoviesAdmin: () => axiosClient.get('/admin/movies'),
  createMovie: (data) => axiosClient.post('/admin/movies', data),
  updateMovie: (id, data) => axiosClient.put(`/admin/movies/${id}`, data),
  deleteMovie: (id) => axiosClient.delete(`/admin/movies/${id}`),
}

export default movieService
