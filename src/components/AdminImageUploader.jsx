import { useEffect, useMemo, useState } from 'react'
import uploadService from '../services/uploadService'
import { notifyError, notifySuccess } from '../utils/notify'

const MAX_SIZE_MB = 5

function AdminImageUploader({ imageUrl, onUploaded, disabled = false }) {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const displayedPreview = useMemo(() => previewUrl || imageUrl || '', [previewUrl, imageUrl])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const validateFile = (selectedFile) => {
    if (!selectedFile) {
      return 'Vui lòng chọn file ảnh.'
    }

    if (!selectedFile.type?.startsWith('image/')) {
      return 'Chỉ chấp nhận file ảnh.'
    }

    const maxBytes = MAX_SIZE_MB * 1024 * 1024

    if (selectedFile.size > maxBytes) {
      return `Kích thước file phải nhỏ hơn hoặc bằng ${MAX_SIZE_MB}MB.`
    }

    return ''
  }

  const handleSelectFile = (event) => {
    const selectedFile = event.target.files?.[0]
    const validationMessage = validateFile(selectedFile)

    if (validationMessage) {
      setFile(null)
      setError(validationMessage)
      return
    }

    setError('')
    setFile(selectedFile)

    setPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev)
      }

      return URL.createObjectURL(selectedFile)
    })
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Vui lòng chọn ảnh trước khi upload.')
      return
    }

    setUploading(true)
    setError('')

    try {
      const response = await uploadService.uploadImage(file)
      const uploadedImageUrl = response?.data

      if (!uploadedImageUrl || typeof uploadedImageUrl !== 'string') {
        throw new Error('Không nhận được URL ảnh từ server.')
      }

      onUploaded(uploadedImageUrl)
      notifySuccess('Upload ảnh thành công.')
    } catch (err) {
      const message = err?.message || 'Upload ảnh thất bại. Vui lòng thử lại.'
      setError(message)
      notifyError(message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="card border-light-subtle">
      <div className="card-body">
        <div className="d-flex flex-column flex-lg-row gap-3 align-items-lg-end">
          <div className="flex-grow-1">
            <label htmlFor="admin-image-upload" className="form-label fw-semibold mb-1">
              Ảnh (upload)
            </label>
            <input
              id="admin-image-upload"
              type="file"
              className="form-control"
              accept="image/*"
              onChange={handleSelectFile}
              disabled={disabled || uploading}
            />
            <small className="text-secondary">Chỉ chọn image/*, tối đa {MAX_SIZE_MB}MB.</small>
          </div>
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={handleUpload}
            disabled={disabled || uploading || !file}
          >
            {uploading ? 'Đang upload...' : 'Upload ảnh'}
          </button>
        </div>

        {error ? <div className="alert alert-danger mt-3 py-2 px-3 mb-0">{error}</div> : null}

        {displayedPreview ? (
          <div className="mt-3">
            <p className="mb-2 small text-secondary">Preview ảnh</p>
            <img
              src={displayedPreview}
              alt="Preview"
              style={{ width: '140px', height: '140px', objectFit: 'cover' }}
              className="rounded border"
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default AdminImageUploader
