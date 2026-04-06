import React, { useState, useEffect } from 'react'
import movieService from '../services/movieService'

function AdminMovies() {
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', durationMinutes: 120, releaseDate: '', posterUrl: '', director: '', cast: '', ageRating: 'P', status: 'COMING_SOON', genreIds: [] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    movieService.getAllMoviesAdmin()
      .then(res => setMovies(res.data?.currentItems || res.data || res || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditItem(null)
    setForm({ title: '', description: '', durationMinutes: 120, releaseDate: '', posterUrl: '', director: '', cast: '', ageRating: 'P', status: 'COMING_SOON', genreIds: [] })
    setError('')
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    setForm({
      title: item.title || '',
      description: item.description || '',
      durationMinutes: item.durationMinutes || item.duration || 120,
      releaseDate: item.releaseDate || '',
      posterUrl: item.posterUrl || item.imageUrl || '',
      director: item.director || '',
      cast: item.cast || '',
      ageRating: item.ageRating || 'P',
      status: item.status || 'COMING_SOON',
      genreIds: item.genreIds || [],
    })
    setError('')
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa phim này?')) return
    await movieService.deleteMovie(id).catch(err => alert(err?.message))
    load()
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError('')
    try {
      if (editItem) await movieService.updateMovie(editItem.id, form)
      else await movieService.createMovie(form)
      setShowModal(false)
      load()
    } catch (err) {
      setError(err?.message || 'Có lỗi xảy ra.')
    } finally {
      setSaving(false)
    }
  }

  const f = (key) => ({ value: form[key], onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) })

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-0">🎬 Quản Lý Phim</h4>
          <small className="text-secondary">Thêm, sửa, xóa thông tin phim chiếu</small>
        </div>
        <button className="btn btn-danger" onClick={openCreate}>+ Thêm Phim</button>
      </div>

      {loading ? <div className="text-center py-5"><div className="spinner-border text-danger" /></div> : (
        <div className="row g-3">
          {movies.map(m => (
            <div key={m.id} className="col-md-3 col-sm-6">
              <div className="card bg-dark border-secondary h-100">
                <img src={m.posterUrl || m.imageUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=400'}
                  className="card-img-top object-fit-cover" alt={m.title} style={{ height: 200 }} />
                <div className="card-body">
                  <h6 className="text-light text-truncate">{m.title}</h6>
                  <small className="text-secondary">{m.duration ? `${m.duration} phút` : ''}</small>
                </div>
                <div className="card-footer border-secondary d-flex gap-2">
                  <button className="btn btn-sm btn-outline-light w-50" onClick={() => openEdit(m)}>Sửa</button>
                  <button className="btn btn-sm btn-outline-danger w-50" onClick={() => handleDelete(m.id)}>Xóa</button>
                </div>
              </div>
            </div>
          ))}
          {movies.length === 0 && <div className="col-12 text-center text-secondary py-5">Chưa có phim nào.</div>}
        </div>
      )}

      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content bg-dark text-light border-secondary">
              <div className="modal-header border-secondary">
                <h5 className="modal-title">{editItem ? 'Sửa Phim' : 'Thêm Phim Mới'}</h5>
                <button className="btn-close btn-close-white" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="row g-3">
                  <div className="col-md-8">
                    <label className="form-label">Tên Phim *</label>
                    <input className="form-control bg-dark text-light border-secondary" {...f('title')} />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Thời Lượng (phút)</label>
                    <input type="number" className="form-control bg-dark text-light border-secondary" {...f('durationMinutes')} />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Phân Loại</label>
                    <select className="form-select bg-dark text-light border-secondary" {...f('ageRating')}>
                      {['P','K','T13','T16','T18','C'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Trạng Thái</label>
                    <select className="form-select bg-dark text-light border-secondary" {...f('status')}>
                      <option value="COMING_SOON">Sắp Chiếu</option>
                      <option value="NOW_SHOWING">Đang Chiếu</option>
                      <option value="ENDED">Đã Kết Thúc</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Đạo Diễn</label>
                    <input className="form-control bg-dark text-light border-secondary" {...f('director')} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Ngày Khởi Chiếu</label>
                    <input type="date" className="form-control bg-dark text-light border-secondary" {...f('releaseDate')} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Diễn Viên</label>
                    <input className="form-control bg-dark text-light border-secondary" placeholder="Tên diễn viên, cách nhau dấu phẩy" {...f('cast')} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">URL Poster</label>
                    <input className="form-control bg-dark text-light border-secondary" placeholder="https://..." {...f('posterUrl')} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Mô Tả</label>
                    <textarea rows={3} className="form-control bg-dark text-light border-secondary" {...f('description')} />
                  </div>
                </div>
              </div>
              <div className="modal-footer border-secondary">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button className="btn btn-danger" onClick={handleSubmit} disabled={saving || !form.title}>
                  {saving ? 'Đang Lưu...' : editItem ? 'Cập Nhật' : 'Thêm Phim'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminMovies
