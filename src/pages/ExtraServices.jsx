import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import extraServiceService from '../services/extraServiceService'

const PAGE_SIZE = 12

const EMPTY_PAGE_META = {
  currentPage: 0,
  totalPages: 0,
  totalItems: 0,
}

function extractItems(payload) {
  const candidates = [
    payload?.data?.currentItems,
    payload?.data?.content,
    payload?.data,
    payload?.currentItems,
    payload?.content,
    payload,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
    }
  }

  return []
}

function extractPageMeta(payload, fallbackItemsLength = 0) {
  const candidates = [payload?.data, payload]

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      continue
    }

    const currentPage = Number(candidate.currentPage)
    const totalPages = Number(candidate.totalPages)
    const totalItems = Number(candidate.totalItems)

    return {
      currentPage: Number.isFinite(currentPage) ? currentPage : 0,
      totalPages: Number.isFinite(totalPages) ? totalPages : (fallbackItemsLength > 0 ? 1 : 0),
      totalItems: Number.isFinite(totalItems) ? totalItems : fallbackItemsLength,
    }
  }

  return {
    currentPage: 0,
    totalPages: fallbackItemsLength > 0 ? 1 : 0,
    totalItems: fallbackItemsLength,
  }
}

function getEntityId(item) {
  return item?.id ?? item?.extraServiceId
}

function normalizeIsActive(value) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value === 1
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized === 'true' || normalized === '1'
  }

  return true
}

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')} đ`
}

function mapCategoryLabel(category) {
  const normalized = String(category || '').toUpperCase()

  if (normalized === 'FOOD') return 'Đồ ăn'
  if (normalized === 'DRINK') return 'Nước uống'
  if (normalized === 'COMBO') return 'Combo'
  return normalized || 'Khác'
}

function truncateText(text, maxLength = 130) {
  const normalized = String(text || '').trim()
  if (!normalized) return 'Thông tin dịch vụ đang được cập nhật.'
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength).trimEnd()}...`
}

function ExtraServices() {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(0)
  const [pageMeta, setPageMeta] = useState(EMPTY_PAGE_META)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await extraServiceService.getPublicPageable({ page, size: PAGE_SIZE, isActive: true })
        const list = extractItems(response).filter((item) => normalizeIsActive(item?.isActive))
        const meta = extractPageMeta(response, list.length)

        if (active) {
          setItems(list)
          setPageMeta({
            currentPage: meta.currentPage,
            totalPages: meta.totalPages,
            totalItems: meta.totalItems,
          })
        }
      } catch (err) {
        if (active) {
          setError(err?.message || 'Không thể tải danh sách dịch vụ.')
          setItems([])
          setPageMeta(EMPTY_PAGE_META)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [page])

  const summary = useMemo(() => {
    return `Hiện có ${pageMeta.totalItems} dịch vụ đang phục vụ tại rạp.`
  }, [pageMeta.totalItems])

  return (
    <div className="container py-5">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-light mb-1">🍿 Dịch Vụ Tại Rạp</h2>
          <p className="text-secondary mb-0">{summary}</p>
        </div>
        <Link to="/movies" className="btn btn-outline-light">Đặt vé ngay</Link>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {loading ? (
        <div className="text-center text-secondary py-5">Đang tải danh sách dịch vụ...</div>
      ) : null}

      {!loading && items.length === 0 && !error ? (
        <div className="text-center text-secondary py-5">Hiện chưa có dịch vụ đang mở bán.</div>
      ) : null}

      <div className="row g-4">
        {items.map((item) => {
          const id = getEntityId(item)

          return (
            <div key={id || item.name} className="col-12 col-sm-6 col-lg-4">
              <article className="card h-100 bg-dark text-white border-secondary shadow-sm">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name || 'extra-service'}
                    className="card-img-top object-fit-cover"
                    style={{ height: 220 }}
                  />
                ) : (
                  <div className="card-img-top bg-secondary d-flex align-items-center justify-content-center" style={{ height: 220 }}>
                    <span className="text-light">Không có ảnh</span>
                  </div>
                )}

                <div className="card-body d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                    <h5 className="card-title mb-0">{item.name || 'Dịch vụ chưa đặt tên'}</h5>
                    <span className="badge bg-info text-dark">{mapCategoryLabel(item.category)}</span>
                  </div>

                  <p className="text-warning fw-semibold mb-2">{formatCurrency(item.price)}</p>
                  <p className="card-text text-white small mb-3">{truncateText(item.description)}</p>
                </div>
              </article>
            </div>
          )
        })}
      </div>

      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mt-4">
        <p className="text-secondary mb-0">
          Trang {pageMeta.currentPage + 1}/{Math.max(pageMeta.totalPages, 1)}
        </p>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
            disabled={loading || pageMeta.currentPage <= 0}
          >
            Trước
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setPage((prev) => prev + 1)}
            disabled={loading || pageMeta.currentPage >= pageMeta.totalPages - 1 || pageMeta.totalPages === 0}
          >
            Sau
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExtraServices
