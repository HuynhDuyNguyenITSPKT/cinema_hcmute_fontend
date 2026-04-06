import axiosClient from '../api/axiosClient'

const publicService = {
  searchMovies: ({ keyword = '', genreId = '', status = '', page = 0, size = 12 } = {}) =>
    axiosClient.get('/public/cinema/movies', {
      params: {
        ...(keyword ? { keyword } : {}),
        ...(genreId ? { genreId } : {}),
        ...(status ? { status } : {}),
        page,
        size,
      },
    }),

  getShowtimesByMovie: (movieId, date) =>
    axiosClient.get(`/public/cinema/movies/${movieId}/showtimes`, { params: { date } }),

  getGenres: () => axiosClient.get('/genres'),

  loadMovieListPage: async ({ keyword = '', genreId = '', status = '', page = 0, size = 12 } = {}) => {
    const [moviesRes, genresRes] = await Promise.all([
      axiosClient.get('/public/cinema/movies', {
        params: {
          ...(keyword ? { keyword } : {}),
          ...(genreId ? { genreId } : {}),
          ...(status ? { status } : {}),
          page,
          size,
        },
      }),
      axiosClient.get('/genres'),
    ])
    return { moviesRes, genresRes }
  },
}

export default publicService
