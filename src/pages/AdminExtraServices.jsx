import { useEffect, useMemo, useState } from 'react'
import AdminImageUploader from '../components/AdminImageUploader'
import extraServiceService from '../services/extraServiceService'
import { notifyError, notifySuccess } from '../utils/notify'

const PAGE_SIZE = 10
const CATEGORIES = ['FOOD', 'DRINK', 'COMBO', 'OTHER']

const EMPTY_FORM = {
  name: '',
  imageUrl: '',
  price: 0,
  description: '',
  category: '',
  isActive: true,
}

function getEntityId(item) {
  return item?.id ?? item?.extraServiceId
}

function AdminExtraServices() {
  const [loading, setLoading] = useState(false)
  const [pageData, setPageData] = useState({
    currentItems: [],
    currentPage: 0,
    totalPages: 0,
    totalItems: 0,
  })

  const [isActiveFilter, setIsActiveFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [deletingId, setDeletingId] = useState(null)

  const [form, setForm] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [detailLoading, setDetailLoading] = useState(false)
  const [selectedDetail, setSelectedDetail] = useState(null)

  const fetchData = async (page = 0, overrides = {}) => {
    setLoading(true)

    try {
      const effectiveIsActive = overrides.isActiveFilter ?? isActiveFilter
      const effectiveCategory = overrides.categoryFilter ?? categoryFilter

      const response = await extraServiceService.getPageable({
        page,
        size: PAGE_SIZE,
        isActive: effectiveIsActive === 'all' ? undefined : effectiveIsActive === 'true',
        category: effectiveCategory === 'all' ? undefined : effectiveCategory,
      })

      const data = response?.data || {}

      setPageData({
        currentItems: data.currentItems || [],
        currentPage: data.currentPage || 0,
        totalPages: data.totalPages || 0,
        totalItems: data.totalItems || 0,
      })
    } catch (err) {
      notifyError(err?.message || 'Không thể tải danh sách extra service.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const validateForm = () => {
    const errors = {}

    if (!form.name.trim()) {
      errors.name = 'Tên dịch vụ là bắt buộc.'
    }

    if (!form.imageUrl.trim()) {
      errors.imageUrl = 'Image URL là bắt buộc.'
    }

    if (Number(form.price) < 0) {
      errors.price = 'Giá phải lớn hơn hoặc bằng 0.'
    }

    if (!form.category) {
      errors.category = 'Danh mục là bắt buộc.'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    setSubmitting(true)

    const payload = {
      name: form.name.trim(),
      imageUrl: form.imageUrl.trim(),
      price: Number(form.price),
      description: form.description?.trim() || undefined,
      category: form.category,
      isActive: Boolean(form.isActive),
    }

    try {
      if (editingId) {
        await extraServiceService.update(editingId, payload)
        notifySuccess('Cập nhật extra service thành công.')
      } else {
        await extraServiceService.create(payload)
        notifySuccess('Tạo extra service thành công.')
      }

      await fetchData(pageData.currentPage)
      setEditingId(null)
      setForm(EMPTY_FORM)
      setFormErrors({})
    } catch (err) {
      notifyError(err?.message || 'Lưu extra service thất bại.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!id) {
      return
    }

    const confirmed = window.confirm('Bạn có chắc chắn muốn xóa extra service này?')

    if (!confirmed) {
      return
    }

    setDeletingId(id)

    try {
      await extraServiceService.remove(id)
      notifySuccess('Xóa extra service thành công.')
      await fetchData(pageData.currentPage)

      if (editingId === id) {
        setEditingId(null)
        setForm(EMPTY_FORM)
      }

      if (getEntityId(selectedDetail) === id) {
        setSelectedDetail(null)
      }
    } catch (err) {
      notifyError(err?.message || 'Xóa extra service thất bại.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleView = async (id) => {
    if (!id) {
      return
    }

    setDetailLoading(true)

    try {
      const response = await extraServiceService.getById(id)
      setSelectedDetail(response?.data || null)
    } catch (err) {
      notifyError(err?.message || 'Không thể lấy chi tiết extra service.')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleEdit = async (id) => {
    if (!id) {
      return
    }

    setDetailLoading(true)

    try {
      const response = await extraServiceService.getById(id)
      const data = response?.data

      if (!data) {
        throw new Error('Không tìm thấy dữ liệu extra service.')
      }

      setEditingId(id)
      setSelectedDetail(data)
      setForm({
        name: data.name || '',
        imageUrl: data.imageUrl || '',
        price: Number(data.price) || 0,
        description: data.description || '',
        category: data.category || '',
        isActive: typeof data.isActive === 'boolean' ? data.isActive : true,
      })
      setFormErrors({})
    } catch (err) {
      notifyError(err?.message || 'Không thể tải dữ liệu để chỉnh sửa.')
    } finally {
      setDetailLoading(false)
    }
  }

  const paginationLabel = useMemo(() => {
    return `Trang ${pageData.currentPage + 1}/${Math.max(pageData.totalPages, 1)} - Tổng ${pageData.totalItems} bản ghi`
  }, [pageData.currentPage, pageData.totalItems, pageData.totalPages])

  return (
    <section className="container-fluid px-2 px-md-3 px-xl-4">
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body p-3 p-md-4">
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-3">
            <div>
              <h2 className="h4 mb-1">Quản lý Extra Services</h2>
              <p className="text-secondary mb-0">Danh sách FOOD, DRINK, COMBO, OTHER.</p>
            </div>
            <span className="badge text-bg-dark px-3 py-2 rounded-pill">Tổng: {pageData.totalItems}</span>
          </div>

          <div className="row g-2 align-items-end mb-3">
            <div className="col-12 col-md-4">
              <label className="form-label small text-secondary">Trạng thái</label>
              <select
                className="form-select"
                value={isActiveFilter}
                onChange={(event) => setIsActiveFilter(event.target.value)}
              >
                <option value="all">Tất cả</option>
                <option value="true">Đang hoạt động</option>
                <option value="false">Vô hiệu hóa</option>
              </select>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label small text-secondary">Danh mục</label>
              <select
                className="form-select"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <option value="all">Tất cả danh mục</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-4 d-grid d-md-flex justify-content-md-end gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => fetchData(0)}
                disabled={loading}
              >
                {loading ? 'Đang tải...' : 'Lọc'}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  setIsActiveFilter('all')
                  setCategoryFilter('all')
                  fetchData(0, { isActiveFilter: 'all', categoryFilter: 'all' })
                }}
                disabled={loading}
              >
                Reset
              </button>
            </div>
          </div>

          <div className="table-responsive border rounded-3 bg-white">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>isActive</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {!loading && pageData.currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center text-secondary py-4">Không có dữ liệu.</td>
                  </tr>
                ) : null}

                {pageData.currentItems.map((item) => {
                  const id = getEntityId(item)

                  return (
                    <tr key={id}>
                      <td>{id}</td>
                      <td>
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name || 'extra-service'}
                            style={{ width: '54px', height: '54px', objectFit: 'cover' }}
                            className="rounded border"
                          />
                        ) : (
                          <span className="text-secondary">-</span>
                        )}
                      </td>
                      <td className="fw-semibold">{item.name || '-'}</td>
                      <td><span className="badge text-bg-info">{item.category || '-'}</span></td>
                      <td>{Number(item.price || 0).toLocaleString('vi-VN')} đ</td>
                      <td>
                        <span className={`badge ${item.isActive ? 'text-bg-success' : 'text-bg-secondary'}`}>
                          {item.isActive ? 'true' : 'false'}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-2">
                          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => handleView(id)}>
                            View
                          </button>
                          <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => handleEdit(id)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(id)}
                            disabled={deletingId === id}
                          >
                            {deletingId === id ? 'Đang xóa...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mt-3">
            <p className="text-secondary mb-0">{paginationLabel}</p>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => fetchData(pageData.currentPage - 1)}
                disabled={loading || pageData.currentPage <= 0}
              >
                Trước
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => fetchData(pageData.currentPage + 1)}
                disabled={loading || pageData.currentPage >= pageData.totalPages - 1 || pageData.totalPages === 0}
              >
                Sau
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-8">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-3 p-md-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 className="h5 mb-0">{editingId ? `Cập nhật Extra Service #${editingId}` : 'Tạo Extra Service mới'}</h3>
                {editingId ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                      setEditingId(null)
                      setForm(EMPTY_FORM)
                      setFormErrors({})
                    }}
                  >
                    Hủy chỉnh sửa
                  </button>
                ) : null}
              </div>

              <form className="row g-3" onSubmit={handleSubmit}>
                <div className="col-12">
                  <AdminImageUploader
                    imageUrl={form.imageUrl}
                    onUploaded={(url) => {
                      setForm((prev) => ({ ...prev, imageUrl: url }))
                      setFormErrors((prev) => ({ ...prev, imageUrl: undefined }))
                    }}
                    disabled={submitting}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Image URL (nhập tay)</label>
                  <input
                    type="text"
                    className={`form-control ${formErrors.imageUrl ? 'is-invalid' : ''}`}
                    value={form.imageUrl}
                    onChange={(event) => setForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
                    placeholder="https://..."
                  />
                  {formErrors.imageUrl ? <div className="invalid-feedback">{formErrors.imageUrl}</div> : null}
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                  {formErrors.name ? <div className="invalid-feedback">{formErrors.name}</div> : null}
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Category</label>
                  <select
                    className={`form-select ${formErrors.category ? 'is-invalid' : ''}`}
                    value={form.category}
                    onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                  >
                    <option value="">Chọn danh mục</option>
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  {formErrors.category ? <div className="invalid-feedback">{formErrors.category}</div> : null}
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Price</label>
                  <input
                    type="number"
                    min="0"
                    className={`form-control ${formErrors.price ? 'is-invalid' : ''}`}
                    value={form.price}
                    onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                  />
                  {formErrors.price ? <div className="invalid-feedback">{formErrors.price}</div> : null}
                </div>

                <div className="col-12 col-md-6 d-flex align-items-end">
                  <div className="form-check form-switch">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="extra-service-is-active"
                      checked={Boolean(form.isActive)}
                      onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                    />
                    <label htmlFor="extra-service-is-active" className="form-check-label">isActive</label>
                  </div>
                </div>

                <div className="col-12">
                  <label className="form-label">Description</label>
                  <textarea
                    rows="3"
                    className="form-control"
                    value={form.description}
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  />
                </div>

                <div className="col-12 d-flex gap-2">
                  <button type="submit" className="btn btn-success" disabled={submitting}>
                    {submitting ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Tạo mới'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-3 p-md-4">
              <h3 className="h6 mb-3">Chi tiết Extra Service</h3>

              {detailLoading ? <p className="text-secondary mb-0">Đang tải chi tiết...</p> : null}

              {!detailLoading && !selectedDetail ? (
                <p className="text-secondary mb-0">Chọn View hoặc Edit để xem chi tiết.</p>
              ) : null}

              {!detailLoading && selectedDetail ? (
                <div className="d-grid gap-2 small">
                  <div><strong>ID:</strong> {getEntityId(selectedDetail)}</div>
                  <div><strong>Name:</strong> {selectedDetail.name || '-'}</div>
                  <div><strong>Category:</strong> {selectedDetail.category || '-'}</div>
                  <div><strong>Price:</strong> {Number(selectedDetail.price || 0).toLocaleString('vi-VN')} đ</div>
                  <div><strong>isActive:</strong> {selectedDetail.isActive ? 'true' : 'false'}</div>
                  <div><strong>Description:</strong> {selectedDetail.description || '-'}</div>
                  {selectedDetail.imageUrl ? (
                    <img
                      src={selectedDetail.imageUrl}
                      alt={selectedDetail.name || 'extra-service-detail'}
                      className="rounded border mt-2"
                      style={{ width: '100%', maxHeight: '220px', objectFit: 'cover' }}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AdminExtraServices
