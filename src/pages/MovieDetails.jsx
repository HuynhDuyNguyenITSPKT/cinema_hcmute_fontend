import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import movieService from '../services/movieService'

const SHOWTIME_INITIAL_LOOKAHEAD_DAYS = 14
const SHOWTIME_FULL_LOOKAHEAD_DAYS = 60
const SHOWTIME_FETCH_BATCH_SIZE = 15
const SHOWTIME_CACHE_TTL_MS = 5 * 60 * 1000
const showtimeCache = new Map()

function formatDateOnly(dateTime) {
  const parsed = new Date(dateTime)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleDateString('vi-VN')
}

function formatTimeOnly(dateTime) {
  const parsed = new Date(dateTime)
  if (Number.isNaN(parsed.getTime())) return '--:--'
  return parsed.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function getDateKey(dateTime) {
  const parsed = new Date(dateTime)
  if (Number.isNaN(parsed.getTime())) return 'invalid-date'
  const pad = (n) => String(n).padStart(2, '0')
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`
}

function toDateInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function sortShowtimesByStartTime(items) {
  return items
    .slice()
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
}

function mergeShowtimesById(...lists) {
  const mergedMap = new Map()

  lists.flat().forEach((item) => {
    const key = String(item?.id ?? '')
    if (!key) {
      return
    }

    if (!mergedMap.has(key)) {
      mergedMap.set(key, item)
    }
  })

  return sortShowtimesByStartTime(Array.from(mergedMap.values()))
}

function MovieDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [movie, setMovie] = useState(null)
  const [showtimes, setShowtimes] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [showtimesLoading, setShowtimesLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    movieService.getMovieById(id)
      .then(res => setMovie(res.data || res))
      .catch(() => setMovie(null))
      .finally(() => setLoading(false))
  }, [id])

  const fetchShowtimesByDates = useCallback(async (dates) => {
    const merged = []
    const seenIds = new Set()

    for (let index = 0; index < dates.length; index += SHOWTIME_FETCH_BATCH_SIZE) {
      const chunk = dates.slice(index, index + SHOWTIME_FETCH_BATCH_SIZE)
      const responses = await Promise.allSettled(
        chunk.map((date) => movieService.getShowtimesByMovieAndDate(id, date))
      )

      responses.forEach((result) => {
        if (result.status !== 'fulfilled') {
          return
        }

        const payload = result.value
        const items = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
          ? payload
          : []

        items.forEach((item) => {
          const key = String(item?.id ?? '')

          if (key && seenIds.has(key)) {
            return
          }

          if (key) {
            seenIds.add(key)
          }

          merged.push(item)
        })
      })
    }

    return sortShowtimesByStartTime(merged)
  }, [id])

  const fetchShowtimes = useCallback(async () => {
    const cachedEntry = showtimeCache.get(id)
    const nowTimestamp = Date.now()

    if (cachedEntry && nowTimestamp - cachedEntry.fetchedAt < SHOWTIME_CACHE_TTL_MS) {
      setShowtimes(cachedEntry.items)
      setShowtimesLoading(false)
      return
    }

    setShowtimesLoading(true)

    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const candidateDates = Array.from({ length: SHOWTIME_FULL_LOOKAHEAD_DAYS + 1 }, (_, offset) => {
        const cursor = new Date(today)
        cursor.setDate(today.getDate() + offset)
        return toDateInputValue(cursor)
      })

      const initialDates = candidateDates.slice(0, SHOWTIME_INITIAL_LOOKAHEAD_DAYS + 1)
      const remainingDates = candidateDates.slice(SHOWTIME_INITIAL_LOOKAHEAD_DAYS + 1)

      const initialShowtimes = await fetchShowtimesByDates(initialDates)
      setShowtimes(initialShowtimes)
      setShowtimesLoading(false)

      let finalShowtimes = initialShowtimes

      if (remainingDates.length > 0) {
        const remainingShowtimes = await fetchShowtimesByDates(remainingDates)
        finalShowtimes = mergeShowtimesById(initialShowtimes, remainingShowtimes)
        setShowtimes(finalShowtimes)
      }

      showtimeCache.set(id, {
        fetchedAt: Date.now(),
        items: finalShowtimes,
      })
    } catch {
      setShowtimes([])
      setShowtimesLoading(false)
    } finally {
      setShowtimesLoading(false)
    }
  }, [fetchShowtimesByDates, id])

  useEffect(() => { fetchShowtimes() }, [fetchShowtimes])

  const groupedShowtimes = useMemo(() => {
    const sorted = showtimes
      .slice()
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

    const byDate = new Map()

    sorted.forEach((st) => {
      const dateKey = getDateKey(st.startTime)
      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, {
          key: dateKey,
          label: formatDateOnly(st.startTime),
          items: [],
        })
      }

      byDate.get(dateKey).items.push(st)
    })

    return Array.from(byDate.values())
  }, [showtimes])

  const visibleGroupedShowtimes = useMemo(() => {
    if (!selectedDate) {
      return groupedShowtimes
    }

    return groupedShowtimes.filter((group) => group.key === selectedDate)
  }, [groupedShowtimes, selectedDate])

  useEffect(() => {
    if (!selectedDate) {
      return
    }

    const hasSelectedDate = groupedShowtimes.some((group) => group.key === selectedDate)
    if (!hasSelectedDate) {
      setSelectedDate('')
    }
  }, [groupedShowtimes, selectedDate])

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
        <div className="card-header border-secondary d-flex align-items-center justify-content-between gap-3 flex-wrap">
          <h5 className="mb-0 text-light">🎬 Lịch Chiếu</h5>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <small className="text-secondary">Chọn ngày có suất chiếu:</small>
            <button
              type="button"
              className={`btn btn-sm ${selectedDate ? 'btn-outline-secondary' : 'btn-danger'}`}
              onClick={() => setSelectedDate('')}
            >
              Tất cả
            </button>
            {groupedShowtimes.map((group) => (
              <button
                key={group.key}
                type="button"
                className={`btn btn-sm ${selectedDate === group.key ? 'btn-danger' : 'btn-outline-secondary'}`}
                onClick={() => setSelectedDate(group.key)}
              >
                {group.label}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body">
          {showtimesLoading ? (
            <p className="text-secondary text-center py-3">Đang tải lịch chiếu...</p>
          ) : visibleGroupedShowtimes.length === 0 ? (
            <p className="text-secondary text-center py-3">
              {selectedDate
                ? 'Không có suất chiếu trong ngày đã chọn.'
                : `Hiện chưa có suất chiếu trong ${SHOWTIME_FULL_LOOKAHEAD_DAYS} ngày tới.`}
            </p>
          ) : (
            <div className="vstack gap-3">
              {visibleGroupedShowtimes.map((group) => (
                <div key={group.key}>
                  <div className="small fw-semibold text-secondary mb-2">{group.label}</div>
                  <div className="row g-3">
                    {group.items.map(st => (
                      <div key={st.id} className="col-md-4">
                        <div className="border border-secondary rounded p-3 text-light bg-dark" style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/seat-selection/${st.id}`, { state: { showtime: st, movie } })}>
                          <div className="fw-bold text-danger mb-1">
                            {formatTimeOnly(st.startTime)} - {formatTimeOnly(st.endTime)}
                          </div>
                          <small className="text-secondary d-block">
                            Phòng: {st.auditoriumName ?? '-'}
                          </small>
                          <div className="mt-2 text-warning small fw-semibold">
                            Từ {st.basePrice?.toLocaleString('vi-VN')}đ / ghế
                          </div>
                        </div>
                      </div>
                    ))}
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
