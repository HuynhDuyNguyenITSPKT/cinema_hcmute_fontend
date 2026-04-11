import { useEffect, useMemo, useState } from 'react'
import reviewService from '../services/reviewService'
import { notifyError, notifySuccess } from '../utils/notify'

const PAGE_SIZE = 10
const EMPTY_FILTERS = {
  movieKeyword: '',
  minRating: 0,
  maxRating: 5,
  fromDate: '',
  toDate: '',
}

function toRatingValue(value, fallback) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.min(5, Math.max(0, parsed))
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

function formatDate(value) {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }

  return parsed.toLocaleDateString('vi-VN')
}

function truncateComment(value, maxLength = 95) {
  const normalized = String(value || '').trim()

  if (!normalized) {
    return '-'
  }

  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`
}

function AdminReviews() {
  const [inputFilters, setInputFilters] = useState(() => ({ ...EMPTY_FILTERS }))
  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS }))
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDir, setSortDir] = useState('desc')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [selectedReview, setSelectedReview] = useState(null)
  const [pageData, setPageData] = useState({
    currentItems: [],
    currentPage: 0,
    totalPages: 0,
    totalItems: 0,
  })

  const fetchReviews = async (page = 0, activeFilters = filters, activeSortBy = sortBy, activeSortDir = sortDir) => {
    setLoading(true)
    setError('')

    try {
      const response = await reviewService.getAdminPageable({
        page,
        size: PAGE_SIZE,
        minRating: activeFilters.minRating,
        maxRating: activeFilters.maxRating,
        fromDate: activeFilters.fromDate,
        toDate: activeFilters.toDate,
        keyword: activeFilters.movieKeyword.trim(),
        sortBy: activeSortBy,
        sortDir: activeSortDir,
      })

      setPageData(normalizePageableData(response, PAGE_SIZE))
    } catch (err) {
      setError(err?.message || 'Không thể tải danh sách bình luận.')
      setPageData({
        currentItems: [],
        currentPage: 0,
        totalPages: 0,
        totalItems: 0,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews(0, EMPTY_FILTERS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = (event) => {
    event.preventDefault()

    const appliedFilters = {
      movieKeyword: inputFilters.movieKeyword.trim(),
      minRating: inputFilters.minRating,
      maxRating: inputFilters.maxRating,
      fromDate: inputFilters.fromDate,
      toDate: inputFilters.toDate,
    }

    setFilters(appliedFilters)
    fetchReviews(0, appliedFilters)
  }

  const handleReset = () => {
    const resetFilters = { ...EMPTY_FILTERS }

    setInputFilters(resetFilters)
    setFilters(resetFilters)
    fetchReviews(0, resetFilters)
  }

  const handlePageChange = (nextPage) => {
    if (nextPage < 0 || nextPage >= pageData.totalPages) {
      return
    }

    fetchReviews(nextPage, filters)
  }

  const handleDelete = async (reviewId) => {
    if (!reviewId) {
      return
    }

    const confirmed = window.confirm('Bạn có chắc chắn muốn xóa bình luận này?')

    if (!confirmed) {
      return
    }

    setDeletingId(reviewId)

    try {
      await reviewService.removeByAdmin(reviewId)
      notifySuccess('Xóa bình luận thành công.')

      const shouldGoPrevPage =
        pageData.currentItems.length === 1 &&
        pageData.currentPage > 0

      const nextPage = shouldGoPrevPage ? pageData.currentPage - 1 : pageData.currentPage
      await fetchReviews(nextPage, filters)

      if (selectedReview?.id === reviewId) {
        setSelectedReview(null)
      }
    } catch (err) {
      notifyError(err?.message || 'Không thể xóa bình luận.')
    } finally {
      setDeletingId(null)
    }
  }

  const paginationItems = buildPagination(pageData.currentPage, pageData.totalPages)
  const averageOnCurrentPage = useMemo(() => {
    if (pageData.currentItems.length === 0) {
      return 0
    }

    const sum = pageData.currentItems.reduce((acc, item) => acc + Number(item?.rating || 0), 0)
    return sum / pageData.currentItems.length
  }, [pageData.currentItems])

  return (
    <section className="container-fluid px-2 px-md-3 px-xl-4">
      <div className="card border-0 shadow-sm">
        <div className="card-body p-3 p-md-4">
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
            <div>
              <h2 className="h4 mb-1">Quản lý bình luận phim</h2>
              <p className="text-secondary mb-0">Admin chỉ có quyền xem và xóa review.</p>
            </div>
            <span className="badge text-bg-dark px-3 py-2 rounded-pill">Tổng: {pageData.totalItems} bình luận</span>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-12 col-md-6 col-xl-3">
              <div className="card h-100 border-light-subtle bg-primary-subtle">
                <div className="card-body">
                  <p className="small text-secondary mb-1">Trang hiện tại</p>
                  <p className="h4 mb-0">{pageData.currentPage + 1}</p>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <div className="card h-100 border-light-subtle bg-info-subtle">
                <div className="card-body">
                  <p className="small text-secondary mb-1">Điểm TB trang này</p>
                  <p className="h4 mb-0 text-info-emphasis">{averageOnCurrentPage.toFixed(1)}</p>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <div className="card h-100 border-light-subtle bg-warning-subtle">
                <div className="card-body">
                  <p className="small text-secondary mb-1">Số review trang này</p>
                  <p className="h4 mb-0 text-warning-emphasis">{pageData.currentItems.length}</p>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <div className="card h-100 border-light-subtle bg-success-subtle">
                <div className="card-body">
                  <p className="small text-secondary mb-1">Tổng số trang</p>
                  <p className="h4 mb-0 text-success">{Math.max(pageData.totalPages, 1)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card border-light-subtle mb-3">
            <div className="card-body">
              <form className="row g-2 g-md-3" onSubmit={handleSearch}>
                  <div className="col-12 col-md-6 col-xl-3">
                  <input
                    type="text"
                    className="form-control"
                      value={inputFilters.movieKeyword}
                      onChange={(event) => setInputFilters((prev) => ({ ...prev, movieKeyword: event.target.value }))}
                      placeholder="Lọc theo tên phim"
                  />
                </div>
                  <div className="col-12 col-md-6 col-xl-3">
                    <label className="form-label mb-1">Lọc điểm: {inputFilters.minRating.toFixed(1)} - {inputFilters.maxRating.toFixed(1)}</label>
                    <div className="d-flex flex-column gap-1">
                      <input
                        type="range"
                        min={0}
                        max={5}
                        step={0.5}
                        className="form-range"
                        value={inputFilters.minRating}
                        onChange={(event) => {
                          const nextMin = toRatingValue(event.target.value, 0)
                          setInputFilters((prev) => ({
                            ...prev,
                            minRating: Math.min(nextMin, prev.maxRating),
                          }))
                        }}
                      />
                      <input
                        type="range"
                        min={0}
                        max={5}
                        step={0.5}
                        className="form-range"
                        value={inputFilters.maxRating}
                        onChange={(event) => {
                          const nextMax = toRatingValue(event.target.value, 5)
                          setInputFilters((prev) => ({
                            ...prev,
                            maxRating: Math.max(nextMax, prev.minRating),
                          }))
                        }}
                      />
                    </div>
                </div>
                <div className="col-12 col-md-6 col-xl-2">
                  <input
                    type="date"
                    className="form-control"
                    value={inputFilters.fromDate}
                    onChange={(event) => setInputFilters((prev) => ({ ...prev, fromDate: event.target.value }))}
                  />
                </div>
                <div className="col-12 col-md-6 col-xl-2">
                  <input
                    type="date"
                    className="form-control"
                    value={inputFilters.toDate}
                    onChange={(event) => setInputFilters((prev) => ({ ...prev, toDate: event.target.value }))}
                  />
                </div>
                <div className="col-6 col-md-3 col-xl-2">
                  <select
                    className="form-select"
                    value={sortBy}
                    onChange={(event) => {
                      const nextSortBy = event.target.value
                      setSortBy(nextSortBy)
                      fetchReviews(0, filters, nextSortBy, sortDir)
                    }}
                  >
                    <option value="createdAt">Ngày</option>
                    <option value="rating">Điểm</option>
                  </select>
                </div>
                <div className="col-6 col-md-3 col-xl-2">
                  <select
                    className="form-select"
                    value={sortDir}
                    onChange={(event) => {
                      const nextSortDir = event.target.value
                      setSortDir(nextSortDir)
                      fetchReviews(0, filters, sortBy, nextSortDir)
                    }}
                  >
                    <option value="desc">Giảm dần</option>
                    <option value="asc">Tăng dần</option>
                  </select>
                </div>
                <div className="col-12 d-grid d-sm-flex justify-content-sm-end gap-2">
                  <button className="btn btn-primary" type="submit" disabled={loading}>
                    {loading ? 'Đang lọc...' : 'Lọc dữ liệu'}
                  </button>
                  <button className="btn btn-outline-secondary" type="button" onClick={handleReset} disabled={loading}>
                    Làm mới
                  </button>
                </div>
              </form>
            </div>
          </div>

          {error ? <div className="alert alert-danger py-2 px-3">{error}</div> : null}

          <div className="table-responsive border rounded-3 bg-white">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>STT</th>
                  <th>ID</th>
                  <th>Phim</th>
                  <th>Người dùng</th>
                  <th>Điểm</th>
                  <th>Bình luận</th>
                  <th>Ngày tạo</th>
                  <th className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {!loading && pageData.currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center text-secondary py-4">
                      Không có dữ liệu.
                    </td>
                  </tr>
                ) : null}

                {pageData.currentItems.map((item, index) => (
                  <tr key={item.id}>
                    <td>{pageData.currentPage * PAGE_SIZE + index + 1}</td>
                    <td>{item.id ?? '-'}</td>
                    <td className="fw-semibold">{item.movieTitle || '-'}</td>
                    <td>{item.userFullName || '-'}</td>
                    <td>
                      <span className="badge text-bg-warning">{Number(item.rating || 0).toFixed(1)}</span>
                    </td>
                    <td style={{ maxWidth: 280 }}>{truncateComment(item.comment)}</td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => setSelectedReview(item)}
                        >
                          Xem
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                        >
                          {deletingId === item.id ? 'Đang xóa...' : 'Xóa'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mt-3">
            <p className="text-secondary mb-0">
              Trang {pageData.currentPage + 1} / {Math.max(pageData.totalPages, 1)}
            </p>

            <div className="d-flex flex-wrap gap-2 align-items-center">
              <button
                className="btn btn-outline-secondary btn-sm"
                type="button"
                onClick={() => handlePageChange(pageData.currentPage - 1)}
                disabled={loading || pageData.currentPage <= 0}
              >
                Trước
              </button>

              {paginationItems.map((item, index) => {
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
                    className={`btn btn-sm ${item === pageData.currentPage ? 'btn-primary' : 'btn-outline-secondary'}`}
                    type="button"
                    onClick={() => handlePageChange(item)}
                    disabled={loading}
                  >
                    {item + 1}
                  </button>
                )
              })}

              <button
                className="btn btn-outline-secondary btn-sm"
                type="button"
                onClick={() => handlePageChange(pageData.currentPage + 1)}
                disabled={
                  loading ||
                  pageData.totalPages === 0 ||
                  pageData.currentPage >= pageData.totalPages - 1
                }
              >
                Sau
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedReview ? (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Chi tiết bình luận</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedReview(null)} />
              </div>
              <div className="modal-body">
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <div className="small text-secondary">Phim</div>
                    <div className="fw-semibold">{selectedReview.movieTitle || '-'}</div>
                    <small className="text-secondary">{selectedReview.movieId || '-'}</small>
                  </div>
                  <div className="col-md-6">
                    <div className="small text-secondary">Người dùng</div>
                    <div className="fw-semibold">{selectedReview.userFullName || '-'}</div>
                    <small className="text-secondary">ID: {selectedReview.userId ?? '-'}</small>
                  </div>
                  <div className="col-md-6">
                    <div className="small text-secondary">Điểm</div>
                    <span className="badge text-bg-warning">{Number(selectedReview.rating || 0).toFixed(1)} / 5</span>
                  </div>
                  <div className="col-md-6">
                    <div className="small text-secondary">Ngày tạo</div>
                    <div>{formatDate(selectedReview.createdAt)}</div>
                  </div>
                </div>

                <div>
                  <div className="small text-secondary mb-1">Nội dung</div>
                  <div className="border rounded-3 p-3 bg-light" style={{ whiteSpace: 'pre-line' }}>
                    {selectedReview.comment || '-'}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedReview(null)}>
                  Đóng
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={() => handleDelete(selectedReview.id)}
                  disabled={deletingId === selectedReview.id}
                >
                  {deletingId === selectedReview.id ? 'Đang xóa...' : 'Xóa bình luận'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default AdminReviews
