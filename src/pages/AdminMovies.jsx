import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import movieService from '../services/movieService'
import genreService from '../services/genreService'
import { buildMovieFromForm } from '../utils/movieBuilder'
import { createGenreOptions, getGenreLabels } from '../utils/genreFactory'
import { movieEventBus } from '../utils/movieEventBus'
import { notifySuccess, notifyError } from '../utils/notify'

const MOVIE_STATUS_OPTIONS = [
  { value: 'NOW_SHOWING', label: 'Đang chiếu' },
  { value: 'COMING_SOON', label: 'Sắp chiếu' },
  { value: 'STOPPED', label: 'Ngừng chiếu' },
]

const AGE_RATING_OPTIONS = ['P', 'C13', 'C16', 'C18']

const emptyForm = {
  title: '',
  description: '',
  director: '',
  cast: '',
  durationMinutes: '',
  releaseDate: '',
  posterUrl: '',
  trailerUrl: '',
  ageRating: '',
  status: 'COMING_SOON',
  genreIds: [],
}

const PAGE_SIZE = 10

function AdminMovies() {
  const [movies, setMovies] = useState([])
  const [genres, setGenres] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [deletingId, setDeletingId] = useState(null)

  const fetchMovies = useCallback(async (targetPage = 0) => {
    setLoading(true)
    setError('')
    try {
      const res = await movieService.getPageable({ page: targetPage, size: PAGE_SIZE })
      const data = res?.data ?? {}
      setMovies(data.currentItems ?? [])
      setPage(data.currentPage ?? 0)
      setTotalPages(data.totalPages ?? 0)
      setTotalItems(data.totalItems ?? 0)
    } catch (err) {
      setError(err?.message ?? 'Không thể tải danh sách phim.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMovies(0)
    genreService.getAll().then((res) => {
      setGenres(res?.data ?? [])
    }).catch(() => {})
  }, [fetchMovies])

  const genreOptions = createGenreOptions(genres)

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setFormError('')
    setShowModal(true)
  }

  const openEdit = (movie) => {
    setEditingId(movie.id)
    setForm({
      title: movie.title ?? '',
      description: movie.description ?? '',
      director: movie.director ?? '',
      cast: movie.cast ?? '',
      durationMinutes: movie.durationMinutes ?? '',
      releaseDate: movie.releaseDate ?? '',
      posterUrl: movie.posterUrl ?? '',
      trailerUrl: movie.trailerUrl ?? '',
      ageRating: movie.ageRating ?? '',
      status: movie.status ?? 'COMING_SOON',
      genreIds: (movie.genres ?? []).map((g) => g.id),
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

  const handleGenreToggle = (genreId) => {
    setForm((prev) => {
      const ids = prev.genreIds.includes(genreId)
        ? prev.genreIds.filter((id) => id !== genreId)
        : [...prev.genreIds, genreId]
      return { ...prev, genreIds: ids }
    })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      const payload = buildMovieFromForm(form)
      if (editingId) {
        const res = await movieService.update(editingId, payload)
        notifySuccess(res?.message ?? 'Cập nhật phim thành công.')
        movieEventBus.emitUpdated(res?.data)
      } else {
        const res = await movieService.create(payload)
        notifySuccess(res?.message ?? 'Thêm phim thành công.')
        movieEventBus.emitCreated(res?.data)
      }
      closeModal()
      fetchMovies(page)
    } catch (err) {
      setFormError(err?.message ?? 'Lưu phim thất bại.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (movie) => {
    if (!window.confirm(`Xoá phim "${movie.title}"?`)) return
    setDeletingId(movie.id)
    try {
      const res = await movieService.remove(movie.id)
      notifySuccess(res?.message ?? 'Xoá phim thành công.')
      movieEventBus.emitDeleted(movie.id)
      fetchMovies(page)
    } catch (err) {
      notifyError(err?.message ?? 'Xoá phim thất bại.')
    } finally {
      setDeletingId(null)
    }
  }

  const statusLabel = (s) => MOVIE_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s

  return (
    <section className="container-fluid px-2 px-md-3 px-xl-4">
      <div className="card border-0 shadow-sm">
        <div className="card-body p-3 p-md-4">
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
            <div>
              <h2 className="h4 mb-1">Quản lý phim</h2>
              <p className="text-secondary mb-0">Danh sách phim trong hệ thống. Tổng: {totalItems}</p>
            </div>
            <div className="d-flex gap-2">
              <Link to="/admin/showtimes" className="btn btn-outline-secondary">
                🎬 Lịch chiếu
              </Link>
              <button className="btn btn-primary" onClick={openCreate}>
                + Thêm phim
              </button>
            </div>
          </div>

          {error && <div className="alert alert-danger py-2 px-3">{error}</div>}

          <div className="table-responsive border rounded-3 bg-white">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 48 }}>STT</th>
                  <th>Tên phim</th>
                  <th>Đạo diễn</th>
                  <th>Phút</th>
                  <th>Thể loại</th>
                  <th>Độ tuổi</th>
                  <th>Trạng thái</th>
                  <th className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="text-center text-secondary py-4">Đang tải...</td>
                  </tr>
                )}
                {!loading && movies.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-secondary py-4">
                      Không có dữ liệu.
                    </td>
                  </tr>
                )}
                {movies.map((movie, idx) => (
                  <tr key={movie.id}>
                    <td className="text-center">{page * PAGE_SIZE + idx + 1}</td>
                    <td>
                      <div className="fw-semibold">{movie.title}</div>
                      {movie.releaseDate && (
                        <small className="text-secondary">{movie.releaseDate}</small>
                      )}
                    </td>
                    <td>{movie.director ?? '-'}</td>
                    <td>{movie.durationMinutes ?? '-'}</td>
                    <td>
                      {getGenreLabels(movie.genres ?? []).map((name) => (
                        <span key={name} className="badge text-bg-secondary me-1">
                          {name}
                        </span>
                      ))}
                    </td>
                    <td>
                      <span className="badge text-bg-info">{movie.ageRating ?? '-'}</span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          movie.status === 'NOW_SHOWING'
                            ? 'text-bg-success'
                            : movie.status === 'COMING_SOON'
                            ? 'text-bg-warning'
                            : 'text-bg-danger'
                        }`}
                      >
                        {statusLabel(movie.status)}
                      </span>
                    </td>
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-outline-primary me-1"
                        onClick={() => openEdit(movie)}
                      >
                        Sửa
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(movie)}
                        disabled={deletingId === movie.id}
                      >
                        {deletingId === movie.id ? '...' : 'Xoá'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <span className="text-secondary small">
                Trang {page + 1} / {totalPages}
              </span>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={loading || page <= 0}
                  onClick={() => fetchMovies(page - 1)}
                >
                  Trước
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={loading || page >= totalPages - 1}
                  onClick={() => fetchMovies(page + 1)}
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div
          className="modal d-block"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingId ? 'Sửa phim' : 'Thêm phim'}</h5>
                <button className="btn-close" onClick={closeModal} />
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">Tên phim *</label>
                      <input
                        className="form-control"
                        value={form.title}
                        onChange={handleInput('title')}
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Mô tả</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={form.description}
                        onChange={handleInput('description')}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Đạo diễn</label>
                      <input
                        className="form-control"
                        value={form.director}
                        onChange={handleInput('director')}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Diễn viên</label>
                      <input
                        className="form-control"
                        value={form.cast}
                        onChange={handleInput('cast')}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Thời lượng (phút) *</label>
                      <input
                        type="number"
                        min={1}
                        className="form-control"
                        value={form.durationMinutes}
                        onChange={handleInput('durationMinutes')}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Ngày phát hành *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.releaseDate}
                        onChange={handleInput('releaseDate')}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Độ tuổi *</label>
                      <select
                        className="form-select"
                        value={form.ageRating}
                        onChange={handleInput('ageRating')}
                        required
                      >
                        <option value="">-- Chọn --</option>
                        {AGE_RATING_OPTIONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">URL Poster</label>
                      <input
                        className="form-control"
                        value={form.posterUrl}
                        onChange={handleInput('posterUrl')}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">URL Trailer</label>
                      <input
                        className="form-control"
                        value={form.trailerUrl}
                        onChange={handleInput('trailerUrl')}
                        placeholder="https://youtube.com/..."
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Trạng thái *</label>
                      <select
                        className="form-select"
                        value={form.status}
                        onChange={handleInput('status')}
                        required
                      >
                        {MOVIE_STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Thể loại</label>
                      <div className="d-flex flex-wrap gap-2 p-2 border rounded">
                        {genreOptions.length === 0 && (
                          <span className="text-secondary small">Không có thể loại.</span>
                        )}
                        {genreOptions.map((opt) => (
                          <div key={opt.value} className="form-check">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              id={`genre-${opt.value}`}
                              checked={form.genreIds.includes(opt.value)}
                              onChange={() => handleGenreToggle(opt.value)}
                            />
                            <label className="form-check-label" htmlFor={`genre-${opt.value}`}>
                              {opt.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {formError && (
                    <div className="alert alert-danger py-2 px-3 small mt-3">{formError}</div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Huỷ
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Thêm phim'}
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

export default AdminMovies
