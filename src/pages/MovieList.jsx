import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import publicService from '../services/publicService'
import { createGenreOptions, getGenreLabels } from '../utils/genreFactory'
import { movieEventBus } from '../utils/movieEventBus'

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

function MovieList() {
  const [movies, setMovies] = useState([])
  const [genres, setGenres] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [keyword, setKeyword] = useState('')
  const [inputKeyword, setInputKeyword] = useState('')
  const [selectedGenreId, setSelectedGenreId] = useState('')

  const genreOptions = createGenreOptions(genres)

  const fetchMovies = useCallback(async (targetPage = 0, kw = keyword, gId = selectedGenreId) => {
    setLoading(true)
    setError('')
    try {
      const res = await publicService.searchMovies({ keyword: kw, genreId: gId, page: targetPage, size: 12 })
      const data = res?.data ?? {}
      setMovies(data.currentItems ?? [])
      setPage(data.currentPage ?? 0)
      setTotalPages(data.totalPages ?? 0)
    } catch (err) {
      setError(err?.message ?? 'Không thể tải danh sách phim.')
    } finally {
      setLoading(false)
    }
  }, [keyword, selectedGenreId])

  useEffect(() => {
    publicService.getGenres().then((res) => setGenres(res?.data ?? [])).catch(() => {})
    fetchMovies(0, '', '')
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

  const handleSearch = (e) => {
    e.preventDefault()
    const kw = inputKeyword.trim()
    setKeyword(kw)
    setPage(0)
    fetchMovies(0, kw, selectedGenreId)
  }

  const handleGenreChange = (e) => {
    const gId = e.target.value
    setSelectedGenreId(gId)
    setPage(0)
    fetchMovies(0, keyword, gId)
  }

  const handleReset = () => {
    setInputKeyword('')
    setKeyword('')
    setSelectedGenreId('')
    setPage(0)
    fetchMovies(0, '', '')
  }

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h1 className="h3 mb-1">Danh sách phim</h1>
        <p className="text-secondary mb-0">Khám phá các bộ phim đang chiếu và sắp chiếu</p>
      </div>

      <form className="row g-2 mb-4 align-items-end" onSubmit={handleSearch}>
        <div className="col-12 col-md-5">
          <input
            type="text"
            className="form-control bg-dark text-white border-secondary"
            placeholder="Tìm kiếm theo tên phim..."
            value={inputKeyword}
            onChange={(e) => setInputKeyword(e.target.value)}
          />
        </div>
        <div className="col-12 col-md-3">
          <select
            className="form-select bg-dark text-white border-secondary"
            value={selectedGenreId}
            onChange={handleGenreChange}
          >
            <option value="">Tất cả thể loại</option>
            {genreOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="col-auto d-flex gap-2">
          <button type="submit" className="btn btn-danger" disabled={loading}>
            {loading ? 'Đang tìm...' : 'Tìm kiếm'}
          </button>
          <button type="button" className="btn btn-outline-secondary" onClick={handleReset}>
            Làm mới
          </button>
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
        {movies.map((movie) => (
          <div key={movie.id} className="col-12 col-sm-6 col-md-4 col-lg-3">
            <div className="card h-100 bg-dark text-white border-secondary shadow-sm">
              {movie.posterUrl ? (
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
                </div>
                <div className="mt-auto d-flex gap-2">
                  {movie.trailerUrl && (
                    <a
                      href={movie.trailerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline-light btn-sm w-50"
                    >
                      Trailer
                    </a>
                  )}
                  <Link to="/login" className="btn btn-danger btn-sm w-50">
                    Đặt vé
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
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
    </div>
  )
}

export default MovieList
