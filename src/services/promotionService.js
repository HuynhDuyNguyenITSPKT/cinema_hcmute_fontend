import axiosClient from '../api/axiosClient'

const PUBLIC_PROMOTION_LIST_ENDPOINTS = ['/public/promotions']

async function tryRequest(endpoints, requestFactory) {
  let lastError = null

  for (const endpoint of endpoints) {
    try {
      return await requestFactory(endpoint)
    } catch (err) {
      lastError = err
    }
  }

  throw lastError || new Error('Không thể tải dữ liệu khuyến mãi.')
}

const promotionService = {
  getPageable: async ({ page = 0, size = 10, isActive } = {}) => {
    return axiosClient.get('/admin/promotions', {
      params: {
        page,
        size,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
    })
  },

  getPublicPageable: async ({ page = 0, size = 12, isActive = true } = {}) => {
    const params = {
      page,
      size,
      ...(typeof isActive === 'boolean' ? { isActive } : {}),
    }

    return tryRequest(PUBLIC_PROMOTION_LIST_ENDPOINTS, (endpoint) => axiosClient.get(endpoint, { params }))
  },

  getById: async (id) => {
    return axiosClient.get(`/admin/promotions/${id}`)
  },

  create: async (payload) => {
    return axiosClient.post('/admin/promotions', payload)
  },

  update: async (id, payload) => {
    return axiosClient.put(`/admin/promotions/${id}`, payload)
  },

  remove: async (id) => {
    return axiosClient.delete(`/admin/promotions/${id}`)
  },
}

export default promotionService
