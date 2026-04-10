import axiosClient from '../api/axiosClient'

const userService = {
  getPageable: async ({ page = 0, size = 10, keyword = '', email = '', phone = '', status } = {}) => {
    return axiosClient.get('/users/pageable', {
      params: {
        page,
        size,
        ...(keyword ? { keyword } : {}),
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
        ...(typeof status === 'boolean' ? { status } : {}),
      },
    })
  },

  updateProfile: async (payload) => {
    return axiosClient.put('/users/profile', payload)
  },

  updateStatus: async (userId, active) => {
    return axiosClient.put(`/users/account/status/${userId}`, { active }, {
      params: { active },
    })
  },
}

export default userService
