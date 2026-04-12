import React, { useState, useEffect } from 'react'
import bookingService from '../services/bookingService'
import { notifyError, notifySuccess } from '../utils/notify'

const STATUS_OPTS = ['', 'RESERVED', 'PENDING_APPROVAL', 'SUCCESS', 'CANCELLED']
const STATUS_BADGE = {
  RESERVED:         { label: 'Chờ Thanh Toán', cls: 'bg-warning text-dark' },
  SUCCESS:          { label: 'Thành Công',      cls: 'bg-success' },
  CANCELLED:        { label: 'Đã Hủy',          cls: 'bg-secondary' },
  PENDING_APPROVAL: { label: 'Chờ Duyệt (B2B)', cls: 'bg-info text-dark' },
}

function AdminBookings() {
  const [bookings, setBookings] = useState([])
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ showtimeId: '', seatIds: '', userId: '', manualTotalAmount: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    bookingService.getAllBookings(filterStatus)
      .then(res => setBookings(res.data || res || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filterStatus])

  const handleApprove = async (id) => {
    if (!window.confirm('Duyệt đơn đặt vé Khách Đoàn này?')) return
    try {
      await bookingService.approveBooking(id)
      notifySuccess('Duyệt booking thành công')
      load()
    } catch (err) {
      notifyError(err?.message || 'Không thể duyệt đơn này.')
    }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Hủy đơn đặt vé này?')) return
    try {
      await bookingService.adminCancelBooking(id)
      notifySuccess('Hủy booking thành công')
      load()
    } catch (err) {
      notifyError(err?.message || 'Không thể hủy.')
    }
  }

  const handleAdminCreate = async () => {
    setSaving(true)
    setError('')
    try {
      const payload = {
        showtimeId: createForm.showtimeId,
        seatIds: createForm.seatIds.split(',').map(s => s.trim()).filter(Boolean),
        userId: createForm.userId,
        manualTotalAmount: createForm.manualTotalAmount ? Number(createForm.manualTotalAmount) : null,
        note: createForm.note,
      }
      await bookingService.adminCreateBooking(payload)
      notifySuccess('Tạo booking ngoại lệ thành công')
      setShowCreateModal(false)
      load()
    } catch (err) {
      const message = err?.message || 'Lỗi tạo booking.'
      setError(message)
      notifyError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div className="text-center text-md-start">
          <h4 className="fw-bold mb-0">🎟️ Quản Lý Đặt Vé</h4>
          <small className="text-secondary d-block">Duyệt B2B, tạo ngoại lệ và theo dõi tất cả booking</small>
        </div>
        <button className="btn btn-danger" onClick={() => { setCreateForm({ showtimeId: '', seatIds: '', userId: '', manualTotalAmount: '', note: '' }); setError(''); setShowCreateModal(true) }}>
          + Tạo Booking Ngoại Lệ
        </button>
      </div>

      {/* Filter */}
      <div className="d-flex gap-2 mb-4 flex-wrap">
        {STATUS_OPTS.map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`btn btn-sm ${filterStatus === s ? 'btn-danger' : 'btn-outline-secondary'}`}>
            {s ? (STATUS_BADGE[s]?.label || s) : 'Tất Cả'}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-5"><div className="spinner-border text-danger" /></div> : (
        <div className="d-flex flex-column gap-3">
          {bookings.map(b => {
            const si = STATUS_BADGE[b.status] || { label: b.status, cls: 'bg-secondary' }
            const isB2B = b.status === 'PENDING_APPROVAL'
            return (
              <div key={b.id} className="card border-0 shadow-sm bg-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <strong className="text-dark">{b.movieName || 'Phim chưa xác định'}</strong>
                      {isB2B && <span className="badge bg-info text-dark ms-2">🏢 B2B</span>}
                      {b.note?.includes('ADMIN OVERRIDE') && <span className="badge bg-purple ms-2" style={{ background: '#7c3aed' }}>🛡 Admin</span>}
                      <div className="text-secondary small mt-1">
                        {b.auditoriumName && `🏛️ ${b.auditoriumName}`}
                        {b.startTime && ` · ${new Date(b.startTime).toLocaleString('vi-VN')}`}
                      </div>
                    </div>
                    <div className="text-end">
                      <span className={`badge ${si.cls} mb-1`}>{si.label}</span>
                      <div className="text-warning fw-bold">{Number(b.totalAmount || 0).toLocaleString('vi-VN')}đ</div>
                    </div>
                  </div>

                  {b.tickets?.length > 0 && (
                    <div className="d-flex flex-wrap gap-1 mb-2">
                      {b.tickets.map(t => (
                        <span key={t.id} className="badge text-bg-light border border-secondary text-dark">{t.seatName}</span>
                      ))}
                    </div>
                  )}

                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-secondary">ID: {b.id?.slice(0, 12)}... · {b.createdAt && new Date(b.createdAt).toLocaleDateString('vi-VN')}</small>
                    <div className="d-flex gap-2">
                      {isB2B && (
                        <button className="btn btn-sm btn-success" onClick={() => handleApprove(b.id)}>✅ Duyệt B2B</button>
                      )}
                      {b.status !== 'CANCELLED' && (
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleCancel(b.id)}>Hủy</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          {bookings.length === 0 && (
            <div className="text-center text-secondary py-5">Không có đơn đặt vé nào.</div>
          )}
        </div>
      )}

      {/* Modal Tạo Booking Ngoại Lệ */}
      {showCreateModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="modal-dialog">
            <div className="modal-content bg-white text-dark border-0 shadow">
              <div className="modal-header border-bottom justify-content-center align-items-center position-relative">
                <h5 className="modal-title text-center">🛡️ Tạo Booking Ngoại Lệ (Admin)</h5>
                <button className="btn-close position-absolute end-0 me-3" onClick={() => setShowCreateModal(false)} />
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="alert alert-warning small">
                  ⚠️ Booking ngoại lệ bypass giới hạn 8 ghế và cho phép override giá. Dùng cho khách VIP hoặc sự kiện đặc biệt.
                </div>
                <div className="mb-3">
                  <label className="form-label">ID Suất Chiếu *</label>
                  <input className="form-control" placeholder="UUID của showtime"
                    value={createForm.showtimeId} onChange={e => setCreateForm(p => ({ ...p, showtimeId: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label">ID Ghế * (phân cách dấu phẩy)</label>
                  <textarea rows={3} className="form-control"
                    placeholder="uuid-seat-1, uuid-seat-2, ..."
                    value={createForm.seatIds} onChange={e => setCreateForm(p => ({ ...p, seatIds: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label">ID Khách Hàng *</label>
                  <input className="form-control"
                    value={createForm.userId} onChange={e => setCreateForm(p => ({ ...p, userId: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Giá Thỏa Thuận (đ) — để trống = tính tự động</label>
                  <input type="number" className="form-control"
                    placeholder="Ví dụ: 5000000"
                    value={createForm.manualTotalAmount} onChange={e => setCreateForm(p => ({ ...p, manualTotalAmount: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Ghi Chú</label>
                  <input className="form-control"
                    placeholder="Bao rạp, lễ kỷ niệm, ..."
                    value={createForm.note} onChange={e => setCreateForm(p => ({ ...p, note: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer border-top">
                <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Hủy</button>
                <button className="btn btn-danger" onClick={handleAdminCreate}
                  disabled={saving || !createForm.showtimeId || !createForm.seatIds || !createForm.userId}>
                  {saving ? 'Đang Tạo...' : 'Tạo Booking'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminBookings
