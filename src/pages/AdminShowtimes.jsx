import { useEffect, useState, useCallback } from 'react'
import showtimeService from '../services/showtimeService'
import movieService from '../services/movieService'
import auditoriumService from '../services/auditoriumService'
import { detectStrategy, calculatePrice, ALL_STRATEGIES } from '../utils/showtimeStrategy'
import { notifySuccess, notifyError } from '../utils/notify'

const emptyForm = {
  movieId: '',
  auditoriumId: '',
  startTime: '',
  standardPrice: '',
}

function formatDateTime(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleString('vi-VN')
}

function formatPrice(price) {
  return Number(price).toLocaleString('vi-VN') + ' đ'
}

function AdminShowtimes() {
  const [showtimes, setShowtimes] = useState([])
  const [movies, setMovies] = useState([])
  const [auditoriums, setAuditoriums] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const detectedStrategy = detectStrategy(form.startTime)
  const estimatedPrice =
    form.standardPrice && form.startTime
      ? calculatePrice(Number(form.standardPrice), form.startTime)
      : null

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [stRes, mvRes, auRes] = await Promise.all([
        showtimeService.getAll(),
        movieService.getPageable({ page: 0, size: 100 }),
        auditoriumService.getAll(),
      ])
      setShowtimes(stRes?.data ?? [])
      setMovies(mvRes?.data?.currentItems ?? [])
      setAuditoriums(auRes?.data ?? [])
    } catch (err) {
      setError(err?.message ?? 'Không thể tải dữ liệu.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setFormError('')
    setShowModal(true)
  }

  const openEdit = (st) => {
    setEditingId(st.id)
    setForm({
      movieId: st.movieId ?? '',
      auditoriumId: st.auditoriumId ?? '',
      startTime: st.startTime ? st.startTime.slice(0, 16) : '',
      standardPrice: st.basePrice ?? '',
    })
    setFormError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setForm(emptyForm)
    setFormError('')
  }

  const handleInput = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSave = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!form.movieId) { setFormError('Vui lòng chọn phim.'); return }
    if (!form.auditoriumId) { setFormError('Vui lòng chọn phòng chiếu.'); return }
    if (!form.startTime) { setFormError('Vui lòng chọn thời gian chiếu.'); return }

    if (!editingId) {
      const startDate = new Date(form.startTime)
      if (startDate <= new Date()) {
        setFormError('Thời gian chiếu phải ở trong tương lai.')
        return
      }
    }

    if (!form.standardPrice || Number(form.standardPrice) < 1000) {
      setFormError('Giá vé cơ sở phải ít nhất 1.000 đ.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        movieId: form.movieId,
        auditoriumId: form.auditoriumId,
        startTime: form.startTime.slice(0, 16) + ':00',
        standardPrice: Number(form.standardPrice),
      }
      if (editingId) {
        const res = await showtimeService.update(editingId, payload)
        notifySuccess(res?.message ?? 'Cập nhật lịch chiếu thành công.')
      } else {
        const res = await showtimeService.create(payload)
        notifySuccess(res?.message ?? 'Tạo lịch chiếu thành công.')
      }
      closeModal()
      fetchData()
    } catch (err) {
      setFormError(err?.message ?? 'Lưu lịch chiếu thất bại.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (st) => {
    if (!window.confirm(`Xoá lịch chiếu "${st.movieTitle}" lúc ${formatDateTime(st.startTime)}?`)) return
    setDeletingId(st.id)
    try {
      const res = await showtimeService.remove(st.id)
      notifySuccess(res?.message ?? 'Xoá lịch chiếu thành công.')
      fetchData()
    } catch (err) {
      notifyError(err?.message ?? 'Xoá lịch chiếu thất bại.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="container-fluid px-2 px-md-3 px-xl-4">
      <div className="card border-0 shadow-sm">
        <div className="card-body p-3 p-md-4">
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
            <div>
              <h2 className="h4 mb-1">Quản lý lịch chiếu</h2>
              <p className="text-secondary mb-0">Tổng: {showtimes.length} suất chiếu</p>
            </div>
            <button className="btn btn-primary" onClick={openCreate}>
              + Tạo lịch chiếu
            </button>
          </div>

          <div className="row g-2 mb-4">
            {ALL_STRATEGIES.map((s) => (
              <div key={s.name} className="col-6 col-md-3">
                <div className={`card border-0 bg-${s.badgeClass}-subtle h-100`}>
                  <div className="card-body py-2 px-3">
                    <div className="small fw-semibold">{s.icon} {s.label}</div>
                    <div className="text-secondary" style={{ fontSize: '12px' }}>×{s.multiplier}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {error && <div className="alert alert-danger py-2 px-3">{error}</div>}

          <div className="table-responsive border rounded-3 bg-white">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 48 }}>STT</th>
                  <th>Phim</th>
                  <th>Phòng chiếu</th>
                  <th>Bắt đầu</th>
                  <th>Kết thúc</th>
                  <th>Giá cơ sở</th>
                  <th>Khung giờ</th>
                  <th className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="text-center text-secondary py-4">Đang tải...</td>
                  </tr>
                )}
                {!loading && showtimes.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-secondary py-4">
                      Không có dữ liệu.
                    </td>
                  </tr>
                )}
                {showtimes.map((st, idx) => {
                  const strategy = detectStrategy(st.startTime)
                  return (
                    <tr key={st.id}>
                      <td className="text-center">{idx + 1}</td>
                      <td className="fw-semibold">{st.movieTitle ?? '-'}</td>
                      <td>{st.auditoriumName ?? '-'}</td>
                      <td>{formatDateTime(st.startTime)}</td>
                      <td>{formatDateTime(st.endTime)}</td>
                      <td>{formatPrice(st.basePrice)}</td>
                      <td>
                        <span className={`badge text-bg-${strategy.badgeClass}`}>
                          {strategy.icon} {strategy.label}
                        </span>
                      </td>
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-outline-primary me-1"
                          onClick={() => openEdit(st)}
                        >
                          Sửa
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(st)}
                          disabled={deletingId === st.id}
                        >
                          {deletingId === st.id ? '...' : 'Xoá'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div
          className="modal d-block"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="modal-dialog modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingId ? 'Sửa lịch chiếu' : 'Tạo lịch chiếu'}</h5>
                <button className="btn-close" onClick={closeModal} />
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body row g-3">
                  <div className="col-12">
                    <label className="form-label">Phim *</label>
                    <select
                      className="form-select"
                      value={form.movieId}
                      onChange={handleInput('movieId')}
                      required
                    >
                      <option value="">-- Chọn phim --</option>
                      {movies.map((m) => (
                        <option key={m.id} value={m.id}>{m.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12">
                    <label className="form-label">Phòng chiếu *</label>
                    <select
                      className="form-select"
                      value={form.auditoriumId}
                      onChange={handleInput('auditoriumId')}
                      required
                    >
                      <option value="">-- Chọn phòng --</option>
                      {auditoriums.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.totalSeats} ghế)
                        </option>
                      ))}
                    </select>
                    {auditoriums.length === 0 && !loading && (
                      <small className="text-secondary">Chưa có phòng chiếu nào.</small>
                    )}
                  </div>

                  <div className="col-12">
                    <label className="form-label">Thời gian bắt đầu *</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={form.startTime}
                      onChange={handleInput('startTime')}
                      min={(() => {
                        const now = new Date(Date.now() + 60000)
                        const pad = (n) => String(n).padStart(2, '0')
                        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
                      })()}
                      required
                    />
                    {form.startTime && (
                      <div className="mt-2">
                        <span className={`badge text-bg-${detectedStrategy.badgeClass} me-2`}>
                          {detectedStrategy.icon} {detectedStrategy.label}
                        </span>
                        <small className="text-secondary">{detectedStrategy.describe()}</small>
                      </div>
                    )}
                  </div>

                  <div className="col-12">
                    <label className="form-label">Giá vé cơ sở (VND) *</label>
                    <input
                      type="number"
                      min={1000}
                      step={1000}
                      className="form-control"
                      value={form.standardPrice}
                      onChange={handleInput('standardPrice')}
                      placeholder="Ví dụ: 80000"
                      required
                    />
                    {estimatedPrice !== null && (
                      <div className="mt-2 small">
                        <span className="text-secondary me-1">Giá ước tính sau chiến lược:</span>
                        <strong className="text-primary">{formatPrice(estimatedPrice)}</strong>
                        <span className="text-secondary ms-1">(×{detectedStrategy.multiplier})</span>
                      </div>
                    )}
                  </div>

                  {formError && (
                    <div className="col-12">
                      <div className="alert alert-danger py-2 px-3 small">{formError}</div>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Huỷ
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Tạo lịch'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default AdminShowtimes
