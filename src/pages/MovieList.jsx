import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import publicService from '../services/publicService'
import { createGenreOptions, getGenreLabels } from '../utils/genreFactory'
import { movieEventBus } from '../utils/movieEventBus'

const PAGE_SIZE = 12
const MULTI_GENRE_FETCH_SIZE = 60
const MAX_MULTI_GENRE_FETCH_PAGES = 30

const STATUS_LABEL = {
  NOW_SHOWING: 'Đang chiếu',
  COMING_SOON: 'Sắp chiếu',
  STOPPED: 'Ngừng chiếu',
}

const STATUS_BADGE = {
  NOW_SHOWING: 'success',
  COMING_SOON: 'warning',
  STOPPED: 'secondary',
}

function getTodayDateInput() {
  const now = new Date()
  const timezoneOffsetMs = now.getTimezoneOffset() * 60 * 1000
  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 10)
}

function formatDateTime(dateTime) {
  if (!dateTime) return '-'
  const date = new Date(dateTime)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('vi-VN', { hour12: false })
}

function formatPrice(price) {
  const value = Number(price)
  if (!Number.isFinite(value)) return '-'
  return `${value.toLocaleString('vi-VN')} đ`
}

function formatReleaseDate(dateString) {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString
  return date.toLocaleDateString('vi-VN')
}

function truncateText(text, maxLength = 120) {
  const normalized = String(text || '').trim()
  if (!normalized) return 'Nội dung phim đang được cập nhật.'
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength).trimEnd()}...`
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

function MovieList() {
  const [movies, setMovies] = useState([])
  const [genres, setGenres] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [keyword, setKeyword] = useState('')
  const [inputKeyword, setInputKeyword] = useState('')
  const [selectedGenreIds, setSelectedGenreIds] = useState([])

  const [showtimeMovie, setShowtimeMovie] = useState(null)
  const [showtimeDate, setShowtimeDate] = useState(() => getTodayDateInput())
  const [showtimes, setShowtimes] = useState([])
  const [showtimeLoading, setShowtimeLoading] = useState(false)
  const [showtimeError, setShowtimeError] = useState('')
  const [detailMovie, setDetailMovie] = useState(null)
  const [previewMovieId, setPreviewMovieId] = useState(null)
  const [audioPreviewMovieId, setAudioPreviewMovieId] = useState(null)

  const genreOptions = createGenreOptions(genres)
  const detailTrailerEmbedUrl = toYoutubeEmbedUrl(detailMovie?.trailerUrl)

  const fetchAllMoviesForMultiGenre = useCallback(async (kw = '') => {
    const allMovies = []
    let currentPage = 0
    let totalPages = 1
    let safetyCounter = 0

    while (currentPage < totalPages && safetyCounter < MAX_MULTI_GENRE_FETCH_PAGES) {
      const res = await publicService.searchMovies({
        keyword: kw,
        genreId: '',
        page: currentPage,
        size: MULTI_GENRE_FETCH_SIZE,
      })

      const data = res?.data ?? {}
      const items = Array.isArray(data.currentItems) ? data.currentItems : []
      allMovies.push(...items)

      const parsedTotalPages = Number(data.totalPages ?? 0)
      totalPages = Number.isFinite(parsedTotalPages) && parsedTotalPages > 0 ? parsedTotalPages : 0

      if (totalPages === 0) {
        break
      }

      currentPage += 1
      safetyCounter += 1
    }

    return allMovies
  }, [])

  const fetchMovies = useCallback(async (targetPage = 0, kw = keyword, gIds = selectedGenreIds) => {
    setLoading(true)
    setError('')

    try {
      if (gIds.length <= 1) {
        const genreId = gIds[0] ?? ''
        const res = await publicService.searchMovies({ keyword: kw, genreId, page: targetPage, size: PAGE_SIZE })
        const data = res?.data ?? {}
        setMovies(Array.isArray(data.currentItems) ? data.currentItems : [])
        setPage(data.currentPage ?? 0)
        setTotalPages(data.totalPages ?? 0)
      } else {
        const allMovies = await fetchAllMoviesForMultiGenre(kw)
        const filteredMovies = allMovies.filter((movie) =>
          (movie.genres ?? []).some((genre) => gIds.includes(genre?.id))
        )

        const calculatedTotalPages = Math.ceil(filteredMovies.length / PAGE_SIZE)
        const boundedPage = calculatedTotalPages > 0
          ? Math.min(targetPage, calculatedTotalPages - 1)
          : 0
        const start = boundedPage * PAGE_SIZE

        setMovies(filteredMovies.slice(start, start + PAGE_SIZE))
        setPage(boundedPage)
        setTotalPages(calculatedTotalPages)
      }
    } catch (err) {
      setError(err?.message ?? 'Không thể tải danh sách phim.')
    } finally {
      setLoading(false)
    }
  }, [fetchAllMoviesForMultiGenre, keyword, selectedGenreIds])

  useEffect(() => {
    publicService.getGenres().then((res) => setGenres(res?.data ?? [])).catch(() => {})
    fetchMovies(0, '', [])
    // fetchMovies ở đây chỉ chạy 1 lần lúc mount với bộ lọc rỗng.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchShowtimes = useCallback(async (movieId, date) => {
    if (!movieId || !date) {
      setShowtimes([])
      return
    }

    setShowtimeLoading(true)
    setShowtimeError('')

    try {
      const res = await publicService.getShowtimesByMovie(movieId, date)
      setShowtimes(Array.isArray(res?.data) ? res.data : [])
    } catch (err) {
      setShowtimeError(err?.message ?? 'Không thể tải lịch chiếu.')
      setShowtimes([])
    } finally {
      setShowtimeLoading(false)
    }
  }, [])

  const unsubRef = useRef([])
  useEffect(() => {
    const unsubs = [
      movieEventBus.onListRefreshed(() => fetchMovies(page)),
      movieEventBus.onCreated(() => fetchMovies(0)),
      movieEventBus.onUpdated(() => fetchMovies(page)),
      movieEventBus.onDeleted(() => fetchMovies(page)),
    ]
    unsubRef.current = unsubs
    return () => unsubs.forEach((fn) => fn())
  }, [fetchMovies, page])

  useEffect(() => {
    if (!showtimeMovie?.id) {
      return
    }

    fetchShowtimes(showtimeMovie.id, showtimeDate)
  }, [fetchShowtimes, showtimeMovie, showtimeDate])

  const handleSearch = (e) => {
    e.preventDefault()
    const kw = inputKeyword.trim()
    setKeyword(kw)
    setPage(0)
    fetchMovies(0, kw, selectedGenreIds)
  }

  const handleGenreToggle = (genreId) => {
    const nextIds = selectedGenreIds.includes(genreId)
      ? selectedGenreIds.filter((id) => id !== genreId)
      : [...selectedGenreIds, genreId]

    setSelectedGenreIds(nextIds)
    setPage(0)
    fetchMovies(0, keyword, nextIds)
  }

  const handleReset = () => {
    setInputKeyword('')
    setKeyword('')
    setSelectedGenreIds([])
    setPage(0)
    fetchMovies(0, '', [])
  }

  const openShowtimeLookup = (movie) => {
    setDetailMovie(null)
    setShowtimeMovie(movie)
    setShowtimeError('')
    setShowtimes([])
  }

  const closeShowtimeLookup = () => {
    setShowtimeMovie(null)
    setShowtimeError('')
    setShowtimes([])
  }

  const openDetail = (movie) => {
    setDetailMovie(movie)
  }

  const closeDetail = () => {
    setDetailMovie(null)
  }

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h1 className="h3 mb-1">Danh sách phim</h1>
        <p className="text-secondary mb-0">Khám phá các bộ phim đang chiếu và sắp chiếu</p>
      </div>

      <form className="row g-2 mb-4 align-items-end" onSubmit={handleSearch}>
        <div className="col-12 col-md-6">
          <input
            type="text"
            className="form-control bg-dark text-white border-secondary"
            placeholder="Tìm kiếm theo tên phim..."
            value={inputKeyword}
            onChange={(e) => setInputKeyword(e.target.value)}
          />
        </div>
        <div className="col-auto d-flex gap-2">
          <button type="submit" className="btn btn-danger" disabled={loading}>
            {loading ? 'Đang tìm...' : 'Tìm kiếm'}
          </button>
          <button type="button" className="btn btn-outline-secondary" onClick={handleReset}>
            Làm mới
          </button>
        </div>

        <div className="col-12">
          <label className="form-label small text-secondary mb-1">Thể loại (chọn nhiều)</label>
          <div className="d-flex flex-wrap gap-3 p-2 border border-secondary rounded bg-dark bg-opacity-25">
            {genreOptions.length === 0 && (
              <span className="text-secondary small">Không có thể loại.</span>
            )}

            {genreOptions.map((opt) => (
              <div key={opt.value} className="form-check mb-0">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id={`public-genre-${opt.value}`}
                  checked={selectedGenreIds.includes(opt.value)}
                  onChange={() => handleGenreToggle(opt.value)}
                />
                <label className="form-check-label" htmlFor={`public-genre-${opt.value}`}>
                  {opt.label}
                </label>
              </div>
            ))}
          </div>
          <small className="text-secondary">Không chọn thể loại sẽ hiển thị tất cả phim đang chiếu.</small>
        </div>
      </form>

      {error && <div className="alert alert-danger py-2 px-3">{error}</div>}

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      )}

      {!loading && movies.length === 0 && (
        <div className="text-center text-secondary py-5">
          <p className="mb-0">Không tìm thấy phim phù hợp.</p>
        </div>
      )}

      <div className="row g-4">
        {movies.map((movie) => {
          const isAudioPreview = audioPreviewMovieId === movie.id
          const trailerPreviewUrl = toYoutubeAutoplayEmbedUrl(movie.trailerUrl, !isAudioPreview)

          return (
          <div key={movie.id} className="col-12 col-sm-6 col-md-4 col-lg-3">
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
                    style={{ height: 300, pointerEvents: isAudioPreview ? 'auto' : 'none' }}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                ) : movie.posterUrl ? (
                  <img
                    src={movie.posterUrl}
                    className="card-img-top object-fit-cover"
                    alt={movie.title}
                    style={{ height: 300 }}
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                ) : (
                  <div
                    className="bg-secondary d-flex align-items-center justify-content-center text-muted"
                    style={{ height: 300 }}
                  >
                    🎬
                  </div>
                )}

                {previewMovieId === movie.id && movie.trailerUrl && !isAudioPreview && (
                  <span className="position-absolute top-0 end-0 m-2 badge bg-dark bg-opacity-75">
                    Nhấn để bật tiếng
                  </span>
                )}
              </div>
              <div className="card-body d-flex flex-column">
                <h5 className="card-title text-truncate" title={movie.title}>{movie.title}</h5>
                <div className="mb-2 d-flex flex-wrap gap-1">
                  {getGenreLabels(movie.genres ?? []).map((name) => (
                    <span key={name} className="badge text-bg-secondary">{name}</span>
                  ))}
                </div>
                <div className="mb-2 d-flex gap-2 align-items-center flex-wrap">
                  <span className={`badge text-bg-${STATUS_BADGE[movie.status] ?? 'secondary'}`}>
                    {STATUS_LABEL[movie.status] ?? movie.status}
                  </span>
                  {movie.ageRating && (
                    <span className="badge text-bg-info">{movie.ageRating}</span>
                  )}
                  {movie.durationMinutes > 0 && (
                    <small className="text-secondary">{movie.durationMinutes} phút</small>
                  )}
                  {movie.releaseDate && (
                    <small className="text-secondary">Khởi chiếu: {formatReleaseDate(movie.releaseDate)}</small>
                  )}
                </div>
                <p className="small text-secondary mb-3">
                  {truncateText(movie.description, 100)}
                </p>
                <div className="mt-auto d-grid gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-info btn-sm"
                    onClick={() => openDetail(movie)}
                  >
                    Chi tiết phim
                  </button>
                  {movie.status === 'NOW_SHOWING' ? (
                    <button
                      type="button"
                      className="btn btn-outline-warning btn-sm"
                      onClick={() => openShowtimeLookup(movie)}
                    >
                      Xem lịch chiếu
                    </button>
                  ) : (
                    <button type="button" className="btn btn-outline-secondary btn-sm" disabled>
                      Chưa mở lịch chiếu
                    </button>
                  )}
                  <div className="d-flex gap-2">
                    {movie.trailerUrl && (
                      <a
                        href={movie.trailerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline-light btn-sm flex-fill"
                      >
                        Trailer
                      </a>
                    )}
                    {movie.status === 'NOW_SHOWING' ? (
                      <Link
                        to="/login"
                        className={`btn btn-danger btn-sm ${movie.trailerUrl ? 'flex-fill' : 'w-100'}`}
                      >
                        Đặt vé
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className={`btn btn-outline-secondary btn-sm ${movie.trailerUrl ? 'flex-fill' : 'w-100'}`}
                        disabled
                      >
                        Chưa mở bán
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className="d-flex justify-content-center gap-2 mt-4">
          <button
            className="btn btn-outline-secondary btn-sm"
            disabled={loading || page <= 0}
            onClick={() => fetchMovies(page - 1)}
          >
            Trước
          </button>
          <span className="text-secondary align-self-center small">
            Trang {page + 1} / {totalPages}
          </span>
          <button
            className="btn btn-outline-secondary btn-sm"
            disabled={loading || page >= totalPages - 1}
            onClick={() => fetchMovies(page + 1)}
          >
            Sau
          </button>
        </div>
      )}

      {detailMovie && (
        <div
          className="modal d-block"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => e.target === e.currentTarget && closeDetail()}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Chi tiết phim - {detailMovie.title}</h5>
                <button type="button" className="btn-close" onClick={closeDetail} />
              </div>

              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12 col-md-4">
                    {detailMovie.posterUrl ? (
                      <img
                        src={detailMovie.posterUrl}
                        alt={detailMovie.title}
                        className="w-100 rounded border"
                        style={{ maxHeight: 420, objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="border rounded bg-secondary-subtle d-flex align-items-center justify-content-center" style={{ minHeight: 260 }}>
                        <span className="text-secondary">Chưa có poster</span>
                      </div>
                    )}
                  </div>

                  <div className="col-12 col-md-8">
                    <div className="d-flex gap-2 flex-wrap mb-3">
                      <span className={`badge text-bg-${STATUS_BADGE[detailMovie.status] ?? 'secondary'}`}>
                        {STATUS_LABEL[detailMovie.status] ?? detailMovie.status}
                      </span>
                      {detailMovie.ageRating && <span className="badge text-bg-info">{detailMovie.ageRating}</span>}
                      {detailMovie.durationMinutes > 0 && <span className="badge text-bg-secondary">{detailMovie.durationMinutes} phút</span>}
                      {detailMovie.releaseDate && <span className="badge text-bg-dark">Khởi chiếu: {formatReleaseDate(detailMovie.releaseDate)}</span>}
                    </div>

                    <p className="mb-2"><strong>Đạo diễn:</strong> {detailMovie.director || 'Đang cập nhật'}</p>
                    <p className="mb-3"><strong>Diễn viên:</strong> {detailMovie.cast || 'Đang cập nhật'}</p>

                    <p className="mb-2"><strong>Nội dung phim</strong></p>
                    <p className="text-secondary">{detailMovie.description || 'Nội dung phim đang được cập nhật.'}</p>

                    <div className="mb-2"><strong>Trailer</strong></div>
                    {detailTrailerEmbedUrl ? (
                      <div className="ratio ratio-16x9 border rounded overflow-hidden">
                        <iframe
                          src={detailTrailerEmbedUrl}
                          title={`Trailer ${detailMovie.title}`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : detailMovie.trailerUrl ? (
                      <a href={detailMovie.trailerUrl} target="_blank" rel="noreferrer" className="btn btn-outline-primary btn-sm">
                        Mở trailer
                      </a>
                    ) : (
                      <p className="text-secondary mb-0">Chưa có trailer.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer d-flex justify-content-between">
                <button type="button" className="btn btn-secondary" onClick={closeDetail}>
                  Đóng
                </button>
                <div className="d-flex gap-2">
                  {detailMovie.status === 'NOW_SHOWING' ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-outline-warning"
                        onClick={() => openShowtimeLookup(detailMovie)}
                      >
                        Xem lịch chiếu
                      </button>
                      <Link to="/login" className="btn btn-danger">
                        Đăng nhập để đặt vé
                      </Link>
                    </>
                  ) : (
                    <button type="button" className="btn btn-outline-secondary" disabled>
                      Phim sắp chiếu - chưa mở lịch/đặt vé
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showtimeMovie && (
        <div
          className="modal d-block"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => e.target === e.currentTarget && closeShowtimeLookup()}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Lịch chiếu - {showtimeMovie.title}</h5>
                <button type="button" className="btn-close" onClick={closeShowtimeLookup} />
              </div>

              <div className="modal-body">
                <div className="row g-3 align-items-end mb-3">
                  <div className="col-12 col-md-4">
                    <label className="form-label">Ngày chiếu</label>
                    <input
                      type="date"
                      className="form-control"
                      value={showtimeDate}
                      min={getTodayDateInput()}
                      onChange={(e) => setShowtimeDate(e.target.value)}
                    />
                  </div>
                  <div className="col-12 col-md-8">
                    <small className="text-secondary">
                      Tra cứu lịch chiếu theo ngày cho phim đang chọn.
                    </small>
                  </div>
                </div>

                {showtimeError && <div className="alert alert-danger py-2 px-3">{showtimeError}</div>}

                {showtimeLoading && (
                  <div className="text-center py-4 text-secondary">Đang tải lịch chiếu...</div>
                )}

                {!showtimeLoading && !showtimeError && showtimes.length === 0 && (
                  <div className="text-center py-4 text-secondary">
                    Chưa có suất chiếu cho ngày đã chọn.
                  </div>
                )}

                {!showtimeLoading && !showtimeError && showtimes.length > 0 && (
                  <div className="table-responsive border rounded-3">
                    <table className="table table-sm align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Bắt đầu</th>
                          <th>Kết thúc</th>
                          <th>Phòng</th>
                          <th>Giá cơ sở</th>
                        </tr>
                      </thead>
                      <tbody>
                        {showtimes.map((showtime) => (
                          <tr key={showtime.id}>
                            <td>{formatDateTime(showtime.startTime)}</td>
                            <td>{formatDateTime(showtime.endTime)}</td>
                            <td>{showtime.auditoriumName ?? '-'}</td>
                            <td>{formatPrice(showtime.basePrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeShowtimeLookup}>
                  Đóng
                </button>
                <Link to="/login" className="btn btn-danger">
                  Đăng nhập để đặt vé
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MovieList
