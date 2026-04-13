import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import movieService from '../services/movieService'
import reviewService from '../services/reviewService'
import { notifyError, notifySuccess } from '../utils/notify'

const SHOWTIME_INITIAL_LOOKAHEAD_DAYS = 14
const SHOWTIME_FULL_LOOKAHEAD_DAYS = 60
const SHOWTIME_FETCH_BATCH_SIZE = 15
const SHOWTIME_CACHE_TTL_MS = 5 * 60 * 1000
const REVIEW_PAGE_SIZE = 10
const REVIEW_SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Mới nhất' },
  { value: 'createdAt:asc', label: 'Cũ nhất' },
  { value: 'rating:desc', label: 'Điểm cao nhất' },
  { value: 'rating:asc', label: 'Điểm thấp nhất' },
]
const REVIEW_FORM_INITIAL = {
  rating: '5',
  comment: '',
}
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

function formatReviewDate(dateTime) {
  const parsed = new Date(dateTime)

  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }

  return parsed.toLocaleDateString('vi-VN')
}

function normalizePageableData(payload, fallbackSize = 10) {
  const source = payload?.data ?? payload ?? {}

  const currentItems = Array.isArray(source.currentItems)
    ? source.currentItems
    : Array.isArray(source.content)
    ? source.content
    : Array.isArray(source.items)
    ? source.items
    : Array.isArray(source)
    ? source
    : []

  const totalItems = Number.isFinite(Number(source.totalItems))
    ? Number(source.totalItems)
    : Number.isFinite(Number(source.totalElements))
    ? Number(source.totalElements)
    : currentItems.length

  const totalPages = Number.isFinite(Number(source.totalPages))
    ? Number(source.totalPages)
    : Number.isFinite(Number(source.totalPage))
    ? Number(source.totalPage)
    : totalItems > 0
    ? Math.ceil(totalItems / Math.max(fallbackSize, 1))
    : 0

  const currentPage = Number.isFinite(Number(source.currentPage))
    ? Number(source.currentPage)
    : Number.isFinite(Number(source.number))
    ? Number(source.number)
    : 0

  return {
    currentItems,
    totalItems,
    totalPages,
    currentPage,
  }
}

function buildPagination(currentPage, totalPages) {
  if (totalPages <= 0) {
    return []
  }

  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx)
  }

  const pages = [0]
  const start = Math.max(1, currentPage - 1)
  const end = Math.min(totalPages - 2, currentPage + 1)

  if (start > 1) {
    pages.push('ellipsis-left')
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }

  if (end < totalPages - 2) {
    pages.push('ellipsis-right')
  }

  pages.push(totalPages - 1)
  return pages
}

function resolveCurrentUserId(user) {
  const value = user?.userId ?? user?.id ?? user?.accountId ?? ''
  return String(value || '').trim()
}

function MovieDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [movie, setMovie] = useState(null)
  const [showtimes, setShowtimes] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [showtimesLoading, setShowtimesLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reviewStats, setReviewStats] = useState({ averageRating: 0, totalComments: 0 })
  const [reviewPageData, setReviewPageData] = useState({
    currentItems: [],
    currentPage: 0,
    totalPages: 0,
    totalItems: 0,
  })
  const [reviewSortValue, setReviewSortValue] = useState('createdAt:desc')
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewRemoving, setReviewRemoving] = useState(false)
  const [myReviewLoading, setMyReviewLoading] = useState(false)
  const [myReview, setMyReview] = useState(null)
  const [reviewForm, setReviewForm] = useState(REVIEW_FORM_INITIAL)
  const [reviewFormError, setReviewFormError] = useState('')

  const currentUserId = useMemo(() => resolveCurrentUserId(user), [user])

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

  const fetchReviewStats = useCallback(async () => {
    try {
      const response = await reviewService.getPublicRatingStats(id)
      const stats = response?.data || {}

      setReviewStats({
        averageRating: Number.isFinite(Number(stats.averageRating)) ? Number(stats.averageRating) : 0,
        totalComments: Number.isFinite(Number(stats.totalComments)) ? Number(stats.totalComments) : 0,
      })
    } catch {
      setReviewStats({ averageRating: 0, totalComments: 0 })
    }
  }, [id])

  const fetchMovieReviews = useCallback(async (targetPage = 0) => {
    if (!isAuthenticated) {
      setReviewPageData({
        currentItems: [],
        currentPage: 0,
        totalPages: 0,
        totalItems: 0,
      })
      return
    }

    setReviewLoading(true)

    try {
      const [sortBy = 'createdAt', sortDir = 'desc'] = String(reviewSortValue || '').split(':')

      const response = await reviewService.getMoviePageable({
        movieId: id,
        sortBy,
        sortDir,
        page: targetPage,
        size: REVIEW_PAGE_SIZE,
      })

      setReviewPageData(normalizePageableData(response, REVIEW_PAGE_SIZE))
    } catch (err) {
      notifyError(err?.message || 'Không thể tải danh sách bình luận.')
      setReviewPageData({
        currentItems: [],
        currentPage: 0,
        totalPages: 0,
        totalItems: 0,
      })
    } finally {
      setReviewLoading(false)
    }
  }, [id, isAuthenticated, reviewSortValue])

  const fetchMyReview = useCallback(async () => {
    if (!isAuthenticated) {
      setMyReview(null)
      setReviewForm(REVIEW_FORM_INITIAL)
      setReviewFormError('')
      return
    }

    setMyReviewLoading(true)

    try {
      const response = await reviewService.getMyPageable({
        movieId: id,
        sortBy: 'createdAt',
        sortDir: 'desc',
        page: 0,
        size: 1,
      })

      const parsedData = normalizePageableData(response, 1)
      const ownReview = parsedData.currentItems[0] || null

      setMyReview(ownReview)

      if (ownReview) {
        setReviewForm({
          rating: String(ownReview.rating ?? 5),
          comment: String(ownReview.comment || ''),
        })
      } else {
        setReviewForm(REVIEW_FORM_INITIAL)
      }

      setReviewFormError('')
    } catch {
      setMyReview(null)
      setReviewForm(REVIEW_FORM_INITIAL)
      setReviewFormError('')
    } finally {
      setMyReviewLoading(false)
    }
  }, [id, isAuthenticated])

  useEffect(() => {
    fetchReviewStats()
  }, [fetchReviewStats])

  useEffect(() => {
    fetchMovieReviews(0)
  }, [fetchMovieReviews])

  useEffect(() => {
    fetchMyReview()
  }, [fetchMyReview])

  const handleReviewPageChange = (nextPage) => {
    if (nextPage < 0 || nextPage >= reviewPageData.totalPages) {
      return
    }

    fetchMovieReviews(nextPage)
  }

  const validateReviewPayload = () => {
    const rating = Number(reviewForm.rating)
    const comment = String(reviewForm.comment || '').trim()

    if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
      return { valid: false, message: 'Điểm đánh giá phải nằm trong khoảng 0.0 đến 5.0.' }
    }

    if (!comment) {
      return { valid: false, message: 'Nội dung bình luận là bắt buộc.' }
    }

    if (comment.length > 2000) {
      return { valid: false, message: 'Nội dung bình luận tối đa 2000 ký tự.' }
    }

    return {
      valid: true,
      rating,
      comment,
    }
  }

  const handleSubmitReview = async (event) => {
    event.preventDefault()

    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    const validationResult = validateReviewPayload()

    if (!validationResult.valid) {
      setReviewFormError(validationResult.message)
      return
    }

    setReviewSubmitting(true)
    setReviewFormError('')

    try {
      if (myReview?.id) {
        await reviewService.update(myReview.id, {
          rating: validationResult.rating,
          comment: validationResult.comment,
        })
        notifySuccess('Cập nhật bình luận thành công.')
      } else {
        await reviewService.create({
          movieId: id,
          rating: validationResult.rating,
          comment: validationResult.comment,
        })
        notifySuccess('Đánh giá phim thành công.')
      }

      await Promise.all([
        fetchMovieReviews(0),
        fetchMyReview(),
        fetchReviewStats(),
      ])
    } catch (err) {
      notifyError(err?.message || 'Không thể gửi bình luận.')
    } finally {
      setReviewSubmitting(false)
    }
  }

  const handleDeleteMyReview = async () => {
    if (!myReview?.id) {
      return
    }

    const confirmed = window.confirm('Bạn có chắc chắn muốn xóa bình luận của mình?')

    if (!confirmed) {
      return
    }

    setReviewRemoving(true)

    try {
      await reviewService.remove(myReview.id)
      notifySuccess('Xóa bình luận thành công.')
      setReviewForm(REVIEW_FORM_INITIAL)

      await Promise.all([
        fetchMovieReviews(0),
        fetchMyReview(),
        fetchReviewStats(),
      ])
    } catch (err) {
      notifyError(err?.message || 'Không thể xóa bình luận.')
    } finally {
      setReviewRemoving(false)
    }
  }

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

  const reviewPaginationItems = buildPagination(reviewPageData.currentPage, reviewPageData.totalPages)
  const displayAverageRating = Number(reviewStats.averageRating || 0).toFixed(1)
  const displayTotalComments = Math.max(reviewStats.totalComments || 0, reviewPageData.totalItems || 0)
  const reviewRatingOptions = useMemo(
    () => Array.from({ length: 11 }, (_, idx) => (idx * 0.5).toFixed(1)),
    []
  )

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

      {/* Reviews */}
      <div className="card bg-dark border-secondary mt-4">
        <div className="card-header border-secondary d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <h5 className="mb-1 text-light">⭐ Đánh giá phim</h5>
            <p className="mb-0 text-secondary small">Chia sẻ cảm nhận để giúp người xem khác chọn phim dễ hơn.</p>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="badge bg-warning text-dark px-3 py-2">{displayAverageRating} / 5</span>
            <span className="badge bg-secondary px-3 py-2">{displayTotalComments} bình luận</span>
            <select
              className="form-select form-select-sm bg-dark text-light border-secondary"
              value={reviewSortValue}
              onChange={(event) => setReviewSortValue(event.target.value)}
              style={{ width: 190 }}
              disabled={!isAuthenticated || reviewLoading}
            >
              {REVIEW_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="card-body">
          <div className="row g-4">
            <div className="col-12 col-lg-5">
              {!isAuthenticated ? (
                <div className="border border-secondary rounded-3 p-3 bg-black">
                  <p className="text-secondary mb-3">Đăng nhập để viết và xem bình luận chi tiết về phim.</p>
                  <button className="btn btn-danger" onClick={() => navigate('/login')}>
                    Đăng nhập để đánh giá
                  </button>
                </div>
              ) : myReviewLoading ? (
                <div className="text-secondary">Đang tải đánh giá của bạn...</div>
              ) : (
                <form className="border border-secondary rounded-3 p-3 bg-black" onSubmit={handleSubmitReview}>
                  <h6 className="text-light mb-3">{myReview ? 'Cập nhật đánh giá của bạn' : 'Viết đánh giá của bạn'}</h6>

                  <div className="mb-3">
                    <label className="form-label text-secondary small">Điểm đánh giá (0.0 - 5.0)</label>
                    <select
                      className="form-select bg-dark text-light border-secondary"
                      value={reviewForm.rating}
                      onChange={(event) => setReviewForm((prev) => ({ ...prev, rating: event.target.value }))}
                      disabled={reviewSubmitting || reviewRemoving}
                    >
                      {reviewRatingOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-2">
                    <label className="form-label text-secondary small">Nội dung bình luận</label>
                    <textarea
                      className="form-control bg-dark text-light border-secondary"
                      rows={5}
                      maxLength={2000}
                      value={reviewForm.comment}
                      onChange={(event) => setReviewForm((prev) => ({ ...prev, comment: event.target.value }))}
                      placeholder="Ví dụ: Nội dung hay, diễn xuất tốt, nhạc phim ấn tượng..."
                      disabled={reviewSubmitting || reviewRemoving}
                    />
                    <div className="small text-secondary mt-1 text-end">{reviewForm.comment.length}/2000</div>
                  </div>

                  {reviewFormError ? <div className="alert alert-danger py-2 px-3 mb-3">{reviewFormError}</div> : null}

                  <div className="d-grid d-sm-flex gap-2">
                    <button
                      type="submit"
                      className="btn btn-danger"
                      disabled={reviewSubmitting || reviewRemoving}
                    >
                      {reviewSubmitting
                        ? 'Đang gửi...'
                        : myReview
                        ? 'Cập nhật bình luận'
                        : 'Gửi bình luận'}
                    </button>

                    {myReview ? (
                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={handleDeleteMyReview}
                        disabled={reviewSubmitting || reviewRemoving}
                      >
                        {reviewRemoving ? 'Đang xóa...' : 'Xóa bình luận của tôi'}
                      </button>
                    ) : null}
                  </div>
                </form>
              )}
            </div>

            <div className="col-12 col-lg-7">
              {!isAuthenticated ? (
                <div className="text-secondary">Bạn cần đăng nhập để xem danh sách bình luận chi tiết.</div>
              ) : reviewLoading ? (
                <div className="text-center py-4 text-secondary">
                  <div className="spinner-border spinner-border-sm text-danger me-2" role="status" />
                  Đang tải bình luận...
                </div>
              ) : reviewPageData.currentItems.length === 0 ? (
                <div className="text-secondary">Chưa có bình luận nào cho phim này.</div>
              ) : (
                <>
                  <div className="vstack gap-3">
                    {reviewPageData.currentItems.map((item) => {
                      const isMine = currentUserId && String(item.userId || '') === currentUserId

                      return (
                        <article key={item.id} className="border border-secondary rounded-3 p-3 bg-black">
                          <div className="d-flex justify-content-between align-items-start gap-2">
                            <div>
                              <div className="fw-semibold text-light">{item.userFullName || `User #${item.userId ?? '-'}`}</div>
                              <small className="text-secondary">{formatReviewDate(item.createdAt)}</small>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              {isMine ? <span className="badge bg-info text-dark">Của bạn</span> : null}
                              <span className="badge bg-warning text-dark">{Number(item.rating || 0).toFixed(1)} / 5</span>
                            </div>
                          </div>
                          <p className="mb-0 mt-2 text-light-emphasis" style={{ whiteSpace: 'pre-line' }}>
                            {item.comment || '-'}
                          </p>
                        </article>
                      )
                    })}
                  </div>

                  {reviewPageData.totalPages > 1 ? (
                    <div className="d-flex flex-wrap gap-2 align-items-center justify-content-end mt-3">
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        type="button"
                        onClick={() => handleReviewPageChange(reviewPageData.currentPage - 1)}
                        disabled={reviewLoading || reviewPageData.currentPage <= 0}
                      >
                        Trước
                      </button>

                      {reviewPaginationItems.map((item, index) => {
                        if (typeof item !== 'number') {
                          return (
                            <span className="text-secondary px-1" key={`${item}-${index}`}>
                              ...
                            </span>
                          )
                        }

                        return (
                          <button
                            key={item}
                            className={`btn btn-sm ${item === reviewPageData.currentPage ? 'btn-danger' : 'btn-outline-secondary'}`}
                            type="button"
                            onClick={() => handleReviewPageChange(item)}
                            disabled={reviewLoading}
                          >
                            {item + 1}
                          </button>
                        )
                      })}

                      <button
                        className="btn btn-sm btn-outline-secondary"
                        type="button"
                        onClick={() => handleReviewPageChange(reviewPageData.currentPage + 1)}
                        disabled={
                          reviewLoading ||
                          reviewPageData.totalPages === 0 ||
                          reviewPageData.currentPage >= reviewPageData.totalPages - 1
                        }
                      >
                        Sau
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

export default MovieDetails
