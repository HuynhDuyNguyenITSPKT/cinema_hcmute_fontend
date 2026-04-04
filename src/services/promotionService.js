import axiosClient from '../api/axiosClient'

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
