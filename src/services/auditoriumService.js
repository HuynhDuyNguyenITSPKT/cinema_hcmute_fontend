import axiosClient from '../api/axiosClient'

const auditoriumService = {
  getPageable: (params) => axiosClient.get('/admin/auditoriums', { params }),
  getAll: () => axiosClient.get('/auditoriums'),
}

export default auditoriumService
