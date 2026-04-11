import axiosClient from '../api/axiosClient'

function withOptionalNumberParam(value, key) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return {}
  }

  return { [key]: parsed }
}

function withOptionalStringParam(value, key) {
  const normalized = String(value || '').trim()

  if (!normalized) {
    return {}
  }

  return { [key]: normalized }
}

const reviewService = {
  create: async (payload) => {
    return axiosClient.post('/reviews', payload)
  },

  getMoviePageable: async ({
    movieId,
    minRating,
    maxRating,
    sortBy = 'createdAt',
    sortDir = 'desc',
    page = 0,
    size = 10,
  } = {}) => {
    const normalizedMovieId = String(movieId || '').trim()

    if (!normalizedMovieId) {
      throw new Error('movieId là bắt buộc.')
    }

    return axiosClient.get(`/reviews/movies/${normalizedMovieId}`, {
      params: {
        ...withOptionalNumberParam(minRating, 'minRating'),
        ...withOptionalNumberParam(maxRating, 'maxRating'),
        ...withOptionalStringParam(sortBy, 'sortBy'),
        ...withOptionalStringParam(sortDir, 'sortDir'),
        page,
        size,
      },
    })
  },

  getMyPageable: async ({
    movieId,
    sortBy = 'createdAt',
    sortDir = 'desc',
    page = 0,
    size = 10,
  } = {}) => {
    return axiosClient.get('/reviews/my', {
      params: {
        ...withOptionalStringParam(movieId, 'movieId'),
        ...withOptionalStringParam(sortBy, 'sortBy'),
        ...withOptionalStringParam(sortDir, 'sortDir'),
        page,
        size,
      },
    })
  },

  update: async (reviewId, payload) => {
    return axiosClient.put(`/reviews/${reviewId}`, payload)
  },

  remove: async (reviewId) => {
    return axiosClient.delete(`/reviews/${reviewId}`)
  },

  getPublicRatingStats: async (movieId) => {
    const normalizedMovieId = String(movieId || '').trim()

    if (!normalizedMovieId) {
      throw new Error('movieId là bắt buộc.')
    }

    return axiosClient.get(`/public/cinema/movies/${normalizedMovieId}/rating-stats`)
  },

  getAdminPageable: async ({
    movieId,
    minRating,
    maxRating,
    fromDate,
    toDate,
    keyword,
    sortBy = 'createdAt',
    sortDir = 'desc',
    page = 0,
    size = 10,
  } = {}) => {
    return axiosClient.get('/admin/reviews', {
      params: {
        ...withOptionalStringParam(movieId, 'movieId'),
        ...withOptionalNumberParam(minRating, 'minRating'),
        ...withOptionalNumberParam(maxRating, 'maxRating'),
        ...withOptionalStringParam(fromDate, 'fromDate'),
        ...withOptionalStringParam(toDate, 'toDate'),
        ...withOptionalStringParam(keyword, 'keyword'),
        ...withOptionalStringParam(sortBy, 'sortBy'),
        ...withOptionalStringParam(sortDir, 'sortDir'),
        page,
        size,
      },
    })
  },

  removeByAdmin: async (reviewId) => {
    return axiosClient.delete(`/admin/reviews/${reviewId}`)
  },
}

export default reviewService
