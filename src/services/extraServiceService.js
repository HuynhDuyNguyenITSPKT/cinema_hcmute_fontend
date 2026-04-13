import axiosClient from '../api/axiosClient'

const extraServiceService = {
  getPageable: async ({ page = 0, size = 10, isActive, category } = {}) => {
    return axiosClient.get('/admin/extra-services', {
      params: {
        page,
        size,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
        ...(category ? { category } : {}),
      },
    })
  },

  getPublicPageable: async ({ page = 0, size = 12, isActive = true, category } = {}) => {
    return axiosClient.get('/extra-services', {
      params: {
        page,
        size,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
        ...(category ? { category } : {}),
      },
    })
  },

  getById: async (id) => {
    return axiosClient.get(`/extra-services/${id}`)
  },

  create: async (payload) => {
    return axiosClient.post('/admin/extra-services', payload)
  },

  update: async (id, payload) => {
    return axiosClient.put(`/admin/extra-services/${id}`, payload)
  },

  remove: async (id) => {
    return axiosClient.delete(`/admin/extra-services/${id}`)
  },
}

export default extraServiceService
