import React, { useState, useEffect, useCallback } from 'react'
import auditoriumService from '../services/auditoriumService'
import axiosClient from '../api/axiosClient'
import { notifyError, notifySuccess } from '../utils/notify'

const PALETTE = [
  { bg: '#1e293b', border: '#475569' }, // index 0 - Gray (default slot)
  { bg: '#4c1d95', border: '#7c3aed' }, // index 1 - Purple
  { bg: '#1e3a5f', border: '#3b82f6' }, // index 2 - Blue
  { bg: '#064e3b', border: '#059669' }, // index 3 - Green
  { bg: '#7f1d1d', border: '#dc2626' }, // index 4 - Red
  { bg: '#78350f', border: '#d97706' }, // index 5 - Amber
]

const DISABLED_STYLE = { bg: '#0f172a', border: '#1e293b' }

/** Xây cellTypesConfig từ danh sách seatTypes fetch từ DB */
function buildCellConfig(seatTypes) {
  const cfg = { DISABLED: { ...DISABLED_STYLE, label: 'Khuyết (trống)' } }
  seatTypes.forEach((t, i) => {
    const color = PALETTE[i % PALETTE.length]
    cfg[t.id] = { bg: color.bg, border: color.border, label: t.name }
  })
  return cfg
}

/** Xây cells từ state hiện tại */
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

/**
 * Tái dựng seatTypeMappings và disabledSeats từ danh sách ghế thực tế trong DB.
 * Ghế "khuyết" = những ô (row, col) trong [0..totalRows-1] x [0..totalCols-1]
 *                mà KHÔNG có bất kỳ seat nào tồn tại.
 */
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

function normalizeNames(names = []) {
  return [...new Set(names)].sort()
}

function normalizeMappings(mappings = {}) {
  const normalized = {}
  Object.keys(mappings).sort().forEach(typeId => {
    normalized[typeId] = normalizeNames(mappings[typeId])
  })
  return normalized
}

function getLayoutSignature(rows, cols, seatTypeMappings, disabledSeats) {
  return JSON.stringify({
    rows,
    cols,
    seatTypeMappings: normalizeMappings(seatTypeMappings),
    disabledSeats: normalizeNames(disabledSeats),
  })
}

function getValidSeatNames(rows, cols) {
  const names = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      names.push(`${String.fromCharCode(65 + r)}${c + 1}`)
    }
  }
  return names
}

function countActualSeats(rows, cols, disabledSeats = []) {
  const validSeatNames = new Set(getValidSeatNames(rows, cols))
  const disabledCount = new Set(disabledSeats.filter(name => validSeatNames.has(name))).size
  return Math.max(0, rows * cols - disabledCount)
}

// ─── InteractiveSeatMapBuilder ───────────────────────────────────────────────

function InteractiveSeatMapBuilder({ totalRows, totalCols, onChange, seatTypes, initialDisabled, initialMappings }) {
  const defaultType = seatTypes.find(t => t.name?.toUpperCase() === 'STANDARD') || seatTypes[0]
  const defaultTypeId = defaultType?.id || ''

  const [seatTypeMappings, setSeatTypeMappings] = useState(initialMappings || {})
  const [disabledSeats, setDisabledSeats] = useState(initialDisabled || [])
  const [isDragging, setIsDragging] = useState(false)
  const [dragSelected, setDragSelected] = useState(new Set())
  const [contextMenu, setContextMenu] = useState(null)

  // Khi initial values thay đổi (admin mở edit mới), reset lại state
  useEffect(() => {
    setSeatTypeMappings(initialMappings || {})
    setDisabledSeats(initialDisabled || [])
  }, [initialMappings, initialDisabled])

  const cellConfig = buildCellConfig(seatTypes)
  const cells = buildCells(totalRows, totalCols, seatTypeMappings, disabledSeats, defaultTypeId)

  // Báo lên parent mỗi khi config thay đổi
  useEffect(() => {
    onChange({
      totalRows,
      totalColumns: totalCols,
      seatTypeMappings,
      disabledSeats,
      defaultSeatTypeId: defaultTypeId,
    })
  }, [seatTypeMappings, disabledSeats, totalRows, totalCols, defaultTypeId, onChange])

  const handleMouseDown = (name) => {
    setIsDragging(true)
    setDragSelected(new Set([name]))
  }
  const handleMouseEnter = (name) => {
    if (isDragging) setDragSelected(prev => new Set([...prev, name]))
  }
  const handleMouseUp = (e) => {
    setIsDragging(false)
    if (dragSelected.size > 0) {
      setContextMenu({ x: e.clientX, y: e.clientY, cells: [...dragSelected] })
    }
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
              const isHighlighted = dragSelected.has(cell.name)
              return (
                <div key={cell.name}
                  onMouseDown={() => handleMouseDown(cell.name)}
                  onMouseEnter={() => handleMouseEnter(cell.name)}
                  title={`${cell.name} (${color.label || cell.typeId})`}
                  style={{
                    width: 30, height: 30, borderRadius: 5,
                    background: isHighlighted ? '#fbbf24' : color.bg,
                    border: `2px solid ${isHighlighted ? '#f59e0b' : color.border}`,
                    cursor: 'pointer', fontSize: 9, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: isHighlighted ? '#000' : '#94a3b8', fontWeight: 600,
                    transition: 'all 0.1s',
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
              <span style={{
                display: 'inline-block', width: 12, height: 12, borderRadius: 2,
                background: bg, border: `2px solid ${border}`, marginRight: 8, verticalAlign: 'middle',
              }} />
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

// ─── Main Admin Auditoriums Page ──────────────────────────────────────────────

function AdminAuditoriums() {
  const [list, setList] = useState([])
  const [seatTypes, setSeatTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: '', status: 'ACTIVE', rows: 8, cols: 12 })
  const [seatLayout, setSeatLayout] = useState({ totalRows: 8, totalColumns: 12, seatTypeMappings: {}, disabledSeats: [], defaultSeatTypeId: '' })
  const [initialDisabled, setInitialDisabled] = useState([])
  const [initialMappings, setInitialMappings] = useState({})
  const [initialLayoutSignature, setInitialLayoutSignature] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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

    // Xác định kích thước lưới từ data đã lưu (totalRows, totalColumns từ API)
    const rows = item.totalRows || 8
    const cols = item.totalColumns || 12
    setForm({ name: item.name, status: item.status, rows, cols })

    // Fetch danh sách ghế thực tế để tái dựng layout
    try {
      const seatsRes = await axiosClient.get(`/auditoriums/${item.id}/seats`)
      const seats = seatsRes.data || seatsRes || []
      const { disabledSeats, seatTypeMappings } = reconstructFromSeats(seats, rows, cols)
      setInitialDisabled(disabledSeats)
      setInitialMappings(seatTypeMappings)
      setInitialLayoutSignature(getLayoutSignature(rows, cols, seatTypeMappings, disabledSeats))

      const defaultType = seatTypes.find(t => t.name?.toUpperCase() === 'STANDARD') || seatTypes[0]
      setSeatLayout({
        totalRows: rows,
        totalColumns: cols,
        seatTypeMappings,
        disabledSeats,
        defaultSeatTypeId: defaultType?.id || '',
      })
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
    } catch (err) {
      notifyError(err?.message || 'Không thể xóa phòng chiếu')
    }
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
    const payload = {
      name: form.name,
      status: form.status,
      seatLayout: normalizedLayout,
    }
    try {
      if (editItem) {
        const currentLayoutSignature = getLayoutSignature(
          form.rows,
          form.cols,
          normalizedLayout.seatTypeMappings,
          normalizedLayout.disabledSeats,
        )
        const shouldRegenerate = currentLayoutSignature !== initialLayoutSignature

        if (shouldRegenerate) {
          await auditoriumService.regenerateSeats(editItem.id, payload)
        } else {
          await auditoriumService.update(editItem.id, { name: form.name, status: form.status })
        }
      } else {
        await auditoriumService.create(payload)
      }
      notifySuccess(editItem ? 'Cập nhật phòng chiếu thành công' : 'Tạo phòng chiếu thành công')
      setShowModal(false)
      load()
    } catch (err) {
      const message = err?.message || 'Lỗi không xác định'
      setError(message)
      notifyError(message)
    } finally {
      setSaving(false)
    }
  }

  const handleSeatLayoutChange = useCallback((layout) => {
    setSeatLayout(layout)
  }, [])

  const currentLayoutSignature = getLayoutSignature(
    form.rows,
    form.cols,
    seatLayout.seatTypeMappings,
    seatLayout.disabledSeats,
  )
  const shouldRegenerateOnSave = !!editItem && currentLayoutSignature !== initialLayoutSignature
  const actualSeatCount = countActualSeats(form.rows, form.cols, seatLayout.disabledSeats)

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-0">🏛️ Quản Lý Phòng Chiếu</h4>
          <small className="text-secondary">Tạo và cấu hình sơ đồ ghế trực quan</small>
        </div>
        <button className="btn btn-danger" onClick={openCreate}>+ Thêm Phòng</button>
      </div>

      {loading ? <div className="text-center py-5"><div className="spinner-border text-danger" /></div> : (
        <div className="table-responsive border rounded-3 bg-white">
          <table className="table table-striped table-hover align-middle mb-0">
            <thead className="table-light"><tr>
              <th>Tên phòng</th><th>Trạng thái</th><th>Số ghế</th><th>Lưới</th><th>Hành động</th>
            </tr></thead>
            <tbody>
              {list.map(item => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>
                    <span className={`badge ${item.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td><span className="text-warning fw-bold">{item.totalSeats}</span></td>
                  <td><small className="text-secondary">{item.totalRows} × {item.totalColumns}</small></td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => openEdit(item)}>Sửa</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(item.id)}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content bg-dark text-light border-secondary">
              <div className="modal-header border-secondary">
                <h5 className="modal-title">{editItem ? 'Sửa Phòng Chiếu' : 'Tạo Phòng Chiếu Mới'}</h5>
                <button className="btn-close btn-close-white" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger">{error}</div>}
                {shouldRegenerateOnSave && (
                  <div className="alert alert-warning py-2 small">
                    ⚠️ Khi lưu, toàn bộ ghế cũ sẽ được xoá và tạo lại theo layout mới này.
                  </div>
                )}

                <div className="row g-3 mb-4">
                  <div className="col-md-4">
                    <label className="form-label">Tên Phòng *</label>
                    <input className="form-control bg-dark text-light border-secondary"
                      value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Trạng Thái</label>
                    <select className="form-select bg-dark text-light border-secondary"
                      value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Số Hàng *</label>
                    <input type="number" min={1} max={26} className="form-control bg-dark text-light border-secondary"
                      value={form.rows} onChange={e => setForm(p => ({ ...p, rows: Number(e.target.value) }))} />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Số Cột *</label>
                    <input type="number" min={1} max={50} className="form-control bg-dark text-light border-secondary"
                      value={form.cols} onChange={e => setForm(p => ({ ...p, cols: Number(e.target.value) }))} />
                  </div>
                  <div className="col-md-2 d-flex align-items-end">
                    <div className="text-secondary small">
                      Số ghế: <strong className="text-warning">{actualSeatCount}</strong>
                    </div>
                  </div>
                </div>

                <div className="border border-secondary rounded p-3 mb-3">
                  <h6 className="text-secondary mb-3">
                    🖱️ Kéo thả để chọn nhiều ô, thả chuột để cấu hình loại ghế
                  </h6>
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

              <div className="modal-footer border-secondary">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button className="btn btn-danger" onClick={handleSubmit} disabled={saving || !form.name}>
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
    </div>
  )
}

export default AdminAuditoriums
