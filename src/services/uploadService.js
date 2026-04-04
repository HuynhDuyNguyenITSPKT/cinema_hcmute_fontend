import axiosClient from '../api/axiosClient'

const uploadService = {
  uploadImage: async (file) => {
    const formData = new FormData()
    formData.append('file', file)

    return axiosClient.post('/admin/uploads/images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
}

export default uploadService
