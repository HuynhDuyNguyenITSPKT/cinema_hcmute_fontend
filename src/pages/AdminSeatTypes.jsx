import React, { useState, useEffect } from 'react'
import axiosClient from '../api/axiosClient'
import { notifyError, notifySuccess } from '../utils/notify'

function AdminSeatTypes() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: '', surcharge: 0 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setLoadError('')
    axiosClient.get('/admin/seat-types')
      .then(res => setList(res.data || res || []))
      .catch((err) => {
        setList([])
        const message = err?.message || 'Không tải được danh sách loại ghế.'
        setLoadError(message)
        notifyError(message)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditItem(null)
    setForm({ name: '', surcharge: 0 })
    setError('')
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    setForm({ name: item.name, surcharge: item.surcharge || item.surchargeFee || 0 })
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
    } catch (err) {
      notifyError(err?.message || 'Xóa loại ghế thất bại.')
    }
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
      const message = err?.message || 'Có lỗi xảy ra.'
      setError(message)
      notifyError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-0">🪑 Quản Lý Loại Ghế</h4>
          <small className="text-secondary">Cấu hình giá phụ thu (Surcharge) cho từng loại ghế</small>
        </div>
        <button className="btn btn-danger" onClick={openCreate}>+ Thêm Loại Ghế</button>
      </div>

      {loadError && <div className="alert alert-danger">{loadError}</div>}

      {loading ? <div className="text-center py-5"><div className="spinner-border text-danger" /></div> : (
        <div className="table-responsive border rounded-3 bg-white">
          <table className="table table-striped table-hover align-middle mb-0">
            <thead className="table-light"><tr>
              <th>Loại ghế</th><th>Phụ thu giá (đ)</th><th>Đang dùng</th><th>Hành động</th>
            </tr></thead>
            <tbody>
              {list.map(item => (
                <tr key={item.id}>
                  <td>
                    <span className={`badge me-2 ${
                      item.name?.toUpperCase().includes('VIP') ? 'bg-purple' :
                      item.name?.toUpperCase().includes('PREMIUM') ? 'bg-primary' : 'bg-secondary'
                    }`} style={item.name?.toUpperCase().includes('VIP') ? { background: '#7c3aed' } : {}}>
                      {item.name}
                    </span>
                  </td>
                  <td className="text-warning fw-bold">
                    +{Number(item.surcharge || item.surchargeFee || 0).toLocaleString('vi-VN')}đ
                  </td>
                  <td className="text-secondary small">{item.usedSeatCount ?? 0} ghế</td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => openEdit(item)}>Sửa</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(item)} disabled={!item.deletable}>
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={4} className="text-center text-secondary py-4">Chưa có loại ghế nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="modal-dialog">
            <div className="modal-content bg-dark text-light border-secondary">
              <div className="modal-header border-secondary">
                <h5 className="modal-title">{editItem ? 'Sửa Loại Ghế' : 'Thêm Loại Ghế'}</h5>
                <button className="btn-close btn-close-white" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="mb-3">
                  <label className="form-label">Tên Loại Ghế *</label>
                  <input className="form-control bg-dark text-light border-secondary"
                    placeholder="Ví dụ: STANDARD, VIP, SWEETBOX"
                    value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Giá Phụ Thu (đ)</label>
                  <input type="number" min={0} className="form-control bg-dark text-light border-secondary"
                    placeholder="Ví dụ: 30000"
                    value={form.surcharge} onChange={e => setForm(p => ({ ...p, surcharge: Number(e.target.value) }))} />
                  <small className="text-secondary">Số tiền cộng thêm vào giá vé cơ bản cho loại ghế này</small>
                </div>
              </div>
              <div className="modal-footer border-secondary">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button className="btn btn-danger" onClick={handleSubmit} disabled={saving || !form.name}>
                  {saving ? 'Đang Lưu...' : editItem ? 'Cập Nhật' : 'Thêm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminSeatTypes
