import axiosClient from '../api/axiosClient'

const movieService = {
  // PUBLIC — Dùng cho trang Home và Movie listing
  getPublicMovies: (params = {}) =>
    axiosClient.get('/public/cinema/movies', { params }),

  getShowtimesByMovieAndDate: (movieId, date) =>
    axiosClient.get(`/public/cinema/movies/${movieId}/showtimes`, { params: { date } }),

  getMovieById: (id) => axiosClient.get(`/public/cinema/movies/${id}`),

  // ADMIN — Cần JWT role=ADMIN
  getAllMoviesAdmin: () => axiosClient.get('/admin/movies'),

  createMovie: (data) => axiosClient.post('/admin/movies', data),

  updateMovie: (id, data) => axiosClient.put(`/admin/movies/${id}`, data),

  deleteMovie: (id) => axiosClient.delete(`/admin/movies/${id}`),
}

export default movieService
