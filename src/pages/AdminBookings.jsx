import React, { useState, useEffect, useMemo, useCallback } from 'react'
import bookingService from '../services/bookingService'
import seatService from '../services/seatService'
import { notifyError, notifySuccess } from '../utils/notify'

// ─── Constants ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 10

const STATUS_OPTS = [
  { value: '',                label: 'Tất cả trạng thái' },
  { value: 'PENDING_APPROVAL',label: 'Chờ Duyệt B2B' },
  { value: 'RESERVED',        label: 'Chờ Thanh Toán' },
  { value: 'SUCCESS',         label: 'Thành Công' },
  { value: 'CANCELLED',       label: 'Đã Hủy' },
  { value: 'PENDING',         label: 'Đang Xử Lý' },
]

const STATUS_META = {
  RESERVED:         { label: 'Chờ Thanh Toán', cls: 'text-bg-warning' },
  SUCCESS:          { label: 'Thành Công',      cls: 'text-bg-success' },
  CANCELLED:        { label: 'Đã Hủy',          cls: 'text-bg-secondary' },
  PENDING_APPROVAL: { label: 'Chờ Duyệt B2B',  cls: 'text-bg-info' },
  PENDING:          { label: 'Đang Xử Lý',      cls: 'text-bg-warning' },
}

function parseB2BNote(note) {
  if (!note) return {}
  const nameMatch  = note.match(/Tên:\s*([^|]+)/)
  const phoneMatch = note.match(/SĐT:\s*([^|]+)/)
  const noteMatch  = note.match(/Ghi chú:\s*(.+)/)
  return {
    contactName:  nameMatch  ? nameMatch[1].trim()  : '',
    contactPhone: phoneMatch ? phoneMatch[1].trim() : '',
    extraNote:    noteMatch  ? noteMatch[1].trim()  : '',
  }
}

function buildPagination(currentPage, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i)
  const pages = [0]
  const start = Math.max(1, currentPage - 1)
  const end   = Math.min(totalPages - 2, currentPage + 1)
  if (start > 1) pages.push('...')
  for (let p = start; p <= end; p++) pages.push(p)
  if (end < totalPages - 2) pages.push('...')
  pages.push(totalPages - 1)
  return pages
}

// ─── SeatMapEditor (dark mini-picker inside light modal) ─────────────────────
function SeatMapEditor({ showtimeId, preSelectedIds = [], onSelect }) {
  const [map, setMap] = useState([])
  const [selected, setSelected] = useState(preSelectedIds)
  const [loadingMap, setLoadingMap] = useState(true)

  useEffect(() => {
    if (!showtimeId) return
    setLoadingMap(true)
    seatService.getSeatMap(showtimeId)
      .then(r => setMap(r.data || r || []))
      .catch(() => setMap([]))
      .finally(() => setLoadingMap(false))
  }, [showtimeId])

  useEffect(() => { onSelect(selected) }, [selected, onSelect])

  const toggle = (seat) => {
    if (seat.status === 'BOOKED') return
    setSelected(prev =>
      prev.includes(seat.id) ? prev.filter(id => id !== seat.id) : [...prev, seat.id]
    )
  }

  const rows = useMemo(() => {
    const map2 = {}
    map.forEach(s => {
      const row = s.name?.[0] || 'A'
      if (!map2[row]) map2[row] = []
      map2[row].push(s)
    })
    return Object.entries(map2).sort(([a], [b]) => a.localeCompare(b))
  }, [map])

  if (loadingMap) return <div className="text-center py-3"><div className="spinner-border text-primary" /></div>
  if (!map.length) return <div className="text-secondary small text-center py-2">Không tải được sơ đồ ghế.</div>

  return (
    <div>
      <div className="text-center mb-3">
        <div className="mx-auto small py-1 rounded text-secondary"
          style={{ background: '#e2e8f0', width: '60%', letterSpacing: 6, fontSize: 11 }}>
          MÀN HÌNH
        </div>
      </div>

      <div style={{ overflowX: 'auto', maxHeight: 300 }}>
        {rows.map(([rowLabel, seats]) => (
          <div key={rowLabel} className="d-flex align-items-center justify-content-center mb-1 gap-1">
            <span className="text-secondary" style={{ width: 18, fontSize: 11, flexShrink: 0 }}>{rowLabel}</span>
            {seats.sort((a, b) => a.columnIndex - b.columnIndex).map(seat => {
              const isSel    = selected.includes(seat.id)
              const isBooked = seat.status === 'BOOKED'
              let bg = '#f1f5f9', border = '#cbd5e1'
              if (isSel)    { bg = '#166534'; border = '#22c55e' }
              else if (isBooked) { bg = '#94a3b8'; border = '#64748b' }
              return (
                <button key={seat.id} disabled={isBooked}
                  onClick={() => toggle(seat)}
                  title={`${seat.name} (${seat.status})`}
                  style={{
                    width: 28, height: 28, borderRadius: 4, flexShrink: 0,
                    background: bg, border: `2px solid ${border}`,
                    color: isSel ? '#bbf7d0' : '#475569', fontSize: 9, fontWeight: 600,
                    cursor: isBooked ? 'not-allowed' : 'pointer', transition: 'transform 0.1s',
                  }}
                  onMouseEnter={e => { if (!isBooked) e.currentTarget.style.transform = 'scale(1.2)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}>
                  {seat.name?.slice(1)}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div className="d-flex gap-3 justify-content-center mt-3 flex-wrap">
        <div className="d-flex align-items-center gap-1">
          <div style={{ width: 12, height: 12, borderRadius: 2, background: '#166534', border: '2px solid #22c55e' }} />
          <small className="text-secondary">Đang chọn ({selected.length})</small>
        </div>
        <div className="d-flex align-items-center gap-1">
          <div style={{ width: 12, height: 12, borderRadius: 2, background: '#f1f5f9', border: '2px solid #cbd5e1' }} />
          <small className="text-secondary">Trống</small>
        </div>
        <div className="d-flex align-items-center gap-1">
          <div style={{ width: 12, height: 12, borderRadius: 2, background: '#94a3b8', border: '2px solid #64748b' }} />
          <small className="text-secondary">Đã đặt</small>
        </div>
      </div>

      {selected.length < 20 && (
        <div className="alert alert-warning mt-2 small py-2 mb-0">
          ⚠️ GroupBookingBuilder yêu cầu tối thiểu 20 ghế (hiện: {selected.length})
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function AdminBookings() {
  const [bookings,     setBookings]     = useState([])
  const [filterStatus, setFilterStatus] = useState('')
  const [search,       setSearch]       = useState('')
  const [loading,      setLoading]      = useState(true)
  const [page,         setPage]         = useState(0)

  // Modal B2B
  const [b2bModal,      setB2bModal]      = useState(null)
  const [editorSeatIds, setEditorSeatIds] = useState([])
  const [adminNote,     setAdminNote]     = useState('')
  const [saving,        setSaving]        = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    bookingService.getAllBookings(filterStatus)
      .then(res => {
        const arr = [...(Array.isArray(res.data || res) ? (res.data || res) : [])]
        arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        setBookings(arr)
        setPage(0)
      })
      .catch(() => setBookings([]))
      .finally(() => setLoading(false))
  }, [filterStatus])

  useEffect(() => { load() }, [load])

  // Stats
  const stats = useMemo(() => ({
    total:    bookings.length,
    pending:  bookings.filter(b => b.status === 'PENDING_APPROVAL').length,
    success:  bookings.filter(b => b.status === 'SUCCESS').length,
    revenue:  bookings.filter(b => b.status === 'SUCCESS').reduce((s, b) => s + Number(b.totalAmount || 0), 0),
    cancelled:bookings.filter(b => b.status === 'CANCELLED').length,
  }), [bookings])

  // Filter + search
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return bookings.filter(b => {
      if (!q) return true
      return b.id?.toLowerCase().includes(q) ||
             b.movieName?.toLowerCase().includes(q) ||
             b.note?.toLowerCase().includes(q)
    })
  }, [bookings, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const pagination = buildPagination(page, totalPages)

  // Handlers
  const handleApprove = async (id) => {
    if (!window.confirm('Duyệt ngay đơn này (không đổi ghế)?')) return
    try {
      await bookingService.approveBooking(id)
      notifySuccess('Đã duyệt đơn B2B thành công')
      load()
    } catch (err) { notifyError(err?.message || 'Không thể duyệt đơn này.') }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Hủy đơn đặt vé này?')) return
    try {
      await bookingService.adminCancelBooking(id)
      notifySuccess('Hủy booking thành công')
      load()
    } catch (err) { notifyError(err?.message || 'Không thể hủy.') }
  }

  const openB2bModal = (booking) => {
    setB2bModal(booking)
    setEditorSeatIds(booking.tickets?.map(t => t.seatId).filter(Boolean) || [])
    setAdminNote('')
  }

  const handleUpdateAndApprove = async () => {
    if (editorSeatIds.length < 20) return notifyError('GroupBookingBuilder yêu cầu >= 20 ghế!')
    if (!window.confirm(`Xác nhận duyệt với ${editorSeatIds.length} ghế? Pipeline sẽ tính lại giá B2B -5%.`)) return
    setSaving(true)
    try {
      await bookingService.updateGroupSeats(b2bModal.id, {
        showtimeId: b2bModal.showtimeId || b2bModal.tickets?.[0]?.showtimeId,
        seatIds: editorSeatIds,
        adminNote,
      })
      notifySuccess('Đã cập nhật ghế và duyệt đơn B2B!')
      setB2bModal(null)
      load()
    } catch (err) { notifyError(err?.message || 'Không thể cập nhật.') }
    finally { setSaving(false) }
  }

  const handleSeatSelect = useCallback((ids) => setEditorSeatIds(ids), [])

  return (
    <section className="container-fluid px-2 px-md-3 px-xl-4">
      <div className="card border-0 shadow-sm">
        <div className="card-body p-3 p-md-4">

          {/* Header */}
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
            <div>
              <h2 className="h4 mb-1">Quản lý đặt vé</h2>
              <p className="text-secondary mb-0">Theo dõi, duyệt B2B và xử lý toàn bộ giao dịch.</p>
            </div>
            <span className="badge text-bg-dark px-3 py-2 rounded-pill">Tổng: {stats.total} đơn</span>
          </div>

          {/* Stats */}
          <div className="row g-3 mb-4">
            {[
              { label: 'Tổng Đơn',     value: stats.total,    cls: 'bg-primary-subtle' },
              { label: 'Chờ Duyệt B2B', value: stats.pending,  cls: 'bg-warning-subtle' },
              { label: 'Thành Công',    value: stats.success,  cls: 'bg-success-subtle' },
              { label: 'Doanh Thu',     value: Number(stats.revenue).toLocaleString('vi-VN') + 'đ', cls: 'bg-info-subtle' },
            ].map(s => (
              <div key={s.label} className="col-12 col-md-6 col-xl-3">
                <div className={`card h-100 border-light-subtle ${s.cls}`}>
                  <div className="card-body">
                    <p className="small text-secondary mb-1">{s.label}</p>
                    <p className="h4 mb-0">{s.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Filter + Search */}
          <div className="card border-light-subtle mb-3">
            <div className="card-body">
              <div className="row g-2">
                <div className="col-12 col-md-6 col-xl-4">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Tìm theo ID, tên phim, ghi chú..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(0) }}
                  />
                </div>
                <div className="col-12 col-md-4 col-xl-3">
                  <select
                    className="form-select"
                    value={filterStatus}
                    onChange={e => { setFilterStatus(e.target.value); setPage(0) }}
                  >
                    {STATUS_OPTS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-md-2 d-grid d-sm-flex gap-2">
                  <button className="btn btn-outline-secondary" onClick={() => { setSearch(''); setFilterStatus(''); setPage(0) }}>
                    Làm mới
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
          ) : (
            <div className="table-responsive border rounded-3 bg-white">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Mã đơn</th>
                    <th>Phim / Phòng</th>
                    <th>Suất chiếu</th>
                    <th>Ghế</th>
                    <th>Tổng tiền</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                    <th className="text-end">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center text-secondary py-4">Không có đơn đặt vé nào.</td>
                    </tr>
                  )}
                  {paginated.map(b => {
                    const si    = STATUS_META[b.status] || { label: b.status, cls: 'text-bg-secondary' }
                    const isB2B = b.status === 'PENDING_APPROVAL'
                    const b2b   = isB2B ? parseB2BNote(b.note) : {}
                    return (
                      <tr key={b.id}>
                        <td>
                          <span className="fw-semibold text-muted" style={{ fontSize: 12 }}>
                            {b.id?.slice(0, 8).toUpperCase()}...
                          </span>
                          {isB2B && <span className="badge text-bg-primary ms-1" style={{ fontSize: 9 }}>B2B</span>}
                        </td>
                        <td>
                          <div className="fw-semibold">{b.movieName || '—'}</div>
                          <small className="text-secondary">{b.auditoriumName}</small>
                          {isB2B && b2b.contactName && (
                            <div style={{ fontSize: 11 }} className="text-info mt-1">
                              👤 {b2b.contactName} · 📞 {b2b.contactPhone}
                            </div>
                          )}
                        </td>
                        <td>
                          <small className="text-secondary">
                            {b.startTime ? new Date(b.startTime).toLocaleString('vi-VN') : '—'}
                          </small>
                        </td>
                        <td>
                          <span className="badge text-bg-secondary">{b.tickets?.length || 0} ghế</span>
                          {b.tickets?.slice(0, 3).map(t => (
                            <span key={t.id} className="badge border border-secondary text-secondary ms-1"
                              style={{ background: '#f8fafc', fontSize: 10 }}>{t.seatName}</span>
                          ))}
                          {(b.tickets?.length || 0) > 3 && (
                            <span className="badge text-bg-light text-muted ms-1">+{b.tickets.length - 3}</span>
                          )}
                        </td>
                        <td className="fw-semibold text-success">
                          {Number(b.totalAmount || 0).toLocaleString('vi-VN')}đ
                        </td>
                        <td>
                          <span className={`badge ${si.cls}`}>{si.label}</span>
                        </td>
                        <td>
                          <small className="text-secondary">
                            {b.createdAt ? new Date(b.createdAt).toLocaleDateString('vi-VN') : '—'}
                          </small>
                        </td>
                        <td className="text-end">
                          <div className="d-flex gap-1 justify-content-end flex-wrap">
                            {isB2B && (
                              <>
                                <button className="btn btn-sm btn-primary" onClick={() => openB2bModal(b)}>
                                  🪑 Chỉnh &amp; Duyệt
                                </button>
                                <button className="btn btn-sm btn-outline-success" onClick={() => handleApprove(b.id)}>
                                  ✅ Duyệt nhanh
                                </button>
                              </>
                            )}
                            {b.status !== 'CANCELLED' && b.status !== 'SUCCESS' && (
                              <button className="btn btn-sm btn-outline-danger" onClick={() => handleCancel(b.id)}>
                                Hủy
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mt-3">
            <p className="text-secondary mb-0">
              Trang {page + 1} / {Math.max(totalPages, 1)} · {filtered.length} kết quả
            </p>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setPage(p => p - 1)} disabled={page <= 0}>
                Trước
              </button>
              {pagination.map((item, idx) =>
                typeof item !== 'number' ? (
                  <span key={`e${idx}`} className="text-secondary px-1">...</span>
                ) : (
                  <button key={item}
                    className={`btn btn-sm ${item === page ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setPage(item)}>
                    {item + 1}
                  </button>
                )
              )}
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
                Sau
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal B2B SeatEditor */}
      {b2bModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header border-bottom">
                <h5 className="modal-title">🪑 Chỉnh Sửa Ghế &amp; Duyệt Đơn B2B</h5>
                <button className="btn-close" onClick={() => setB2bModal(null)} />
              </div>

              <div className="modal-body">
                {/* Thông tin đơn */}
                {(() => {
                  const b2b = parseB2BNote(b2bModal.note)
                  return (
                    <div className="card border-light-subtle bg-light mb-3">
                      <div className="card-body py-2 px-3">
                        <div className="row g-2 small">
                          <div className="col-sm-6">
                            <div className="fw-semibold text-primary mb-1">📋 Thông tin yêu cầu</div>
                            {b2b.contactName  && <div>👤 <span className="fw-semibold">{b2b.contactName}</span></div>}
                            {b2b.contactPhone && <div>📞 {b2b.contactPhone}</div>}
                            {b2b.extraNote    && <div className="text-secondary">💬 {b2b.extraNote}</div>}
                          </div>
                          <div className="col-sm-6">
                            <div className="fw-semibold text-primary mb-1">🎬 Phim</div>
                            <div className="fw-semibold">{b2bModal.movieName}</div>
                            {b2bModal.startTime && (
                              <div className="text-secondary">{new Date(b2bModal.startTime).toLocaleString('vi-VN')}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Ghi chú Admin */}
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Ghi chú Admin (tùy chọn)</label>
                  <input className="form-control"
                    placeholder="Đã xác nhận qua điện thoại ngày..."
                    value={adminNote}
                    onChange={e => setAdminNote(e.target.value)} />
                </div>

                {/* Seat Map */}
                <div className="mb-1">
                  <div className="small fw-semibold mb-2 text-secondary">
                    Chọn ghế cho đơn này (đang chọn: <span className="text-primary fw-bold">{editorSeatIds.length}</span>):
                  </div>
                  {b2bModal.showtimeId ? (
                    <SeatMapEditor
                      showtimeId={b2bModal.showtimeId}
                      preSelectedIds={editorSeatIds}
                      onSelect={handleSeatSelect}
                    />
                  ) : (
                    <div className="alert alert-warning small py-2">
                      ⚠️ Không tìm thấy showtimeId. Hãy thử Duyệt Nhanh.
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer border-top">
                <small className="text-secondary me-auto">Pipeline: Giá gốc → -5% B2B → +10% VAT</small>
                <button className="btn btn-outline-secondary" onClick={() => setB2bModal(null)}>Đóng</button>
                <button className="btn btn-primary fw-bold"
                  onClick={handleUpdateAndApprove}
                  disabled={saving || editorSeatIds.length < 20}>
                  {saving ? '⏳ Đang Xử Lý...' : `✅ Xác Nhận ${editorSeatIds.length} Ghế & Duyệt`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default AdminBookings
