import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import movieService from '../services/movieService'

function MovieDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [movie, setMovie] = useState(null)
  const [showtimes, setShowtimes] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    movieService.getMovieById(id)
      .then(res => setMovie(res.data || res))
      .catch(() => setMovie(null))
      .finally(() => setLoading(false))
  }, [id])

  const fetchShowtimes = useCallback(() => {
    movieService.getShowtimesByMovieAndDate(id, selectedDate)
      .then(res => setShowtimes(res.data || res || []))
      .catch(() => setShowtimes([]))
  }, [id, selectedDate])

  useEffect(() => { fetchShowtimes() }, [fetchShowtimes])

  if (loading) return (
    <div className="text-center py-5">
      <div className="spinner-border text-danger" role="status" />
    </div>
  )

  if (!movie) return (
    <div className="container py-5 text-center text-secondary">Không tìm thấy phim.</div>
  )

  return (
    <div className="container py-4" style={{ maxWidth: 960 }}>
      {/* Movie Header */}
      <div className="row g-4 mb-5">
        <div className="col-md-4">
          <img
            src={movie.posterUrl || movie.imageUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=400'}
            className="img-fluid rounded shadow" alt={movie.title} style={{ maxHeight: 480, width: '100%', objectFit: 'cover' }} />
        </div>
        <div className="col-md-8 text-light">
          <h1 className="fw-bold mb-2">{movie.title}</h1>
          <p className="text-secondary mb-1">
            <span className="badge bg-warning text-dark me-2">{movie.ageRating || 'P'}</span>
            {movie.duration && <span className="me-2">⏱ {movie.duration} phút</span>}
            {movie.releaseDate && <span>📅 {movie.releaseDate}</span>}
          </p>
          {movie.genres && (
            <p className="mb-2"><span className="text-secondary">Thể loại: </span>{movie.genres.map(g => g.name).join(', ')}</p>
          )}
          {movie.director && (
            <p className="mb-2"><span className="text-secondary">Đạo diễn: </span>{movie.director}</p>
          )}
          {movie.cast && (
            <p className="mb-2"><span className="text-secondary">Diễn viên: </span>{movie.cast}</p>
          )}
          {movie.description && (
            <p className="mt-3 text-light-emphasis">{movie.description}</p>
          )}
        </div>
      </div>

      {/* Showtimes */}
      <div className="card bg-dark border-secondary">
        <div className="card-header border-secondary d-flex align-items-center gap-3">
          <h5 className="mb-0 text-light">🎬 Lịch Chiếu</h5>
          <input
            type="date"
            className="form-control form-control-sm bg-dark text-light border-secondary"
            style={{ width: 180 }}
            value={selectedDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>
        <div className="card-body">
          {showtimes.length === 0 ? (
            <p className="text-secondary text-center py-3">Không có suất chiếu nào trong ngày này.</p>
          ) : (
            <div className="row g-3">
              {showtimes.map(st => (
                <div key={st.id} className="col-md-4">
                  <div className="border border-secondary rounded p-3 text-light bg-dark" style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/seat-selection/${st.id}`, { state: { showtime: st, movie } })}>
                    <div className="fw-bold text-danger mb-1">
                      {new Date(st.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <small className="text-secondary d-block">{st.auditoriumName}</small>
                    <small className="text-secondary d-block">
                      ~{new Date(st.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </small>
                    <div className="mt-2 text-warning small fw-semibold">
                      Từ {st.basePrice?.toLocaleString('vi-VN')}đ / ghế
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* B2B Notice */}
      <div className="mt-4 d-flex align-items-center justify-content-between p-3 border border-warning rounded bg-dark">
        <div className="text-light">
          <strong>🏢 Đặt vé theo đoàn (Doanh nghiệp / Sự kiện)?</strong>
          <div className="text-secondary small mt-1">Từ 20 người trở lên. Hưởng chiết khấu đặc biệt & hỗ trợ tư vấn riêng.</div>
        </div>
        <button className="btn btn-warning fw-bold"
          onClick={() => navigate('/group-booking', { state: { movie } })}>
          Đặt Vé Đoàn
        </button>
      </div>
    </div>
  )
}

export default MovieDetails
