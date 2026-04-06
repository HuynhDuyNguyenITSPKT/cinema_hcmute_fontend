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

function isValidHttpUrl(value) {
  const raw = String(value || '').trim()

  if (!raw) return true

  try {
    const parsed = new URL(raw)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function toYoutubeEmbedUrl(value) {
  const raw = String(value || '').trim()

  if (!raw) return ''

  try {
    const parsed = new URL(raw)
    const hostname = parsed.hostname.replace(/^www\./, '')

    if (hostname === 'youtu.be') {
      const id = parsed.pathname.replace('/', '')
      return id ? `https://www.youtube.com/embed/${id}` : ''
    }

    if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      const id = parsed.searchParams.get('v')
      if (id) {
        return `https://www.youtube.com/embed/${id}`
      }

      const pathParts = parsed.pathname.split('/').filter(Boolean)
      if (pathParts[0] === 'embed' && pathParts[1]) {
        return `https://www.youtube.com/embed/${pathParts[1]}`
      }
    }
  } catch {
    return ''
  }

  return ''
}

function toYoutubeAutoplayEmbedUrl(value, muted = true) {
  const embedUrl = toYoutubeEmbedUrl(value)

  if (!embedUrl) return ''

  return `${embedUrl}?autoplay=1&mute=${muted ? '1' : '0'}&controls=${muted ? '0' : '1'}&rel=0&modestbranding=1&playsinline=1`
}

function formatReleaseDate(dateString) {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString
  return date.toLocaleDateString('vi-VN')
}

function truncateText(text, maxLength = 110) {
  const normalized = String(text || '').trim()
  if (!normalized) return 'Nội dung phim đang được cập nhật.'
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength).trimEnd()}...`
}

function normalizeForSearch(value) {
  return String(value || '').trim().toLowerCase()
}

function includesKeyword(value, keyword) {
  return normalizeForSearch(value).includes(keyword)
}

function AdminMovies() {
  const [movies, setMovies] = useState([])
  const [genres, setGenres] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [inputKeyword, setInputKeyword] = useState('')
  const [selectedGenreIds, setSelectedGenreIds] = useState([])
  const [selectedStatus, setSelectedStatus] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [posterPreviewFailed, setPosterPreviewFailed] = useState(false)
  const [previewMovieId, setPreviewMovieId] = useState(null)
  const [audioPreviewMovieId, setAudioPreviewMovieId] = useState(null)

  const [deletingId, setDeletingId] = useState(null)

  const fetchMovies = useCallback(async (targetPage = 0, kw = '', genreIds = []) => {
    setLoading(true)
    setError('')
    try {
      const genreIdForApi = genreIds.length === 1 ? genreIds[0] : ''
      const res = await movieService.getPageable({
        page: targetPage,
        size: PAGE_SIZE,
        keyword: kw,
        genreId: genreIdForApi,
      })
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

  const fetchGenres = useCallback(async () => {
    try {
      const pageableRes = await genreService.getPageable({ page: 0, size: 200 })
      const items = pageableRes?.data?.currentItems
      if (Array.isArray(items)) {
        setGenres(items)
        return
      }
    } catch {
      // Fallback sang public endpoint để vẫn mapping được thể loại nếu route admin chưa sẵn sàng.
    }

    try {
      const res = await genreService.getAll()
      setGenres(Array.isArray(res?.data) ? res.data : [])
    } catch {
      setGenres([])
    }
  }, [])

  useEffect(() => {
    fetchMovies(0, '', [])
    fetchGenres()
  }, [fetchMovies, fetchGenres])

  useEffect(() => {
    setPreviewMovieId(null)
    setAudioPreviewMovieId(null)
  }, [movies])

  useEffect(() => {
    setPosterPreviewFailed(false)
  }, [form.posterUrl, showModal])

  const genreOptions = createGenreOptions(genres)
  const trailerEmbedUrl = toYoutubeEmbedUrl(form.trailerUrl)

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

    if (!isValidHttpUrl(form.posterUrl)) {
      setFormError('URL poster không hợp lệ. Vui lòng dùng link bắt đầu bằng http/https.')
      return
    }

    if (!isValidHttpUrl(form.trailerUrl)) {
      setFormError('URL trailer không hợp lệ. Vui lòng dùng link bắt đầu bằng http/https.')
      return
    }

    setSaving(true)
    try {
      const normalizedForm = editingId
        ? form
        : { ...form, status: 'COMING_SOON' }

      const payload = buildMovieFromForm(normalizedForm)
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
      fetchMovies(page, keyword, selectedGenreIds)
    } catch (err) {
      const message = err?.message ?? 'Lưu phim thất bại.'
      setFormError(message)
      notifyError(message)
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
      fetchMovies(page, keyword, selectedGenreIds)
    } catch (err) {
      notifyError(err?.message ?? 'Xoá phim thất bại.')
    } finally {
      setDeletingId(null)
    }
  }

  const statusLabel = (s) => MOVIE_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s
  const selectedStatusLabel = selectedStatus ? statusLabel(selectedStatus) : ''
  const normalizedKeyword = normalizeForSearch(keyword)
  const selectedGenreLabels = genreOptions
    .filter((opt) => selectedGenreIds.some((id) => String(id) === String(opt.value)))
    .map((opt) => opt.label)
  const filteredMovies =
    normalizedKeyword.length > 0 || selectedGenreIds.length > 0 || selectedStatus
      ? movies.filter((movie) => (
          (
            normalizedKeyword.length === 0 ||
            includesKeyword(movie.title, normalizedKeyword) ||
            includesKeyword(movie.director, normalizedKeyword) ||
            includesKeyword(movie.cast, normalizedKeyword)
          ) &&
          (
            selectedGenreIds.length === 0 ||
            selectedGenreIds.every((id) =>
              (movie.genres ?? []).some((genre) => String(genre?.id) === String(id))
            )
          ) &&
          (
            !selectedStatus || String(movie.status) === String(selectedStatus)
          )
        ))
      : movies

  const handleSearch = (e) => {
    e.preventDefault()
    const nextKeyword = inputKeyword.trim()
    setKeyword(nextKeyword)
    fetchMovies(0, nextKeyword, selectedGenreIds)
  }

  const handleGenreFilterToggle = (genreId) => {
    const nextGenreIds = selectedGenreIds.some((id) => String(id) === String(genreId))
      ? selectedGenreIds.filter((id) => String(id) !== String(genreId))
      : [...selectedGenreIds, genreId]

    setSelectedGenreIds(nextGenreIds)
    fetchMovies(0, keyword, nextGenreIds)
  }

  const handleClearSearch = () => {
    setInputKeyword('')
    setKeyword('')
    setSelectedGenreIds([])
    setSelectedStatus('')
    fetchMovies(0, '', [])
  }

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
              <Link to="/admin/genres" className="btn btn-outline-secondary">
                🗂️ Thể loại
              </Link>
              <Link to="/admin/showtimes" className="btn btn-outline-secondary">
                🎬 Lịch chiếu
              </Link>
              <button className="btn btn-primary" onClick={openCreate}>
                + Thêm phim
              </button>
            </div>
          </div>

          <form className="row g-2 mb-3" onSubmit={handleSearch}>
            <div className="col-12 col-md-6 col-lg-5">
              <input
                type="text"
                className="form-control"
                placeholder="Tìm theo tên phim, đạo diễn hoặc diễn viên..."
                value={inputKeyword}
                onChange={(e) => setInputKeyword(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-4 col-lg-3">
              <select
                className="form-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="">Tất cả trạng thái</option>
                {MOVIE_STATUS_OPTIONS.map((statusOption) => (
                  <option key={statusOption.value} value={statusOption.value}>
                    {statusOption.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-auto d-flex gap-2">
              <button type="submit" className="btn btn-outline-primary" disabled={loading}>
                {loading ? 'Đang tìm...' : 'Tìm kiếm'}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleClearSearch}
                disabled={loading || (!keyword && !inputKeyword && selectedGenreIds.length === 0 && !selectedStatus)}
              >
                Làm mới
              </button>
            </div>

            <div className="col-12">
              <label className="form-label small text-secondary mb-1">Thể loại (chọn nhiều)</label>
              <div className="d-flex flex-wrap gap-3 p-2 border rounded bg-light">
                {genreOptions.length === 0 && (
                  <span className="text-secondary small">Không có thể loại.</span>
                )}

                {genreOptions.map((opt) => (
                  <div key={opt.value} className="form-check mb-0">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id={`movie-filter-genre-${opt.value}`}
                      checked={selectedGenreIds.some((id) => String(id) === String(opt.value))}
                      onChange={() => handleGenreFilterToggle(opt.value)}
                    />
                    <label className="form-check-label" htmlFor={`movie-filter-genre-${opt.value}`}>
                      {opt.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </form>

          {(keyword || selectedGenreIds.length > 0 || selectedStatus) && (
            <div className="small text-secondary mb-3">
              Kết quả lọc
              {keyword ? ` từ khóa "${keyword}"` : ''}
              {selectedGenreLabels.length > 0 ? `, thể loại "${selectedGenreLabels.join(', ')}"` : ''}
              {selectedStatusLabel ? `, trạng thái "${selectedStatusLabel}"` : ''}
              : {filteredMovies.length} phim trên trang hiện tại.
            </div>
          )}

          {error && <div className="alert alert-danger py-2 px-3">{error}</div>}

          {loading && (
            <div className="text-center text-secondary py-5">Đang tải...</div>
          )}

          {!loading && filteredMovies.length === 0 && (
            <div className="text-center text-secondary py-5 border rounded-3 bg-white">
              {keyword || selectedGenreIds.length > 0 || selectedStatus
                ? 'Không tìm thấy phim phù hợp trên trang hiện tại.'
                : 'Không có dữ liệu.'}
            </div>
          )}

          {!loading && filteredMovies.length > 0 && (
            <div className="row g-4">
              {filteredMovies.map((movie, idx) => {
                const isAudioPreview = audioPreviewMovieId === movie.id
                const trailerPreviewUrl = toYoutubeAutoplayEmbedUrl(movie.trailerUrl, !isAudioPreview)

                return (
                  <div key={movie.id} className="col-12 col-sm-6 col-lg-4 col-xl-3">
                    <div
                      className="card h-100 bg-dark text-white border-secondary shadow-sm"
                      onPointerEnter={() => {
                        if (trailerPreviewUrl) {
                          setPreviewMovieId(movie.id)
                        }
                      }}
                      onPointerLeave={() => {
                        setPreviewMovieId((prev) => (prev === movie.id ? null : prev))
                        setAudioPreviewMovieId((prev) => (prev === movie.id ? null : prev))
                      }}
                    >
                      <div
                        className="position-relative"
                        onClick={() => {
                          if (movie.trailerUrl) {
                            setPreviewMovieId(movie.id)
                            setAudioPreviewMovieId(movie.id)
                          }
                        }}
                        style={{ cursor: movie.trailerUrl ? 'pointer' : 'default' }}
                        title={movie.trailerUrl ? 'Nhấn để bật tiếng trailer' : undefined}
                      >
                        {previewMovieId === movie.id && trailerPreviewUrl ? (
                          <iframe
                            src={trailerPreviewUrl}
                            title={`Preview ${movie.title}`}
                            className="card-img-top border-0"
                            style={{ height: 280, pointerEvents: isAudioPreview ? 'auto' : 'none' }}
                            allow="autoplay; encrypted-media; picture-in-picture"
                            allowFullScreen
                          />
                        ) : movie.posterUrl ? (
                          <img
                            src={movie.posterUrl}
                            className="card-img-top object-fit-cover"
                            alt={movie.title}
                            style={{ height: 280 }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div
                            className="card-img-top bg-secondary d-flex align-items-center justify-content-center text-light"
                            style={{ height: 280 }}
                          >
                            Không có poster
                          </div>
                        )}

                        {previewMovieId === movie.id && movie.trailerUrl && !isAudioPreview && (
                          <span className="position-absolute top-0 end-0 m-2 badge bg-dark bg-opacity-75">
                            Nhấn để bật tiếng
                          </span>
                        )}
                      </div>

                      <div className="card-body d-flex flex-column">
                        <div className="d-flex justify-content-between align-items-start mb-1 gap-2">
                          <h5 className="card-title mb-0 text-truncate" title={movie.title}>{movie.title}</h5>
                          <span className="badge bg-dark-subtle border border-secondary text-light">#{page * PAGE_SIZE + idx + 1}</span>
                        </div>

                        <p className="small text-light-emphasis mb-2">{truncateText(movie.description)}</p>

                        <div className="mb-2 d-flex flex-wrap gap-1">
                          {getGenreLabels(movie.genres ?? []).map((name) => (
                            <span key={name} className="badge text-bg-secondary">{name}</span>
                          ))}
                        </div>

                        <div className="mb-3 d-flex flex-wrap gap-1 align-items-center">
                          <span className={`badge ${
                            movie.status === 'NOW_SHOWING'
                              ? 'text-bg-success'
                              : movie.status === 'COMING_SOON'
                              ? 'text-bg-warning'
                              : 'text-bg-danger'
                          }`}
                          >
                            {statusLabel(movie.status)}
                          </span>
                          {movie.ageRating && <span className="badge text-bg-info">{movie.ageRating}</span>}
                          {movie.durationMinutes > 0 && <span className="badge text-bg-secondary">{movie.durationMinutes} phút</span>}
                          {movie.releaseDate && <span className="badge bg-dark border border-secondary">{formatReleaseDate(movie.releaseDate)}</span>}
                        </div>

                        <div className="mt-auto d-grid gap-2">
                          <div className="d-flex gap-2">
                            {movie.trailerUrl ? (
                              <a
                                href={movie.trailerUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-outline-light btn-sm flex-fill"
                              >
                                Trailer
                              </a>
                            ) : (
                              <button type="button" className="btn btn-outline-secondary btn-sm flex-fill" disabled>
                                Chưa có trailer
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm flex-fill"
                              onClick={() => openEdit(movie)}
                            >
                              Sửa
                            </button>
                          </div>

                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleDelete(movie)}
                            disabled={deletingId === movie.id}
                          >
                            {deletingId === movie.id ? 'Đang xoá...' : 'Xoá phim'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <span className="text-secondary small">
                Trang {page + 1} / {totalPages}
              </span>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={loading || page <= 0}
                  onClick={() => fetchMovies(page - 1, keyword, selectedGenreIds)}
                >
                  Trước
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={loading || page >= totalPages - 1}
                  onClick={() => fetchMovies(page + 1, keyword, selectedGenreIds)}
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
                <div className="modal-body" style={{ maxHeight: '68vh', overflowY: 'auto' }}>
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
                      <label className="form-label">Ngày khởi chiếu *</label>
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
                        disabled={!editingId}
                        required
                      >
                        {MOVIE_STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      {!editingId && (
                        <small className="text-secondary">
                          Phim mới tạo mặc định là <strong>Sắp chiếu</strong>. Bạn có thể cập nhật trạng thái sau.
                        </small>
                      )}
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

                    <div className="col-12">
                      <details className="border rounded bg-light p-2" open={Boolean(form.posterUrl || form.trailerUrl)}>
                        <summary className="px-2 py-1 small fw-semibold text-secondary">
                          Xem trước nội dung khách hàng sẽ thấy
                        </summary>
                        <div className="p-2 pt-3">
                          <div className="row g-3">
                            <div className="col-12 col-md-4">
                              <div className="small fw-semibold mb-2">Poster</div>
                              <div
                                className="border rounded overflow-hidden bg-dark-subtle d-flex align-items-center justify-content-center"
                                style={{ minHeight: 180 }}
                              >
                                {form.posterUrl && !posterPreviewFailed ? (
                                  <img
                                    src={form.posterUrl}
                                    alt="Poster preview"
                                    className="w-100 h-100 object-fit-cover"
                                    onError={() => setPosterPreviewFailed(true)}
                                  />
                                ) : (
                                  <span className="text-secondary small px-2 text-center">
                                    {form.posterUrl
                                      ? 'Không tải được ảnh. Kiểm tra lại link poster.'
                                      : 'Chưa có poster để xem trước.'}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="col-12 col-md-8">
                              <div className="small fw-semibold mb-2">Trailer</div>

                              {trailerEmbedUrl ? (
                                <div className="ratio ratio-16x9 border rounded overflow-hidden bg-dark">
                                  <iframe
                                    src={trailerEmbedUrl}
                                    title="Trailer preview"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                </div>
                              ) : form.trailerUrl ? (
                                <div className="border rounded p-3 bg-white">
                                  <p className="small text-secondary mb-2">
                                    Không phải link YouTube dạng nhúng tự động. Mở link để kiểm tra trailer.
                                  </p>
                                  <a
                                    href={form.trailerUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-outline-primary btn-sm"
                                  >
                                    Mở trailer
                                  </a>
                                </div>
                              ) : (
                                <div className="border rounded p-3 bg-white text-secondary small">
                                  Chưa có trailer để xem trước.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </details>
                    </div>
                    <div className="col-12">
                      <div className="small text-secondary">
                        Mẹo: bạn có thể bỏ qua phần xem trước, chỉ cần nhập đúng URL rồi lưu.
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
