import React, { useState, useEffect } from 'react'
import showtimeService from '../services/showtimeService'
import auditoriumService from '../services/auditoriumService'
import movieService from '../services/movieService'
import { notifyError, notifySuccess } from '../utils/notify'

function AdminShowtimes() {
  const [list, setList] = useState([])
  const [movies, setMovies] = useState([])
  const [auditoriums, setAuditoriums] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ movieId: '', auditoriumId: '', startTime: '', standardPrice: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setLoadError('')
    Promise.all([
      showtimeService.getAll(),
      movieService.getAllMoviesAdmin(),
      auditoriumService.getAll(),
    ]).then(([st, mv, au]) => {
      const showtimeItems = st?.data
      const movieItems = mv?.data?.currentItems ?? mv?.data
      const auditoriumItems = au?.data

      setList(Array.isArray(showtimeItems) ? showtimeItems : [])
      setMovies(Array.isArray(movieItems) ? movieItems : [])
      setAuditoriums(Array.isArray(auditoriumItems) ? auditoriumItems : [])
    }).catch((err) => {
      setList([])
      setMovies([])
      setAuditoriums([])
      const message = err?.message || 'Không tải được dữ liệu lịch chiếu.'
      setLoadError(message)
      notifyError(message)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditItem(null)
    setForm({ movieId: '', auditoriumId: '', startTime: '', standardPrice: '' })
    setError('')
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    setForm({
      movieId: item.movieId || '',
      auditoriumId: item.auditoriumId || '',
      startTime: item.startTime ? item.startTime.slice(0, 16) : '',
      standardPrice: item.basePrice || '',
    })
    setError('')
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa lịch chiếu này?')) return
    try {
      await showtimeService.delete(id)
      notifySuccess('Xóa lịch chiếu thành công.')
      load()
    } catch (err) {
      notifyError(err?.message || 'Xóa lịch chiếu thất bại.')
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError('')
    const payload = {
      movieId: form.movieId,
      auditoriumId: form.auditoriumId,
      startTime: form.startTime,
      standardPrice: Number(form.standardPrice),
    }
    try {
      if (editItem) {
        await showtimeService.update(editItem.id, payload)
        notifySuccess('Cập nhật lịch chiếu thành công.')
      } else {
        await showtimeService.create(payload)
        notifySuccess('Tạo lịch chiếu thành công.')
      }
      setShowModal(false)
      load()
    } catch (err) {
      // Bắt cụ thể lỗi OVERLAPPING_SHOWTIME từ backend
      const msg = err?.message || ''
      if (msg.includes('overlap') || msg.includes('trùng') || msg.includes('Overlapping')) {
        const conflictMessage = '⚠️ Phòng chiếu này đã có suất chiếu trong khung giờ đó! Vui lòng chọn giờ khác.'
        setError(conflictMessage)
        notifyError(conflictMessage)
      } else {
        const fallbackMessage = msg || 'Có lỗi xảy ra.'
        setError(fallbackMessage)
        notifyError(fallbackMessage)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-0">🎬 Quản Lý Lịch Chiếu</h4>
          <small className="text-secondary">Hệ thống tự chặn khi trùng giờ chiếu trong cùng phòng</small>
        </div>
        <button className="btn btn-danger" onClick={openCreate}>+ Thêm Lịch Chiếu</button>
      </div>

      {loadError && <div className="alert alert-danger">{loadError}</div>}

      {loading ? <div className="text-center py-5"><div className="spinner-border text-danger" /></div> : (
        <div className="table-responsive">
          <table className="table table-dark table-striped table-hover">
            <thead><tr>
              <th>Phim</th><th>Phòng</th><th>Giờ Chiếu</th><th>Giá Cơ Bản</th><th>Hành Động</th>
            </tr></thead>
            <tbody>
              {list.map(item => (
                <tr key={item.id}>
                  <td>{item.movieName || item.movieId}</td>
                  <td>{item.auditoriumName || item.auditoriumId}</td>
                  <td>{item.startTime ? new Date(item.startTime).toLocaleString('vi-VN') : '-'}</td>
                  <td>{Number(item.basePrice || 0).toLocaleString('vi-VN')}đ</td>
                  <td>
                    <button className="btn btn-sm btn-outline-light me-2" onClick={() => openEdit(item)}>Sửa</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(item.id)}>Xóa</button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={5} className="text-center text-secondary py-4">Chưa có lịch chiếu nào.</td></tr>
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
                <h5 className="modal-title">{editItem ? 'Sửa Lịch Chiếu' : 'Thêm Lịch Chiếu'}</h5>
                <button className="btn-close btn-close-white" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="mb-3">
                  <label className="form-label">Phim *</label>
                  <select className="form-select bg-dark text-light border-secondary"
                    value={form.movieId} onChange={e => setForm(p => ({ ...p, movieId: e.target.value }))}>
                    <option value="">-- Chọn phim --</option>
                    {movies.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Phòng Chiếu *</label>
                  <select className="form-select bg-dark text-light border-secondary"
                    value={form.auditoriumId} onChange={e => setForm(p => ({ ...p, auditoriumId: e.target.value }))}>
                    <option value="">-- Chọn phòng --</option>
                    {auditoriums.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Giờ Bắt Đầu *</label>
                  <input type="datetime-local" className="form-control bg-dark text-light border-secondary"
                    value={form.startTime}
                    onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Giá Cơ Bản (đ) *</label>
                  <input type="number" className="form-control bg-dark text-light border-secondary"
                    placeholder="Ví dụ: 75000"
                    value={form.standardPrice}
                    onChange={e => setForm(p => ({ ...p, standardPrice: e.target.value }))} />
                  <small className="text-secondary">Hệ thống sẽ tự động tính giá thêm cho giờ vàng/cuối tuần</small>
                </div>
              </div>
              <div className="modal-footer border-secondary">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button className="btn btn-danger" onClick={handleSubmit}
                  disabled={saving || !form.movieId || !form.auditoriumId || !form.startTime || !form.standardPrice}>
                  {saving ? 'Đang Lưu...' : editItem ? 'Cập Nhật' : 'Tạo Lịch'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminShowtimes
