import React, { useState, useEffect, useCallback, useMemo } from 'react'
import auditoriumService from '../services/auditoriumService'
import axiosClient from '../api/axiosClient'
import { notifyError, notifySuccess } from '../utils/notify'

// ─── Palette (dùng cho SeatMapBuilder, giữ nguyên) ───────────────────────────
const PALETTE = [
  { bg: '#1e293b', border: '#475569' },
  { bg: '#4c1d95', border: '#7c3aed' },
  { bg: '#1e3a5f', border: '#3b82f6' },
  { bg: '#064e3b', border: '#059669' },
  { bg: '#7f1d1d', border: '#dc2626' },
  { bg: '#78350f', border: '#d97706' },
]
const DISABLED_STYLE = { bg: '#0f172a', border: '#1e293b' }

const PAGE_SIZE = 10

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

function buildCellConfig(seatTypes) {
  const cfg = { DISABLED: { ...DISABLED_STYLE, label: 'Khuyết (trống)' } }
  seatTypes.forEach((t, i) => {
    const color = PALETTE[i % PALETTE.length]
    cfg[t.id] = { bg: color.bg, border: color.border, label: t.name }
  })
  return cfg
}

function buildCells(rows, cols, seatTypeMappings, disabledSeats, defaultTypeId) {
  const nameToType = {}
  Object.entries(seatTypeMappings || {}).forEach(([typeId, names]) => {
    names.forEach(n => { nameToType[n] = typeId })
  })
  const cells = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const name = `${String.fromCharCode(65 + r)}${c + 1}`
      let typeId = defaultTypeId
      if (disabledSeats.includes(name)) typeId = 'DISABLED'
      else if (nameToType[name]) typeId = nameToType[name]
      cells.push({ name, row: r, col: c, typeId })
    }
  }
  return cells
}

function reconstructFromSeats(seats, totalRows, totalCols) {
  const existingKeys = new Set(seats.map(s => `${s.rowIndex},${s.columnIndex}`))
  const disabledSeats = []
  for (let r = 0; r < totalRows; r++) {
    for (let c = 0; c < totalCols; c++) {
      if (!existingKeys.has(`${r},${c}`)) {
        disabledSeats.push(`${String.fromCharCode(65 + r)}${c + 1}`)
      }
    }
  }
  const seatTypeMappings = {}
  seats.forEach(s => {
    if (s.seatTypeId) {
      if (!seatTypeMappings[s.seatTypeId]) seatTypeMappings[s.seatTypeId] = []
      seatTypeMappings[s.seatTypeId].push(s.name)
    }
  })
  return { disabledSeats, seatTypeMappings }
}

function normalizeNames(names = []) { return [...new Set(names)].sort() }
function normalizeMappings(mappings = {}) {
  const normalized = {}
  Object.keys(mappings).sort().forEach(typeId => {
    normalized[typeId] = normalizeNames(mappings[typeId])
  })
  return normalized
}
function getLayoutSignature(rows, cols, seatTypeMappings, disabledSeats) {
  return JSON.stringify({
    rows, cols,
    seatTypeMappings: normalizeMappings(seatTypeMappings),
    disabledSeats: normalizeNames(disabledSeats),
  })
}
function countActualSeats(rows, cols, disabledSeats = []) {
  const validNames = new Set()
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      validNames.add(`${String.fromCharCode(65 + r)}${c + 1}`)
  const disabledCount = new Set(disabledSeats.filter(n => validNames.has(n))).size
  return Math.max(0, rows * cols - disabledCount)
}

// ─── InteractiveSeatMapBuilder (giữ nguyên logic, chỉ thay style overlay) ────
function InteractiveSeatMapBuilder({ totalRows, totalCols, onChange, seatTypes, initialDisabled, initialMappings }) {
  const defaultType   = seatTypes.find(t => t.name?.toUpperCase() === 'STANDARD') || seatTypes[0]
  const defaultTypeId = defaultType?.id || ''

  const [seatTypeMappings, setSeatTypeMappings] = useState(initialMappings || {})
  const [disabledSeats,    setDisabledSeats]    = useState(initialDisabled || [])
  const [isDragging,       setIsDragging]       = useState(false)
  const [dragSelected,     setDragSelected]     = useState(new Set())
  const [contextMenu,      setContextMenu]      = useState(null)

  useEffect(() => {
    setSeatTypeMappings(initialMappings || {})
    setDisabledSeats(initialDisabled || [])
  }, [initialMappings, initialDisabled])

  const cellConfig = buildCellConfig(seatTypes)
  const cells      = buildCells(totalRows, totalCols, seatTypeMappings, disabledSeats, defaultTypeId)

  useEffect(() => {
    onChange({ totalRows, totalColumns: totalCols, seatTypeMappings, disabledSeats, defaultSeatTypeId: defaultTypeId })
  }, [seatTypeMappings, disabledSeats, totalRows, totalCols, defaultTypeId, onChange])

  const handleMouseDown  = (name) => { setIsDragging(true); setDragSelected(new Set([name])) }
  const handleMouseEnter = (name) => { if (isDragging) setDragSelected(prev => new Set([...prev, name])) }
  const handleMouseUp    = (e)    => {
    setIsDragging(false)
    if (dragSelected.size > 0) setContextMenu({ x: e.clientX, y: e.clientY, cells: [...dragSelected] })
  }

  const applyType = (typeId) => {
    const names = contextMenu?.cells || []
    if (typeId === 'DISABLED') {
      setDisabledSeats(prev => [...new Set([...prev, ...names])])
      setSeatTypeMappings(prev => {
        const next = { ...prev }
        Object.keys(next).forEach(k => { next[k] = next[k].filter(n => !names.includes(n)) })
        return next
      })
    } else {
      setDisabledSeats(prev => prev.filter(n => !names.includes(n)))
      setSeatTypeMappings(prev => {
        const next = { ...prev }
        Object.keys(next).forEach(k => { next[k] = next[k].filter(n => !names.includes(n)) })
        if (!next[typeId]) next[typeId] = []
        next[typeId] = [...new Set([...next[typeId], ...names])]
        return next
      })
    }
    setContextMenu(null)
    setDragSelected(new Set())
  }

  const grouped = {}
  cells.forEach(c => {
    if (!grouped[c.row]) grouped[c.row] = []
    grouped[c.row].push(c)
  })

  return (
    <div onMouseUp={handleMouseUp} onMouseLeave={() => setIsDragging(false)}
      style={{ userSelect: 'none', position: 'relative' }}>
      <div className="text-center text-secondary small mb-2 py-1 rounded"
        style={{ background: '#334155', letterSpacing: 6 }}>MÀN HÌNH CHIẾU</div>

      <div style={{ overflowX: 'auto', padding: '8px 0' }}>
        {Object.entries(grouped).map(([rowIdx, rowCells]) => (
          <div key={rowIdx} className="d-flex align-items-center gap-1 mb-1 justify-content-center">
            <span className="text-secondary" style={{ width: 24, fontSize: 12 }}>
              {String.fromCharCode(65 + Number(rowIdx))}
            </span>
            {rowCells.map(cell => {
              const color = cellConfig[cell.typeId] || DISABLED_STYLE
              const isH   = dragSelected.has(cell.name)
              return (
                <div key={cell.name}
                  onMouseDown={() => handleMouseDown(cell.name)}
                  onMouseEnter={() => handleMouseEnter(cell.name)}
                  title={`${cell.name} (${color.label || cell.typeId})`}
                  style={{
                    width: 30, height: 30, borderRadius: 5,
                    background: isH ? '#fbbf24' : color.bg,
                    border: `2px solid ${isH ? '#f59e0b' : color.border}`,
                    cursor: 'pointer', fontSize: 9, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: isH ? '#000' : '#94a3b8', fontWeight: 600, transition: 'all 0.1s',
                  }}>
                  {cell.typeId === 'DISABLED' ? '' : cell.name.slice(1)}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div style={{
          position: 'fixed', top: contextMenu.y, left: contextMenu.x,
          background: '#1e293b', border: '1px solid #475569', borderRadius: 8,
          zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.5)', overflow: 'hidden',
        }}>
          <div className="p-2 text-secondary small border-bottom border-secondary px-3">
            {contextMenu.cells.length} ô đã chọn
          </div>
          {Object.entries(cellConfig).map(([typeId, { label, bg, border }]) => (
            <button key={typeId} onClick={() => applyType(typeId)}
              className="btn btn-dark w-100 text-start px-3 py-2 rounded-0" style={{ fontSize: 13 }}>
              <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: bg, border: `2px solid ${border}`, marginRight: 8, verticalAlign: 'middle' }} />
              Đặt là {label}
            </button>
          ))}
          <button onClick={() => { setContextMenu(null); setDragSelected(new Set()) }}
            className="btn btn-dark w-100 text-start px-3 py-2 rounded-0 text-secondary" style={{ fontSize: 13 }}>
            ✕ Đóng
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="d-flex gap-3 mt-3 flex-wrap justify-content-center">
        {Object.entries(cellConfig).map(([typeId, { bg, border, label }]) => (
          <div key={typeId} className="d-flex align-items-center gap-1">
            <div style={{ width: 14, height: 14, borderRadius: 3, background: bg, border: `2px solid ${border}` }} />
            <small className="text-secondary">{label}</small>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function AdminAuditoriums() {
  const [list,       setList]       = useState([])
  const [seatTypes,  setSeatTypes]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [editItem,   setEditItem]   = useState(null)
  const [form,       setForm]       = useState({ name: '', status: 'ACTIVE', rows: 8, cols: 12 })
  const [seatLayout, setSeatLayout] = useState({ totalRows: 8, totalColumns: 12, seatTypeMappings: {}, disabledSeats: [], defaultSeatTypeId: '' })
  const [initialDisabled,        setInitialDisabled]        = useState([])
  const [initialMappings,        setInitialMappings]        = useState({})
  const [initialLayoutSignature, setInitialLayoutSignature] = useState('')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  // Client-side search + filter + pagination
  const [search,        setSearch]        = useState('')
  const [filterStatus,  setFilterStatus]  = useState('')
  const [page,          setPage]          = useState(0)

  const load = () => {
    setLoading(true)
    Promise.all([
      auditoriumService.getAll(),
      axiosClient.get('/admin/seat-types'),
    ]).then(([audiRes, typesRes]) => {
      setList(audiRes.data || audiRes || [])
      setSeatTypes(typesRes.data || typesRes || [])
    }).catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    let result = list
    const q = search.trim().toLowerCase()
    if (q) result = result.filter(i => i.name?.toLowerCase().includes(q))
    if (filterStatus) result = result.filter(i => i.status === filterStatus)
    return result
  }, [list, search, filterStatus])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const pagination = buildPagination(page, totalPages)

  const openCreate = () => {
    setEditItem(null)
    setForm({ name: '', status: 'ACTIVE', rows: 8, cols: 12 })
    setInitialDisabled([])
    setInitialMappings({})
    setInitialLayoutSignature('')
    setSeatLayout({ totalRows: 8, totalColumns: 12, seatTypeMappings: {}, disabledSeats: [], defaultSeatTypeId: '' })
    setError('')
    setShowModal(true)
  }

  const openEdit = async (item) => {
    setEditItem(item)
    setError('')
    const rows = item.totalRows || 8
    const cols = item.totalColumns || 12
    setForm({ name: item.name, status: item.status, rows, cols })
    try {
      const seatsRes = await axiosClient.get(`/auditoriums/${item.id}/seats`)
      const seats = seatsRes.data || seatsRes || []
      const { disabledSeats, seatTypeMappings } = reconstructFromSeats(seats, rows, cols)
      setInitialDisabled(disabledSeats)
      setInitialMappings(seatTypeMappings)
      setInitialLayoutSignature(getLayoutSignature(rows, cols, seatTypeMappings, disabledSeats))
      const defaultType = seatTypes.find(t => t.name?.toUpperCase() === 'STANDARD') || seatTypes[0]
      setSeatLayout({ totalRows: rows, totalColumns: cols, seatTypeMappings, disabledSeats, defaultSeatTypeId: defaultType?.id || '' })
    } catch {
      setInitialDisabled([])
      setInitialMappings({})
      setInitialLayoutSignature(getLayoutSignature(rows, cols, {}, []))
    }
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa phòng chiếu này?')) return
    try {
      await auditoriumService.delete(id)
      notifySuccess('Xóa phòng chiếu thành công')
      load()
    } catch (err) { notifyError(err?.message || 'Không thể xóa phòng chiếu') }
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError('')
    const normalizedLayout = {
      ...seatLayout,
      totalRows: form.rows,
      totalColumns: form.cols,
      seatTypeMappings: normalizeMappings(seatLayout.seatTypeMappings),
      disabledSeats: normalizeNames(seatLayout.disabledSeats),
    }
    const payload = { name: form.name, status: form.status, seatLayout: normalizedLayout }
    try {
      if (editItem) {
        const currentSig    = getLayoutSignature(form.rows, form.cols, normalizedLayout.seatTypeMappings, normalizedLayout.disabledSeats)
        const shouldRegen   = currentSig !== initialLayoutSignature
        if (shouldRegen) await auditoriumService.regenerateSeats(editItem.id, payload)
        else             await auditoriumService.update(editItem.id, { name: form.name, status: form.status })
      } else {
        await auditoriumService.create(payload)
      }
      notifySuccess(editItem ? 'Cập nhật phòng chiếu thành công' : 'Tạo phòng chiếu thành công')
      setShowModal(false)
      load()
    } catch (err) {
      const msg = err?.message || 'Lỗi không xác định'
      setError(msg)
      notifyError(msg)
    } finally { setSaving(false) }
  }

  const handleSeatLayoutChange = useCallback((layout) => { setSeatLayout(layout) }, [])

  const currentLayoutSignature = getLayoutSignature(form.rows, form.cols, seatLayout.seatTypeMappings, seatLayout.disabledSeats)
  const shouldRegenerateOnSave = !!editItem && currentLayoutSignature !== initialLayoutSignature
  const actualSeatCount        = countActualSeats(form.rows, form.cols, seatLayout.disabledSeats)

  // Stats
  const activeCount    = list.filter(i => i.status === 'ACTIVE').length
  const totalSeatsSum  = list.reduce((s, i) => s + (i.totalSeats || 0), 0)

  return (
    <section className="container-fluid px-2 px-md-3 px-xl-4">
      <div className="card border-0 shadow-sm">
        <div className="card-body p-3 p-md-4">

          {/* Header */}
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
            <div>
              <h2 className="h4 mb-1">Quản lý phòng chiếu</h2>
              <p className="text-secondary mb-0">Tạo và cấu hình sơ đồ ghế trực quan.</p>
            </div>
            <button className="btn btn-primary px-4" onClick={openCreate}>+ Thêm Phòng Chiếu</button>
          </div>

          {/* Stats */}
          <div className="row g-3 mb-4">
            {[
              { label: 'Tổng phòng',       value: list.length,     cls: 'bg-primary-subtle' },
              { label: 'Đang hoạt động',   value: activeCount,     cls: 'bg-success-subtle' },
              { label: 'Tổng số ghế',      value: totalSeatsSum,   cls: 'bg-warning-subtle' },
              { label: 'Kết quả lọc',      value: filtered.length, cls: 'bg-info-subtle' },
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
                <div className="col-12 col-md-5 col-xl-4">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Tìm theo tên phòng chiếu..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(0) }}
                  />
                </div>
                <div className="col-12 col-md-3 col-xl-3">
                  <select className="form-select" value={filterStatus}
                    onChange={e => { setFilterStatus(e.target.value); setPage(0) }}>
                    <option value="">Tất cả trạng thái</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
                <div className="col-12 col-md-2">
                  <button className="btn btn-outline-secondary w-100"
                    onClick={() => { setSearch(''); setFilterStatus(''); setPage(0) }}>
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
                    <th>Tên Phòng</th>
                    <th>Trạng Thái</th>
                    <th>Số Ghế</th>
                    <th>Lưới</th>
                    <th className="text-end">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 && (
                    <tr><td colSpan={5} className="text-center text-secondary py-4">Không có dữ liệu.</td></tr>
                  )}
                  {paginated.map(item => (
                    <tr key={item.id}>
                      <td className="fw-semibold">{item.name}</td>
                      <td>
                        <span className={`badge ${
                          item.status === 'ACTIVE'             ? 'text-bg-success' :
                          item.status === 'UNDER_MAINTENANCE'  ? 'text-bg-warning' :
                          'text-bg-secondary'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td><span className="badge text-bg-secondary">{item.totalSeats ?? 0} ghế</span></td>
                      <td><small className="text-secondary">{item.totalRows} × {item.totalColumns}</small></td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-outline-primary me-2" onClick={() => openEdit(item)}>Sửa</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(item.id)}>Xóa</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mt-3">
            <p className="text-secondary mb-0">Trang {page + 1} / {Math.max(totalPages, 1)}</p>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setPage(p => p - 1)} disabled={page <= 0}>Trước</button>
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
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>Sau</button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Tạo / Sửa */}
      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editItem ? 'Sửa Phòng Chiếu' : 'Tạo Phòng Chiếu Mới'}</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>

              <div className="modal-body">
                {error && <div className="alert alert-danger py-2">{error}</div>}
                {shouldRegenerateOnSave && (
                  <div className="alert alert-warning py-2 small">
                    ⚠️ Khi lưu, toàn bộ ghế cũ sẽ được xóa và tạo lại theo layout mới này.
                  </div>
                )}

                <div className="row g-3 mb-4">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Tên Phòng <span className="text-danger">*</span></label>
                    <input className="form-control"
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">Trạng Thái</label>
                    <select className="form-select"
                      value={form.status}
                      onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label fw-semibold">Số Hàng</label>
                    <input type="number" min={1} max={26} className="form-control"
                      value={form.rows}
                      onChange={e => setForm(p => ({ ...p, rows: Number(e.target.value) }))} />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label fw-semibold">Số Cột</label>
                    <input type="number" min={1} max={50} className="form-control"
                      value={form.cols}
                      onChange={e => setForm(p => ({ ...p, cols: Number(e.target.value) }))} />
                  </div>
                  <div className="col-md-1 d-flex align-items-end">
                    <div className="small text-secondary">
                      <span className="d-block">Ghế hợp lệ:</span>
                      <strong className="text-primary fs-5">{actualSeatCount}</strong>
                    </div>
                  </div>
                </div>

                <div className="card border-light-subtle">
                  <div className="card-header bg-light">
                    <span className="small fw-semibold text-secondary">
                      🖱️ Kéo thả để chọn nhiều ô, thả chuột để cấu hình loại ghế
                    </span>
                  </div>
                  <div className="card-body" style={{ background: '#0f172a', borderRadius: '0 0 8px 8px' }}>
                    {seatTypes.length > 0 ? (
                      <InteractiveSeatMapBuilder
                        key={`${editItem?.id || 'new'}-${form.rows}-${form.cols}`}
                        totalRows={form.rows}
                        totalCols={form.cols}
                        seatTypes={seatTypes}
                        initialDisabled={initialDisabled}
                        initialMappings={initialMappings}
                        onChange={handleSeatLayoutChange}
                      />
                    ) : (
                      <div className="text-center text-secondary py-4">Đang tải loại ghế...</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button className="btn btn-primary fw-semibold" onClick={handleSubmit} disabled={saving || !form.name}>
                  {saving
                    ? 'Đang Lưu...'
                    : editItem
                      ? (shouldRegenerateOnSave ? '💾 Lưu & Tái Tạo Ghế' : '💾 Lưu Thay Đổi')
                      : '✅ Tạo & Sinh Ghế'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default AdminAuditoriums
