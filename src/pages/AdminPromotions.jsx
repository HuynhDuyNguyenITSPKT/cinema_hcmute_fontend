import { useEffect, useMemo, useState } from 'react'
import AdminImageUploader from '../components/AdminImageUploader'
import promotionService from '../services/promotionService'
import { notifyError, notifySuccess } from '../utils/notify'

const PAGE_SIZE = 10
const DISCOUNT_TYPES = ['PERCENTAGE', 'FIXED_AMOUNT']

const EMPTY_FORM = {
  name: '',
  description: '',
  discountType: '',
  discountValue: 0,
  maxDiscountAmount: '',
  minTicketRequired: '',
  minOrderValue: '',
  startDate: '',
  endDate: '',
  code: '',
  quantity: 0,
  isActive: true,
  imageUrl: '',
}

function getEntityId(item) {
  return item?.id ?? item?.promotionId
}

function toLocalDateTimeInput(isoDateTime) {
  if (!isoDateTime) {
    return ''
  }

  const date = new Date(isoDateTime)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const tzOffset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
}

function toIsoDateTime(localDateTime) {
  if (!localDateTime) {
    return null
  }

  const date = new Date(localDateTime)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString()
}

function formatDateTime(isoDateTime) {
  if (!isoDateTime) {
    return '-'
  }

  const date = new Date(isoDateTime)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleString('vi-VN')
}

function normalizeIsActive(value) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value === 1
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()

    if (normalized === 'true' || normalized === '1') {
      return true
    }

    if (normalized === 'false' || normalized === '0') {
      return false
    }
  }

  return false
}

function AdminPromotions() {
  const [loading, setLoading] = useState(false)
  const [pageData, setPageData] = useState({
    currentItems: [],
    currentPage: 0,
    totalPages: 0,
    totalItems: 0,
  })

  const [isActiveFilter, setIsActiveFilter] = useState('all')
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

      const response = await promotionService.getPageable({
        page,
        size: PAGE_SIZE,
        isActive: effectiveIsActive === 'all' ? undefined : effectiveIsActive === 'true',
      })

      const data = response?.data || {}

      setPageData({
        currentItems: (data.currentItems || []).map((item) => ({
          ...item,
          isActive: normalizeIsActive(item?.isActive),
        })),
        currentPage: data.currentPage || 0,
        totalPages: data.totalPages || 0,
        totalItems: data.totalItems || 0,
      })
    } catch (err) {
      notifyError(err?.message || 'Không thể tải danh sách promotion.')
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
      errors.name = 'Tên khuyến mãi là bắt buộc.'
    }

    if (!form.description.trim()) {
      errors.description = 'Mô tả là bắt buộc.'
    }

    if (!form.discountType) {
      errors.discountType = 'Loại giảm giá là bắt buộc.'
    }

    if (Number(form.discountValue) < 0) {
      errors.discountValue = 'Giá trị giảm phải lớn hơn hoặc bằng 0.'
    }

    if (Number(form.quantity) < 0) {
      errors.quantity = 'Số lượng phải lớn hơn hoặc bằng 0.'
    }

    if (form.minTicketRequired !== '' && Number(form.minTicketRequired) < 1) {
      errors.minTicketRequired = 'minTicketRequired phải lớn hơn hoặc bằng 1 nếu có nhập.'
    }

    if (!form.startDate) {
      errors.startDate = 'startDate là bắt buộc.'
    }

    if (!form.endDate) {
      errors.endDate = 'endDate là bắt buộc.'
    }

    if (form.startDate && form.endDate) {
      const start = new Date(form.startDate).getTime()
      const end = new Date(form.endDate).getTime()

      if (!Number.isNaN(start) && !Number.isNaN(end) && end <= start) {
        errors.endDate = 'endDate phải sau startDate.'
      }
    }

    if (!form.code.trim()) {
      errors.code = 'Mã code là bắt buộc.'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    const startIso = toIsoDateTime(form.startDate)
    const endIso = toIsoDateTime(form.endDate)

    if (!startIso || !endIso) {
      notifyError('startDate hoặc endDate không hợp lệ.')
      return
    }

    setSubmitting(true)

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      maxDiscountAmount: form.maxDiscountAmount === '' ? undefined : Number(form.maxDiscountAmount),
      minTicketRequired: form.minTicketRequired === '' ? undefined : Number(form.minTicketRequired),
      minOrderValue: form.minOrderValue === '' ? undefined : Number(form.minOrderValue),
      startDate: startIso,
      endDate: endIso,
      code: form.code.trim(),
      quantity: Number(form.quantity),
      isActive: normalizeIsActive(form.isActive),
      imageUrl: form.imageUrl.trim() || undefined,
    }

    try {
      if (editingId) {
        await promotionService.update(editingId, payload)
        notifySuccess('Cập nhật promotion thành công.')
      } else {
        await promotionService.create(payload)
        notifySuccess('Tạo promotion thành công.')
      }

      await fetchData(pageData.currentPage)
      setEditingId(null)
      setForm(EMPTY_FORM)
      setFormErrors({})
    } catch (err) {
      notifyError(err?.message || 'Lưu promotion thất bại.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!id) {
      return
    }

    const confirmed = window.confirm('Bạn có chắc chắn muốn xóa promotion này?')

    if (!confirmed) {
      return
    }

    setDeletingId(id)

    try {
      await promotionService.remove(id)
      notifySuccess('Xóa promotion thành công.')
      await fetchData(pageData.currentPage)

      if (editingId === id) {
        setEditingId(null)
        setForm(EMPTY_FORM)
      }

      if (getEntityId(selectedDetail) === id) {
        setSelectedDetail(null)
      }
    } catch (err) {
      notifyError(err?.message || 'Xóa promotion thất bại.')
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
      const response = await promotionService.getById(id)
      const detail = response?.data

      setSelectedDetail(
        detail
          ? {
            ...detail,
            isActive: normalizeIsActive(detail?.isActive),
          }
          : null
      )
    } catch (err) {
      notifyError(err?.message || 'Không thể lấy chi tiết promotion.')
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
      const response = await promotionService.getById(id)
      const data = response?.data

      if (!data) {
        throw new Error('Không tìm thấy dữ liệu promotion.')
      }

      setEditingId(id)
      setSelectedDetail({
        ...data,
        isActive: normalizeIsActive(data?.isActive),
      })
      setForm({
        name: data.name || '',
        description: data.description || '',
        discountType: data.discountType || '',
        discountValue: Number(data.discountValue) || 0,
        maxDiscountAmount: data.maxDiscountAmount ?? '',
        minTicketRequired: data.minTicketRequired ?? '',
        minOrderValue: data.minOrderValue ?? '',
        startDate: toLocalDateTimeInput(data.startDate),
        endDate: toLocalDateTimeInput(data.endDate),
        code: data.code || '',
        quantity: Number(data.quantity) || 0,
        isActive: normalizeIsActive(data?.isActive),
        imageUrl: data.imageUrl || '',
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
              <h2 className="h4 mb-1">Quản lý Promotions</h2>
              <p className="text-secondary mb-0">Danh sách mã khuyến mãi cho admin.</p>
            </div>
            <span className="badge text-bg-dark px-3 py-2 rounded-pill">Tổng: {pageData.totalItems}</span>
          </div>

          <div className="row g-2 align-items-end mb-3">
            <div className="col-12 col-md-5">
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
            <div className="col-12 col-md-7 d-grid d-md-flex justify-content-md-end gap-2">
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
                  fetchData(0, { isActiveFilter: 'all' })
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
                  <th>Hình ảnh</th>
                  <th>Mã khuyến mãi</th>
                  <th>Tên khuyến mãi</th>
                  <th>Loại giảm giá</th>
                  <th>Giá trị giảm</th>
                  <th>Số lượng</th>
                  <th>Ngày bắt đầu</th>
                  <th>Ngày kết thúc</th>
                  <th>Đang áp dụng</th>
                  <th className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {!loading && pageData.currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="text-center text-secondary py-4">Không có dữ liệu.</td>
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
                            alt={item.name || 'promotion'}
                            style={{ width: '54px', height: '54px', objectFit: 'cover' }}
                            className="rounded border"
                          />
                        ) : (
                          <span className="text-secondary">-</span>
                        )}
                      </td>
                      <td className="fw-semibold">{item.code || '-'}</td>
                      <td>{item.name || '-'}</td>
                      <td><span className="badge text-bg-info">{item.discountType || '-'}</span></td>
                      <td>{Number(item.discountValue || 0).toLocaleString('vi-VN')}</td>
                      <td>{Number(item.quantity || 0).toLocaleString('vi-VN')}</td>
                      <td>{formatDateTime(item.startDate)}</td>
                      <td>{formatDateTime(item.endDate)}</td>
                      <td>
                        <span className={`badge ${normalizeIsActive(item.isActive) ? 'text-bg-success' : 'text-bg-secondary'}`}>
                          {normalizeIsActive(item.isActive) ? 'true' : 'false'}
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
                <h3 className="h5 mb-0">{editingId ? `Cập nhật Promotion #${editingId}` : 'Tạo Promotion mới'}</h3>
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
                    onUploaded={(url) => setForm((prev) => ({ ...prev, imageUrl: url }))}
                    disabled={submitting}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Image URL (tùy chọn)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.imageUrl}
                    onChange={(event) => setForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
                    placeholder="https://..."
                  />
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
                  <label className="form-label">Code</label>
                  <input
                    type="text"
                    className={`form-control ${formErrors.code ? 'is-invalid' : ''}`}
                    value={form.code}
                    onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                  />
                  {formErrors.code ? <div className="invalid-feedback">{formErrors.code}</div> : null}
                </div>

                <div className="col-12">
                  <label className="form-label">Description</label>
                  <textarea
                    rows="3"
                    className={`form-control ${formErrors.description ? 'is-invalid' : ''}`}
                    value={form.description}
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  />
                  {formErrors.description ? <div className="invalid-feedback">{formErrors.description}</div> : null}
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label">discountType</label>
                  <select
                    className={`form-select ${formErrors.discountType ? 'is-invalid' : ''}`}
                    value={form.discountType}
                    onChange={(event) => setForm((prev) => ({ ...prev, discountType: event.target.value }))}
                  >
                    <option value="">Chọn loại giảm</option>
                    {DISCOUNT_TYPES.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                  {formErrors.discountType ? <div className="invalid-feedback">{formErrors.discountType}</div> : null}
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label">discountValue</label>
                  <input
                    type="number"
                    min="0"
                    className={`form-control ${formErrors.discountValue ? 'is-invalid' : ''}`}
                    value={form.discountValue}
                    onChange={(event) => setForm((prev) => ({ ...prev, discountValue: event.target.value }))}
                  />
                  {formErrors.discountValue ? <div className="invalid-feedback">{formErrors.discountValue}</div> : null}
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label">quantity</label>
                  <input
                    type="number"
                    min="0"
                    className={`form-control ${formErrors.quantity ? 'is-invalid' : ''}`}
                    value={form.quantity}
                    onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
                  />
                  {formErrors.quantity ? <div className="invalid-feedback">{formErrors.quantity}</div> : null}
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label">maxDiscountAmount (optional)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={form.maxDiscountAmount}
                    onChange={(event) => setForm((prev) => ({ ...prev, maxDiscountAmount: event.target.value }))}
                  />
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label">minTicketRequired (optional)</label>
                  <input
                    type="number"
                    min="1"
                    className={`form-control ${formErrors.minTicketRequired ? 'is-invalid' : ''}`}
                    value={form.minTicketRequired}
                    onChange={(event) => setForm((prev) => ({ ...prev, minTicketRequired: event.target.value }))}
                  />
                  {formErrors.minTicketRequired ? <div className="invalid-feedback">{formErrors.minTicketRequired}</div> : null}
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label">minOrderValue (optional)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={form.minOrderValue}
                    onChange={(event) => setForm((prev) => ({ ...prev, minOrderValue: event.target.value }))}
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">startDate</label>
                  <input
                    type="datetime-local"
                    className={`form-control ${formErrors.startDate ? 'is-invalid' : ''}`}
                    value={form.startDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                  />
                  {formErrors.startDate ? <div className="invalid-feedback">{formErrors.startDate}</div> : null}
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">endDate</label>
                  <input
                    type="datetime-local"
                    className={`form-control ${formErrors.endDate ? 'is-invalid' : ''}`}
                    value={form.endDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
                  />
                  {formErrors.endDate ? <div className="invalid-feedback">{formErrors.endDate}</div> : null}
                </div>

                <div className="col-12 d-flex align-items-end">
                  <div className="form-check form-switch">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="promotion-is-active"
                      checked={Boolean(form.isActive)}
                      onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                    />
                    <label htmlFor="promotion-is-active" className="form-check-label">isActive</label>
                  </div>
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
              <h3 className="h6 mb-3">Chi tiết Promotion</h3>

              {detailLoading ? <p className="text-secondary mb-0">Đang tải chi tiết...</p> : null}

              {!detailLoading && !selectedDetail ? (
                <p className="text-secondary mb-0">Chọn View hoặc Edit để xem chi tiết.</p>
              ) : null}

              {!detailLoading && selectedDetail ? (
                <div className="d-grid gap-2 small">
                  <div><strong>ID:</strong> {getEntityId(selectedDetail)}</div>
                  <div><strong>Code:</strong> {selectedDetail.code || '-'}</div>
                  <div><strong>Name:</strong> {selectedDetail.name || '-'}</div>
                  <div><strong>Type:</strong> {selectedDetail.discountType || '-'}</div>
                  <div><strong>Value:</strong> {Number(selectedDetail.discountValue || 0).toLocaleString('vi-VN')}</div>
                  <div><strong>Quantity:</strong> {Number(selectedDetail.quantity || 0).toLocaleString('vi-VN')}</div>
                  <div><strong>Start:</strong> {formatDateTime(selectedDetail.startDate)}</div>
                  <div><strong>End:</strong> {formatDateTime(selectedDetail.endDate)}</div>
                  <div><strong>isActive:</strong> {normalizeIsActive(selectedDetail.isActive) ? 'true' : 'false'}</div>
                  <div><strong>Description:</strong> {selectedDetail.description || '-'}</div>
                  {selectedDetail.imageUrl ? (
                    <img
                      src={selectedDetail.imageUrl}
                      alt={selectedDetail.name || 'promotion-detail'}
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

export default AdminPromotions
