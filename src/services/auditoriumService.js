import axiosClient from '../api/axiosClient'

const auditoriumService = {
  getAll: () => axiosClient.get('/auditoriums'),
}

export default auditoriumService
