import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import publicService from '../services/publicService'
import { getGenreLabels } from '../utils/genreFactory'

const PREVIEW_SIZE = 6

const HOME_MOVIE_STATUS_OPTIONS = [
  { value: 'NOW_SHOWING', label: 'Phim đang chiếu' },
  { value: 'COMING_SOON', label: 'Phim sắp chiếu' },
]

function truncateText(text, maxLength = 95) {
  const normalized = String(text || '').trim()
  if (!normalized) return 'Nội dung phim đang được cập nhật.'
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength).trimEnd()}...`
}

function formatReleaseDate(dateString) {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString
  return date.toLocaleDateString('vi-VN')
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

function Home() {
  const [movies, setMovies] = useState([])
  const [movieStatusFilter, setMovieStatusFilter] = useState('NOW_SHOWING')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [previewMovieId, setPreviewMovieId] = useState(null)
  const [audioPreviewMovieId, setAudioPreviewMovieId] = useState(null)

  const currentStatusLabel = HOME_MOVIE_STATUS_OPTIONS.find((opt) => opt.value === movieStatusFilter)?.label ?? 'Phim đang chiếu'

  useEffect(() => {
    let active = true

    const loadMovies = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await publicService.searchMovies({ page: 0, size: PREVIEW_SIZE, status: movieStatusFilter })
        const items = res?.data?.currentItems ?? []
        if (active) {
          setMovies(Array.isArray(items) ? items : [])
        }
      } catch (err) {
        if (active) {
          setError(err?.message ?? 'Không thể tải danh sách phim.')
          setMovies([])
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadMovies()

    return () => {
      active = false
    }
  }, [movieStatusFilter])

  return (
    <div className="container mt-5">
      <div id="movieCarousel" className="carousel slide mb-5 shadow rounded overflow-hidden" data-bs-ride="carousel">
        <div className="carousel-inner">
          <div className="carousel-item active">
            <img src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=1200&h=400" className="d-block w-100 object-fit-cover" alt="Banner 1" style={{ height: '400px' }} />

            <div className="carousel-caption d-none d-md-block bg-dark bg-opacity-50 rounded p-3">
              <h5>Trải nghiệm điện ảnh đỉnh cao</h5>
              <p>Hệ thống rạp chiếu phim hiện đại với âm thanh và hình ảnh sống động.</p>
            </div>
          </div>
          <div className="carousel-item">
            <img src="https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&q=80&w=1200&h=400" className="d-block w-100 object-fit-cover" alt="Banner 2" style={{ height: '400px' }} />
            <div className="carousel-caption d-none d-md-block bg-dark bg-opacity-50 rounded p-3">
              <h5>Cập nhật phim mới liên tục</h5>
              <p>Tra cứu phim, lọc thể loại và xem lịch chiếu nhanh theo ngày.</p>
            </div>
          </div>
        </div>
        <button className="carousel-control-prev" type="button" data-bs-target="#movieCarousel" data-bs-slide="prev">
          <span className="carousel-control-prev-icon" aria-hidden="true"></span>
        </button>
        <button className="carousel-control-next" type="button" data-bs-target="#movieCarousel" data-bs-slide="next">
          <span className="carousel-control-next-icon" aria-hidden="true"></span>
        </button>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom border-secondary pb-2">

        <div className="dropdown">
          <button
            type="button"
            className="btn btn-outline-light dropdown-toggle"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            {currentStatusLabel}
          </button>
          <ul className="dropdown-menu">
            {HOME_MOVIE_STATUS_OPTIONS.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  className={`dropdown-item ${movieStatusFilter === option.value ? 'active' : ''}`}
                  onClick={() => setMovieStatusFilter(option.value)}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <Link to="/movies" className="text-danger fw-bold text-decoration-none">Xem thêm &raquo;</Link>
      </div>

      {error && <div className="alert alert-danger py-2 px-3">{error}</div>}

      {loading && (
        <div className="text-center text-secondary py-5">Đang tải danh sách phim...</div>
      )}

      {!loading && movies.length === 0 && !error && (
        <div className="text-center text-secondary py-5">Chưa có {currentStatusLabel.toLowerCase()}.</div>
      )}

      <div className="row g-4 mb-5">
        {movies.map((movie) => {
          const isAudioPreview = audioPreviewMovieId === movie.id
          const trailerPreviewUrl = toYoutubeAutoplayEmbedUrl(movie.trailerUrl, !isAudioPreview)

          return (
          <div key={movie.id} className="col-12 col-sm-6 col-md-4 col-lg-4">
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
                    style={{ height: '350px', pointerEvents: isAudioPreview ? 'auto' : 'none' }}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                ) : movie.posterUrl ? (
                  <img src={movie.posterUrl} className="card-img-top object-fit-cover" alt={movie.title} style={{ height: '350px' }} />
                ) : (
                  <div className="card-img-top bg-secondary d-flex align-items-center justify-content-center" style={{ height: '350px' }}>
                    <span className="text-light">Không có poster</span>
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
                <p className="card-text text-muted mb-2">
                  <small>{getGenreLabels(movie.genres ?? []).join(', ') || 'Chưa có thể loại'}</small>
                </p>
                <p className="card-text small text-light-emphasis mb-2">
                  {truncateText(movie.description)}
                </p>
                <div className="mb-3 d-flex gap-2 flex-wrap">
                  <span className={`badge ${movie.status === 'NOW_SHOWING' ? 'bg-success' : 'bg-warning text-dark'}`}>
                    {movie.status === 'NOW_SHOWING' ? 'Đang chiếu' : 'Sắp chiếu'}
                  </span>
                  {movie.ageRating && (
                    <span className="badge bg-info text-dark">{movie.ageRating}</span>
                  )}
                  {movie.durationMinutes > 0 && (
                    <span className="badge bg-secondary">{movie.durationMinutes} phút</span>
                  )}
                  {movie.releaseDate && (
                    <span className="badge bg-dark border border-secondary">{formatReleaseDate(movie.releaseDate)}</span>
                  )}
                </div>
                <div className="mt-auto d-flex gap-2">
                  {movie.trailerUrl && (
                    <a href={movie.trailerUrl} target="_blank" rel="noreferrer" className="btn btn-outline-light flex-fill">
                      Trailer
                    </a>
                  )}
                  {movie.status === 'NOW_SHOWING' ? (
                    <Link
                      to={`/movies?openShowtimes=1&movieId=${encodeURIComponent(movie.id)}&movieTitle=${encodeURIComponent(movie.title)}`}
                      className={`btn btn-danger ${movie.trailerUrl ? 'flex-fill' : 'w-100'}`}
                    >
                      Lịch chiếu
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className={`btn btn-outline-secondary ${movie.trailerUrl ? 'flex-fill' : 'w-100'}`}
                      disabled
                    >
                      Chưa mở lịch chiếu
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          )
        })}
      </div>

    </div>
  )
}

export default Home
