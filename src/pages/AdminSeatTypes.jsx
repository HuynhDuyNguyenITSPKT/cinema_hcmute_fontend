import React, { useState, useEffect, useMemo } from 'react'
import axiosClient from '../api/axiosClient'
import { notifyError, notifySuccess } from '../utils/notify'

const PAGE_SIZE = 10

function buildPagination(currentPage, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i)
  const pages = [0]
  const start = Math.max(1, currentPage - 1)
  const end   = Math.min(totalPages - 2, currentPage + 1)
  if (start > 1) pages.push('...')
  for (let p = start; p <= end; p++) pages.push(p)
  if (end < totalPages - 2) pages.push('...')
  pages.push(totalPages - 1)
  return pages
}

function AdminSeatTypes() {
  const [list,      setList]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editItem,  setEditItem]  = useState(null)
  const [form,      setForm]      = useState({ name: '', surchargeAmount: 0 })
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  // Client-side search + pagination
  const [search, setSearch] = useState('')
  const [page,   setPage]   = useState(0)

  const load = () => {
    setLoading(true)
    setLoadError('')
    axiosClient.get('/admin/seat-types')
      .then(res => setList(res.data || res || []))
      .catch(err => {
        setList([])
        const msg = err?.message || 'Không tải được danh sách loại ghế.'
        setLoadError(msg)
        notifyError(msg)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(item => item.name?.toLowerCase().includes(q))
  }, [list, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const pagination = buildPagination(page, totalPages)

  const openCreate = () => {
    setEditItem(null)
    setForm({ name: '', surchargeAmount: 0 })
    setError('')
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    setForm({ name: item.name, surchargeAmount: item.surchargeAmount ?? item.surcharge ?? item.surchargeFee ?? 0 })
    setError('')
    setShowModal(true)
  }

  const handleDelete = async (item) => {
    if (!item?.deletable) {
      notifyError('Không thể xóa loại ghế đang được gán cho ghế trong hệ thống.')
      return
    }
    if (!window.confirm('Xóa loại ghế này?')) return
    try {
      await axiosClient.delete(`/admin/seat-types/${item.id}`)
      notifySuccess('Xóa loại ghế thành công.')
      load()
    } catch (err) { notifyError(err?.message || 'Xóa loại ghế thất bại.') }
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError('')
    try {
      if (editItem) {
        await axiosClient.put(`/admin/seat-types/${editItem.id}`, form)
        notifySuccess('Cập nhật loại ghế thành công.')
      } else {
        await axiosClient.post('/admin/seat-types', form)
        notifySuccess('Tạo loại ghế thành công.')
      }
      setShowModal(false)
      load()
    } catch (err) {
      const msg = err?.message || 'Có lỗi xảy ra.'
      setError(msg)
      notifyError(msg)
    } finally { setSaving(false) }
  }

  // Stats
  const totalSeatsUsed = list.reduce((s, i) => s + (i.usedSeatCount || 0), 0)

  return (
    <section className="container-fluid px-2 px-md-3 px-xl-4">
      <div className="card border-0 shadow-sm">
        <div className="card-body p-3 p-md-4">

          {/* Header */}
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
            <div>
              <h2 className="h4 mb-1">Quản lý loại ghế</h2>
              <p className="text-secondary mb-0">Cấu hình giá phụ thu (Surcharge) cho từng loại ghế.</p>
            </div>
            <button className="btn btn-primary px-4" onClick={openCreate}>+ Thêm Loại Ghế</button>
          </div>

          {/* Stats */}
          <div className="row g-3 mb-4">
            {[
              { label: 'Tổng loại ghế',  value: list.length,      cls: 'bg-primary-subtle' },
              { label: 'Tổng ghế đang dùng', value: totalSeatsUsed, cls: 'bg-success-subtle' },
              { label: 'Loại có thể xóa', value: list.filter(i => i.deletable).length, cls: 'bg-warning-subtle' },
              { label: 'Kết quả lọc',    value: filtered.length,  cls: 'bg-info-subtle' },
            ].map(s => (
              <div key={s.label} className="col-12 col-md-6 col-xl-3">
                <div className={`card h-100 border-light-subtle ${s.cls}`}>
                  <div className="card-body">
                    <p className="small text-secondary mb-1">{s.label}</p>
                    <p className="h4 mb-0">{s.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="card border-light-subtle mb-3">
            <div className="card-body">
              <div className="row g-2">
                <div className="col-12 col-md-6 col-xl-4">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Tìm theo tên loại ghế..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(0) }}
                  />
                </div>
                <div className="col-12 col-md-2">
                  <button className="btn btn-outline-secondary w-100" onClick={() => { setSearch(''); setPage(0) }}>
                    Làm mới
                  </button>
                </div>
              </div>
            </div>
          </div>

          {loadError && <div className="alert alert-danger py-2 px-3">{loadError}</div>}

          {/* Table */}
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
          ) : (
            <div className="table-responsive border rounded-3 bg-white">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Tên Loại Ghế</th>
                    <th>Phụ Thu (đ)</th>
                    <th>Số Ghế Đang Dùng</th>
                    <th>Có thể xóa</th>
                    <th className="text-end">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-secondary py-4">Không có dữ liệu.</td></tr>
                  )}
                  {paginated.map(item => (
                    <tr key={item.id}>
                      <td><span className="text-muted small">{item.id}</span></td>
                      <td>
                        <span className={`badge me-2 ${
                          item.name?.toUpperCase().includes('VIP')     ? 'text-bg-danger' :
                          item.name?.toUpperCase().includes('PREMIUM') ? 'text-bg-primary' :
                          'text-bg-secondary'
                        }`}>
                          {item.name}
                        </span>
                      </td>
                      <td className="fw-semibold text-success">
                        +{Number(item.surchargeAmount ?? item.surcharge ?? item.surchargeFee ?? 0).toLocaleString('vi-VN')}đ
                      </td>
                      <td>
                        <span className="badge text-bg-secondary">{item.usedSeatCount ?? 0} ghế</span>
                      </td>
                      <td>
                        {item.deletable
                          ? <span className="badge text-bg-success">Có</span>
                          : <span className="badge text-bg-secondary">Đang dùng</span>}
                      </td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-outline-primary me-2" onClick={() => openEdit(item)}>Sửa</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(item)} disabled={!item.deletable}>
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mt-3">
            <p className="text-secondary mb-0">Trang {page + 1} / {Math.max(totalPages, 1)}</p>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setPage(p => p - 1)} disabled={page <= 0}>Trước</button>
              {pagination.map((item, idx) =>
                typeof item !== 'number' ? (
                  <span key={`e${idx}`} className="text-secondary px-1">...</span>
                ) : (
                  <button key={item}
                    className={`btn btn-sm ${item === page ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setPage(item)}>
                    {item + 1}
                  </button>
                )
              )}
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>Sau</button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editItem ? 'Sửa Loại Ghế' : 'Thêm Loại Ghế'}</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger py-2">{error}</div>}
                <div className="mb-3">
                  <label className="form-label fw-semibold">Tên Loại Ghế <span className="text-danger">*</span></label>
                  <input className="form-control"
                    placeholder="Ví dụ: STANDARD, VIP, SWEETBOX"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Giá Phụ Thu (đ)</label>
                  <input type="number" min={0} className="form-control"
                    placeholder="Ví dụ: 30000"
                    value={form.surchargeAmount}
                    onChange={e => setForm(p => ({ ...p, surchargeAmount: Number(e.target.value) }))} />
                  <div className="form-text">Số tiền cộng thêm vào giá vé cơ bản cho loại ghế này.</div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !form.name}>
                  {saving ? 'Đang Lưu...' : editItem ? 'Cập Nhật' : 'Thêm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default AdminSeatTypes
