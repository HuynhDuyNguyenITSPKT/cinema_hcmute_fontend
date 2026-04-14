import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
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

const MOVIE_STATUS_LABEL = {
  NOW_SHOWING: 'Đang chiếu',
  COMING_SOON: 'Sắp chiếu',
  STOPPED: 'Ngừng chiếu',
}

const MOVIE_STATUS_BADGE = {
  NOW_SHOWING: 'success',
  COMING_SOON: 'warning',
  STOPPED: 'secondary',
}

const AUDITORIUM_STATUS_LABEL = {
  ACTIVE: 'Đang hoạt động',
  UNDER_MAINTENANCE: 'Bảo trì',
  INACTIVE: 'Tạm ngưng',
}

const AUDITORIUM_STATUS_BADGE = {
  ACTIVE: 'success',
  UNDER_MAINTENANCE: 'warning',
  INACTIVE: 'secondary',
}

function normalizeAuditoriumList(raw) {
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.currentItems)) return raw.currentItems
  if (Array.isArray(raw?.items)) return raw.items
  return []
}

function formatDateTime(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleString('vi-VN')
}

function formatPrice(price) {
  return Number(price).toLocaleString('vi-VN') + ' đ'
}

function normalizeForSearch(value) {
  return String(value || '').trim().toLowerCase()
}

function toTimestamp(value) {
  const ts = new Date(value).getTime()
  return Number.isNaN(ts) ? Number.MAX_SAFE_INTEGER : ts
}

function formatTimeOnly(dt) {
  if (!dt) return '--:--'
  const parsed = new Date(dt)
  if (Number.isNaN(parsed.getTime())) return '--:--'

  return parsed.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function getDateGroupKey(dt) {
  const parsed = new Date(dt)
  if (Number.isNaN(parsed.getTime())) return 'invalid-date'

  const pad = (n) => String(n).padStart(2, '0')
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`
}

function getMoviePosterUrl(movie) {
  if (!movie) return ''

  return (
    movie.posterUrl ||
    movie.poster ||
    movie.thumbnailUrl ||
    movie.imageUrl ||
    movie.bannerUrl ||
    ''
  )
}

function toDateTimeLocalValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return ''
  }

  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function getMinStartDate() {
  return new Date(Date.now() + 60000)
}

function getMinStartTime() {
  return toDateTimeLocalValue(getMinStartDate())
}

function parseDateOnly(dateString) {
  const raw = String(dateString || '').trim()
  if (!raw) return null

  const dateOnlyPart = raw.split('T')[0].split(' ')[0]

  const isoLikeMatch = dateOnlyPart.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (isoLikeMatch) {
    const year = Number(isoLikeMatch[1])
    const month = Number(isoLikeMatch[2])
    const day = Number(isoLikeMatch[3])
    const parsed = new Date(year, month - 1, day, 0, 0, 0, 0)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const dmyMatch = dateOnlyPart.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (dmyMatch) {
    const day = Number(dmyMatch[1])
    const month = Number(dmyMatch[2])
    const year = Number(dmyMatch[3])
    const parsed = new Date(year, month - 1, day, 0, 0, 0, 0)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const fallback = new Date(raw)
  if (Number.isNaN(fallback.getTime())) {
    return null
  }

  return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate(), 0, 0, 0, 0)
}

function suggestStartTimeFromReleaseDate(releaseDate, fallbackDate) {
  const fallback = fallbackDate instanceof Date ? fallbackDate : getMinStartDate()
  const parsedReleaseDate = parseDateOnly(releaseDate)

  if (!parsedReleaseDate) {
    return toDateTimeLocalValue(fallback)
  }

  const suggested = new Date(
    parsedReleaseDate.getFullYear(),
    parsedReleaseDate.getMonth(),
    parsedReleaseDate.getDate(),
    9,
    0,
    0,
    0
  )

  return toDateTimeLocalValue(suggested >= fallback ? suggested : fallback)
}

function formatDateOnlyVi(dateString) {
  const parsed = parseDateOnly(dateString)
  return parsed ? parsed.toLocaleDateString('vi-VN') : '-'
}

function computeEndDate(startTime, durationMinutes) {
  const duration = Number(durationMinutes)

  if (!startTime || !Number.isFinite(duration) || duration <= 0) {
    return null
  }

  const start = new Date(startTime)
  if (Number.isNaN(start.getTime())) {
    return null
  }

  return new Date(start.getTime() + duration * 60000)
}

function isTimeRangeOverlapped(startA, endA, startB, endB) {
  return startA < endB && endA > startB
}

function computeEndTimePreview(startTime, durationMinutes) {
  const end = computeEndDate(startTime, durationMinutes)
  return end ? end.toLocaleString('vi-VN') : ''
}

function AdminShowtimes() {
  const [showtimes, setShowtimes] = useState([])
  const [movies, setMovies] = useState([])
  const [auditoriums, setAuditoriums] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [inputKeyword, setInputKeyword] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [movieFilter, setMovieFilter] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const detectedStrategy = detectStrategy(form.startTime)
  const estimatedPrice =
    form.standardPrice && form.startTime
      ? calculatePrice(Number(form.standardPrice), form.startTime)
      : null
  const selectedMovie = movies.find((m) => String(m.id) === String(form.movieId))
  const selectedAuditorium = auditoriums.find((a) => String(a.id) === String(form.auditoriumId))
  const startDate = form.startTime ? new Date(form.startTime) : null
  const endDate = computeEndDate(form.startTime, selectedMovie?.durationMinutes)
  const endTimePreview = computeEndTimePreview(form.startTime, selectedMovie?.durationMinutes)
  const minStartTime = getMinStartTime()
  const conflictedShowtimes =
    selectedAuditorium &&
    startDate &&
    endDate &&
    !Number.isNaN(startDate.getTime()) &&
    !Number.isNaN(endDate.getTime())
      ? showtimes.filter((st) => {
          if (editingId && String(st.id) === String(editingId)) {
            return false
          }

          if (String(st.auditoriumId) !== String(selectedAuditorium.id)) {
            return false
          }

          const existedStart = new Date(st.startTime)
          const existedEnd = new Date(st.endTime)

          if (Number.isNaN(existedStart.getTime()) || Number.isNaN(existedEnd.getTime())) {
            return false
          }

          return isTimeRangeOverlapped(startDate, endDate, existedStart, existedEnd)
        })
      : []
  const hasScheduleConflict = conflictedShowtimes.length > 0
  const isSubmitDisabled = saving || auditoriums.length === 0 || movies.length === 0 || hasScheduleConflict
  const filteredMoviesForSelect = useMemo(() => {
    const normalizedMovieFilter = normalizeForSearch(movieFilter)

    if (!normalizedMovieFilter) {
      return movies
    }

    return movies.filter((movie) => normalizeForSearch(movie.title).includes(normalizedMovieFilter))
  }, [movies, movieFilter])
  const normalizedKeyword = normalizeForSearch(keyword)
  const filteredShowtimes = normalizedKeyword
    ? showtimes.filter((st) => {
        const strategy = detectStrategy(st.startTime)
        return (
          normalizeForSearch(st.movieTitle).includes(normalizedKeyword) ||
          normalizeForSearch(st.auditoriumName).includes(normalizedKeyword) ||
          normalizeForSearch(strategy.label).includes(normalizedKeyword)
        )
      })
    : showtimes
  const groupedShowtimes = useMemo(() => {
    const movieLookup = new Map(movies.map((movie) => [String(movie.id), movie]))
    const grouped = new Map()
    const now = new Date()
    const todayStartTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

    filteredShowtimes.forEach((st) => {
      const movieKey = String(st.movieId ?? st.movieTitle ?? st.id)
      const movie = movieLookup.get(String(st.movieId))

      if (!grouped.has(movieKey)) {
        grouped.set(movieKey, {
          key: movieKey,
          movieTitle: st.movieTitle ?? movie?.title ?? 'Chưa rõ phim',
          releaseDate: movie?.releaseDate ?? null,
          movieStatus: movie?.status,
          posterUrl: getMoviePosterUrl(movie),
          items: [],
        })
      }

      grouped.get(movieKey).items.push(st)
    })

    return Array.from(grouped.values())
      .map((group) => {
        const byDate = new Map()
        const sortedItems = group.items
          .slice()
          .sort((a, b) => toTimestamp(a.startTime) - toTimestamp(b.startTime))

        sortedItems.forEach((st) => {
            const dateKey = getDateGroupKey(st.startTime)
            if (!byDate.has(dateKey)) {
              byDate.set(dateKey, {
                dateKey,
                dateLabel: formatDateOnlyVi(dateKey),
                items: [],
              })
            }

            byDate.get(dateKey).items.push(st)
          })

        return {
          ...group,
          showtimeCount: group.items.length,
          firstShowtimeAt: sortedItems[0]?.startTime ?? null,
          dates: Array.from(byDate.values()),
        }
      })
      .sort((a, b) => {
        const releaseTimeA = parseDateOnly(a.releaseDate)?.getTime()
        const releaseTimeB = parseDateOnly(b.releaseDate)?.getTime()
        const releaseDistanceA = Number.isFinite(releaseTimeA)
          ? Math.abs(releaseTimeA - todayStartTime)
          : Number.MAX_SAFE_INTEGER
        const releaseDistanceB = Number.isFinite(releaseTimeB)
          ? Math.abs(releaseTimeB - todayStartTime)
          : Number.MAX_SAFE_INTEGER

        if (releaseDistanceA !== releaseDistanceB) {
          return releaseDistanceA - releaseDistanceB
        }

        if (Number.isFinite(releaseTimeA) && Number.isFinite(releaseTimeB) && releaseTimeA !== releaseTimeB) {
          return releaseTimeA - releaseTimeB
        }

        const firstShowtimeA = toTimestamp(a.firstShowtimeAt)
        const firstShowtimeB = toTimestamp(b.firstShowtimeAt)

        if (firstShowtimeA !== firstShowtimeB) {
          return firstShowtimeA - firstShowtimeB
        }

        return normalizeForSearch(a.movieTitle).localeCompare(normalizeForSearch(b.movieTitle))
      })
  }, [filteredShowtimes, movies])

  const fetchAuditoriums = useCallback(async () => {
    try {
      const pageableRes = await auditoriumService.getPageable({ page: 0, size: 200 })
      const items = normalizeAuditoriumList(pageableRes?.data)
      if (items.length > 0) {
        return items
      }
    } catch {
      // Fallback sang endpoint list thường nếu admin pageable chưa sẵn sàng.
    }

    try {
      const listRes = await auditoriumService.getAll()
      return normalizeAuditoriumList(listRes?.data)
    } catch {
      return []
    }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [stRes, mvRes, auRes] = await Promise.all([
        showtimeService.getAll(),
        movieService.getPageable({ page: 0, size: 100 }),
        fetchAuditoriums(),
      ])
      setShowtimes(stRes?.data ?? [])
      setMovies(mvRes?.data?.currentItems ?? [])
      setAuditoriums(Array.isArray(auRes) ? auRes : [])
    } catch (err) {
      setError(err?.message ?? 'Không thể tải dữ liệu.')
    } finally {
      setLoading(false)
    }
  }, [fetchAuditoriums])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setMovieFilter('')
    setFormError('')
    setShowModal(true)
  }

  const openEdit = (st) => {
    const strategy = detectStrategy(st.startTime)
    const basePrice = Number(st.baseTicketPrice ?? st.basePrice)
    const restoredStandardPrice = Number.isFinite(basePrice) && basePrice > 0
      ? Math.round(basePrice / strategy.multiplier)
      : ''

    setEditingId(st.id)
    setMovieFilter(st.movieTitle ?? '')
    setForm({
      movieId: st.movieId ?? '',
      auditoriumId: st.auditoriumId ?? '',
      startTime: st.startTime ? st.startTime.slice(0, 16) : '',
      standardPrice: restoredStandardPrice,
    })
    setFormError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setForm(emptyForm)
    setMovieFilter('')
    setFormError('')
  }

  const handleInput = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleMovieChange = (e) => {
    const nextMovieId = e.target.value

    setForm((prev) => {
      const nextForm = { ...prev, movieId: nextMovieId }

      if (!editingId) {
        if (!nextMovieId) {
          nextForm.startTime = ''
        } else {
          const movie = movies.find((m) => String(m.id) === String(nextMovieId))
          nextForm.startTime = suggestStartTimeFromReleaseDate(movie?.releaseDate, getMinStartDate())
        }
      }

      return nextForm
    })
  }

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

    if (hasScheduleConflict) {
      setFormError('Khung giờ đã bị trùng với suất chiếu khác trong cùng phòng. Vui lòng chọn giờ hoặc phòng khác.')
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
      const message = err?.message ?? 'Lưu lịch chiếu thất bại.'
      setFormError(message)
      notifyError(message)
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

  const handleSearch = (e) => {
    e.preventDefault()
    setKeyword(inputKeyword.trim())
  }

  const handleResetSearch = () => {
    setInputKeyword('')
    setKeyword('')
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
            <div className="d-flex gap-2">
              <Link to="/admin/movies" className="btn btn-outline-secondary">
                🎬 Quản lý phim
              </Link>
              <button className="btn btn-primary" onClick={openCreate}>
                + Tạo lịch chiếu
              </button>
            </div>
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

          <form className="row g-2 mb-3" onSubmit={handleSearch}>
            <div className="col-12 col-md-6 col-lg-5">
              <input
                type="text"
                className="form-control"
                placeholder="Tìm theo tên phim, phòng chiếu hoặc khung giờ..."
                value={inputKeyword}
                onChange={(e) => setInputKeyword(e.target.value)}
              />
            </div>
            <div className="col-auto d-flex gap-2">
              <button type="submit" className="btn btn-outline-primary" disabled={loading}>
                {loading ? 'Đang tìm...' : 'Tìm kiếm'}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleResetSearch}
                disabled={!keyword && !inputKeyword}
              >
                Làm mới
              </button>
            </div>
          </form>

          {keyword && (
            <div className="small text-secondary mb-3">
              Kết quả cho "{keyword}": {filteredShowtimes.length} suất chiếu.
            </div>
          )}

          <div className="d-flex justify-content-end align-items-center mb-3">
            {!loading && <span className="small text-secondary">Theo phim: {groupedShowtimes.length} phim</span>}
          </div>

          {error && <div className="alert alert-danger py-2 px-3">{error}</div>}

          <div className="vstack gap-3">
            {loading && (
              <div className="border rounded-3 bg-white text-center text-secondary py-4">
                Đang tải...
              </div>
            )}

            {!loading && groupedShowtimes.length === 0 && (
              <div className="border rounded-3 bg-white text-center text-secondary py-4">
                {keyword ? 'Không tìm thấy suất chiếu phù hợp.' : 'Không có dữ liệu.'}
              </div>
            )}

            {!loading && groupedShowtimes.map((group) => (
              <article key={group.key} className="border rounded-3 bg-white p-3">
                <div className="d-flex flex-column flex-md-row gap-3">
                  <div
                    className="rounded-3 overflow-hidden border bg-light flex-shrink-0"
                    style={{ width: 132, height: 190 }}
                  >
                    {group.posterUrl ? (
                      <img
                        src={group.posterUrl}
                        alt={group.movieTitle}
                        className="w-100 h-100"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="w-100 h-100 d-flex align-items-center justify-content-center text-secondary fw-semibold fs-4">
                        {String(group.movieTitle || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex-grow-1">
                    <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                      <h3 className="h6 mb-0">{group.movieTitle}</h3>
                      <span className="badge text-bg-light border">{group.showtimeCount} suất chiếu</span>
                      {group.movieStatus && (
                        <span className={`badge text-bg-${MOVIE_STATUS_BADGE[group.movieStatus] ?? 'secondary'}`}>
                          {MOVIE_STATUS_LABEL[group.movieStatus] ?? group.movieStatus}
                        </span>
                      )}
                    </div>

                    <div className="vstack gap-3">
                      {group.dates.map((dateGroup) => (
                        <div key={`${group.key}-${dateGroup.dateKey}`}>
                          <div className="small fw-semibold text-secondary mb-1">
                            {dateGroup.dateLabel}
                          </div>

                          <div className="d-flex flex-wrap gap-2">
                            {dateGroup.items.map((st) => {
                              const strategy = detectStrategy(st.startTime)

                              return (
                                <div
                                  key={st.id}
                                  className={`border rounded-3 p-2 bg-${strategy.badgeClass}-subtle`}
                                  style={{ minWidth: 220 }}
                                >
                                  <div className="d-flex justify-content-between align-items-start gap-2">
                                    <div>
                                      <div className="fw-semibold">{formatTimeOnly(st.startTime)}</div>
                                      <div className="small text-secondary">
                                        {formatTimeOnly(st.startTime)} - {formatTimeOnly(st.endTime)}
                                      </div>
                                    </div>

                                    <span className={`badge text-bg-${strategy.badgeClass}`}>
                                      {strategy.label}
                                    </span>
                                  </div>

                                  <div className="small mt-1 text-secondary">
                                    {st.auditoriumName ?? '-'} • {formatPrice(st.baseTicketPrice ?? st.basePrice)}
                                  </div>

                                  <div className="mt-2 d-flex gap-1">
                                    <button
                                      className="btn btn-sm btn-light border"
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
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <div
          className="modal d-block"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingId ? 'Sửa lịch chiếu' : 'Tạo lịch chiếu'}</h5>
                <button className="btn-close" onClick={closeModal} />
              </div>

              <form onSubmit={handleSave}>
                <div className="modal-body" style={{ maxHeight: '68vh', overflowY: 'auto' }}>
                  {auditoriums.length === 0 && !loading && (
                    <div className="alert alert-warning py-2 px-3 small">
                      Chưa có phòng chiếu nên chưa thể tạo lịch. Bạn vẫn có thể xem trước giao diện form như web bán vé thực tế.
                    </div>
                  )}

                  {movies.length === 0 && !loading && (
                    <div className="alert alert-warning py-2 px-3 small">
                      Chưa có phim trong hệ thống. Vui lòng tạo phim trước khi tạo lịch chiếu.
                    </div>
                  )}

                  <div className="row g-3">
                    <div className="col-12 col-lg-7">
                      <div className="border rounded-3 p-3 bg-light-subtle">
                        <h6 className="fw-semibold mb-3">Thông tin suất chiếu</h6>

                        <div className="row g-3">
                          <div className="col-12">
                            <label className="form-label">Phim *</label>
                            <input
                              type="text"
                              className="form-control mb-2"
                              value={movieFilter}
                              onChange={(e) => setMovieFilter(e.target.value)}
                              placeholder="Nhập để tìm nhanh tên phim..."
                            />
                            <select
                              className="form-select"
                              value={form.movieId}
                              onChange={handleMovieChange}
                              required
                            >
                              <option value="">-- Chọn phim --</option>
                              {filteredMoviesForSelect.map((m) => (
                                <option key={m.id} value={m.id}>{m.title}</option>
                              ))}
                            </select>
                            {movieFilter && filteredMoviesForSelect.length === 0 && (
                              <small className="text-secondary">
                                Không tìm thấy phim phù hợp với từ khóa hiện tại.
                              </small>
                            )}
                            {!editingId && selectedMovie?.releaseDate && (
                              <small className="text-secondary">
                                Đã gợi ý thời gian bắt đầu theo ngày khởi chiếu: {formatDateOnlyVi(selectedMovie.releaseDate)}.
                              </small>
                            )}
                            {selectedMovie?.status && (
                              <div className="mt-2">
                                <span className={`badge text-bg-${MOVIE_STATUS_BADGE[selectedMovie.status] ?? 'secondary'}`}>
                                  {MOVIE_STATUS_LABEL[selectedMovie.status] ?? selectedMovie.status}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="col-12">
                            <label className="form-label">Phòng chiếu *</label>
                            <select
                              className="form-select"
                              value={form.auditoriumId}
                              onChange={handleInput('auditoriumId')}
                              disabled={auditoriums.length === 0}
                              required
                            >
                              <option value="">-- Chọn phòng --</option>
                              {auditoriums.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {`${a.name} (${a.totalSeats} ghế${a.status ? ` - ${AUDITORIUM_STATUS_LABEL[a.status] ?? a.status}` : ''})`}
                                </option>
                              ))}
                            </select>
                            {selectedAuditorium?.status && (
                              <div className="mt-2">
                                <span className={`badge text-bg-${AUDITORIUM_STATUS_BADGE[selectedAuditorium.status] ?? 'secondary'}`}>
                                  {AUDITORIUM_STATUS_LABEL[selectedAuditorium.status] ?? selectedAuditorium.status}
                                </span>
                              </div>
                            )}
                            {auditoriums.length === 0 && !loading && (
                              <small className="text-secondary">
                                Chưa có phòng chiếu để chọn. Vui lòng tạo phòng trước rồi tải lại trang.
                              </small>
                            )}
                          </div>

                          <div className="col-12">
                            <label className="form-label">Thời gian bắt đầu *</label>
                            <input
                              type="datetime-local"
                              className="form-control"
                              value={form.startTime}
                              onChange={handleInput('startTime')}
                              min={editingId ? undefined : minStartTime}
                              required
                            />
                            {form.startTime && (
                              <div className="mt-2 d-flex align-items-center gap-2 flex-wrap">
                                <span className={`badge text-bg-${detectedStrategy.badgeClass}`}>
                                  {detectedStrategy.icon} {detectedStrategy.label}
                                </span>
                                <small className="text-secondary">{detectedStrategy.describe()}</small>
                              </div>
                            )}
                            {selectedAuditorium && form.startTime && endDate && (
                              <div className={`mt-2 alert py-2 px-3 small mb-0 ${hasScheduleConflict ? 'alert-danger' : 'alert-success'}`}>
                                {hasScheduleConflict
                                  ? `Trùng lịch: có ${conflictedShowtimes.length} suất chiếu khác trong cùng phòng ở khung giờ này.`
                                  : 'Không phát hiện trùng lịch trong phòng đã chọn.'}
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
                        </div>
                      </div>
                    </div>

                    <div className="col-12 col-lg-5">
                      <div className="card border h-100 bg-light">
                        <div className="card-body d-flex flex-column">
                          <h6 className="fw-semibold mb-1">Xem trước suất chiếu</h6>
                          <p className="small text-secondary mb-3">
                            Bố cục mô phỏng luồng lên lịch của các trang bán vé phổ biến.
                          </p>

                          <ul className="list-group list-group-flush small">
                            <li className="list-group-item bg-transparent d-flex justify-content-between px-0">
                              <span className="text-secondary">Phim</span>
                              <strong className="text-end">{selectedMovie?.title ?? 'Chưa chọn'}</strong>
                            </li>
                            <li className="list-group-item bg-transparent d-flex justify-content-between px-0">
                              <span className="text-secondary">Phòng</span>
                              <strong className="text-end">{selectedAuditorium?.name ?? 'Chưa chọn'}</strong>
                            </li>
                            <li className="list-group-item bg-transparent d-flex justify-content-between px-0">
                              <span className="text-secondary">Số ghế</span>
                              <strong>{selectedAuditorium?.totalSeats ?? '-'}</strong>
                            </li>
                            <li className="list-group-item bg-transparent d-flex justify-content-between px-0">
                              <span className="text-secondary">Bắt đầu</span>
                              <strong className="text-end">{form.startTime ? formatDateTime(form.startTime) : 'Chưa chọn'}</strong>
                            </li>
                            <li className="list-group-item bg-transparent d-flex justify-content-between px-0">
                              <span className="text-secondary">Kết thúc dự kiến</span>
                              <strong className="text-end">{endTimePreview || 'Chưa xác định'}</strong>
                            </li>
                            <li className="list-group-item bg-transparent d-flex justify-content-between px-0">
                              <span className="text-secondary">Giá cơ sở</span>
                              <strong>{form.standardPrice ? formatPrice(form.standardPrice) : '-'}</strong>
                            </li>
                            <li className="list-group-item bg-transparent d-flex justify-content-between px-0">
                              <span className="text-secondary">Giá áp dụng</span>
                              <strong className="text-danger">{estimatedPrice !== null ? formatPrice(estimatedPrice) : '-'}</strong>
                            </li>
                          </ul>

                          <div className={`mt-3 rounded-3 border p-2 small ${hasScheduleConflict ? 'border-danger-subtle bg-danger-subtle' : 'border-success-subtle bg-success-subtle'}`}>
                            <div className={`fw-semibold mb-1 ${hasScheduleConflict ? 'text-danger-emphasis' : 'text-success-emphasis'}`}>
                              {hasScheduleConflict ? 'Phát hiện trùng lịch theo phòng' : 'Không trùng lịch theo phòng'}
                            </div>

                            {hasScheduleConflict ? (
                              <ul className="mb-0 ps-3">
                                {conflictedShowtimes.slice(0, 3).map((st) => (
                                  <li key={st.id}>
                                    {`${st.movieTitle ?? 'Suất chiếu'}: ${formatDateTime(st.startTime)} - ${formatDateTime(st.endTime)}`}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span>Khung giờ mới có thể lên lịch trong phòng đã chọn.</span>
                            )}
                          </div>

                          <div className="mt-3 pt-2 border-top border-secondary-subtle">
                            <span className={`badge text-bg-${detectedStrategy.badgeClass}`}>
                              {detectedStrategy.icon} {detectedStrategy.label} ×{detectedStrategy.multiplier}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {formError && (
                      <div className="col-12">
                        <div className="alert alert-danger py-2 px-3 small mb-0">{formError}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Huỷ
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitDisabled}>
                    {saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo lịch'}
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
