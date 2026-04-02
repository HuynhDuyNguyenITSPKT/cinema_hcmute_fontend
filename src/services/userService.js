import axiosClient from '../api/axiosClient'

const userService = {
  getPageable: async ({ page = 0, size = 10, keyword = '' } = {}) => {
    return axiosClient.get('/users/pageable', {
      params: { page, size, keyword },
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
