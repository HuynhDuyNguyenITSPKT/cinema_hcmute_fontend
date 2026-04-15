import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import seatService from '../services/seatService'
import auditoriumService from '../services/auditoriumService'
import axiosClient from '../api/axiosClient'

const SEAT_STATUS = { AVAILABLE: 'AVAILABLE', LOCKED: 'LOCKED', BOOKED: 'BOOKED', SELECTED: 'SELECTED' }

const MAX_STANDARD_SEATS = 8
const LIVE_REFRESH_MS = 1500

const PALETTE = [
  { bg: '#1e293b', border: '#475569' }, // index 0 - Default/Gray
  { bg: '#4c1d95', border: '#7c3aed' }, // index 1 - Purple
  { bg: '#1e3a5f', border: '#3b82f6' }, // index 2 - Blue
  { bg: '#064e3b', border: '#059669' }, // index 3 - Green
  { bg: '#7f1d1d', border: '#dc2626' }, // index 4 - Red
  { bg: '#78350f', border: '#d97706' }, // index 5 - Amber
]

function buildCellConfig(seatTypes) {
  const cfg = {}
  seatTypes.forEach((t, i) => {
    const color = PALETTE[i % PALETTE.length]
    cfg[t.id] = { bg: color.bg, border: color.border, text: '#e2e8f0', label: t.name }
  })
  return cfg
}

function SeatSelection() {
  const { showtimeId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()

  const [seatMap, setSeatMap] = useState([])
  const [auditorium, setAuditorium] = useState(null) // {totalRows, totalColumns}
  const [seatTypes, setSeatTypes] = useState([])     // [{id, name, surcharge}]
  const [selectedIds, setSelectedIds] = useState([])
  const [bookingMode, setBookingMode] = useState('STANDARD')
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(null)
  const countdownRef = useRef(null)
  const selectedIdsRef = useRef([])
  const shouldKeepLocksOnUnmountRef = useRef(false)

  const movie = state?.movie
  const showtime = state?.showtime

  useEffect(() => {
    selectedIdsRef.current = selectedIds
  }, [selectedIds])

  const refreshSeatMap = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const res = await seatService.getSeatMap(showtimeId)
      const seats = res.data || res || []
      setSeatMap(seats)

      // Keep local selection consistent with backend lock ownership truth.
      const seatById = new Map(seats.map((seat) => [seat.id, seat]))
      setSelectedIds((prev) => {
        const next = prev.filter((id) => {
          const seat = seatById.get(id)
          if (!seat) return false
          return seat.lockedByCurrentUser === true
        })
        if (next.length === 0 && prev.length > 0) {
          setCountdown(null)
        }
        return next
      })
    } catch {
      setSeatMap([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [showtimeId])

  const loadStaticData = useCallback(async () => {
    try {
      if (showtime?.auditoriumId) {
        const audiRes = await auditoriumService.getById(showtime.auditoriumId)
        setAuditorium(audiRes.data || audiRes)
      }

      const typesRes = await axiosClient.get('/seat-types')
      setSeatTypes(typesRes.data || typesRes || [])
    } catch {
      // Keep seat page usable even if optional metadata fails to load.
    }
  }, [showtime])

  useEffect(() => {
    loadStaticData()
    refreshSeatMap({ silent: false })
  }, [loadStaticData, refreshSeatMap])

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') {
        refreshSeatMap({ silent: true })
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshSeatMap({ silent: true })
      }
    }

    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', onVisibilityChange)
    const intervalId = setInterval(tick, LIVE_REFRESH_MS)

    return () => {
      window.removeEventListener('focus', tick)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      clearInterval(intervalId)
    }
  }, [refreshSeatMap])

  useEffect(() => {
    const releaseLocksOnPageHide = () => {
      if (shouldKeepLocksOnUnmountRef.current) return
      seatService.unlockSeatsOnExit(showtimeId, selectedIdsRef.current)
    }

    window.addEventListener('pagehide', releaseLocksOnPageHide)

    return () => {
      window.removeEventListener('pagehide', releaseLocksOnPageHide)

      if (!shouldKeepLocksOnUnmountRef.current && selectedIdsRef.current.length > 0) {
        seatService.unlockSeats(showtimeId, selectedIdsRef.current).catch(() => {})
      }
    }
  }, [showtimeId])

  // Countdown timer
  useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) { handleExpire(); return }
    countdownRef.current = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(countdownRef.current)
  }, [countdown])

  const handleExpire = async () => {
    if (selectedIds.length > 0) await seatService.unlockSeats(showtimeId, selectedIds).catch(() => {})
    alert('Hết thời gian giữ ghế! Vui lòng chọn lại.')
    setSelectedIds([])
    setCountdown(null)
    refreshSeatMap({ silent: true })
  }

  const handleSeatClick = async (seat) => {
    if (seat.status === SEAT_STATUS.BOOKED) return
    if (seat.status === SEAT_STATUS.LOCKED && !selectedIds.includes(seat.id)) {
      alert('Ghế này đang được người khác giữ!')
      return
    }

    const alreadySelected = selectedIds.includes(seat.id)
    const newSelected = alreadySelected
      ? selectedIds.filter(id => id !== seat.id)
      : [...selectedIds, seat.id]

    if (!alreadySelected) {
      if (bookingMode === 'STANDARD' && newSelected.length > MAX_STANDARD_SEATS) {
        if (!window.confirm(
          `Bạn đang chọn ${newSelected.length} ghế (nhiều hơn giới hạn ${MAX_STANDARD_SEATS} ghế mua lẻ).\n\n` +
          `Nhấn "OK" để chuyển sang chế độ Khách Đoàn B2B (Mở khóa không giới hạn số ghế được chọn, yêu cầu tối thiểu 20 ghế).`
        )) return
        setBookingMode('GROUP')
      }

      try {
        await seatService.lockSeats(showtimeId, [seat.id])
        setSelectedIds(newSelected)
        if (countdown === null) setCountdown(600)
      } catch (err) {
        alert(err?.message || 'Ghế này vừa bị người khác chọn mất! Vui lòng thử ghế khác.')
        refreshSeatMap({ silent: true })
      }
    } else {
      await seatService.unlockSeats(showtimeId, [seat.id]).catch(() => {})
      setSelectedIds(newSelected)
      if (newSelected.length === 0) setCountdown(null)
      if (newSelected.length <= MAX_STANDARD_SEATS && bookingMode === 'GROUP') {
        setBookingMode('STANDARD')
      }
      refreshSeatMap({ silent: true })
    }
  }

  const formatCountdown = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const handleContinue = () => {
    if (selectedIds.length === 0) { alert('Vui lòng chọn ít nhất 1 ghế!'); return }

    shouldKeepLocksOnUnmountRef.current = true

    if (bookingMode === 'GROUP') {
      if (selectedIds.length < 20) {
        alert(`Khách Đoàn B2B yêu cầu tối thiểu 20 ghế. Bạn mới chọn ${selectedIds.length} ghế. Vui lòng chọn thêm ${20 - selectedIds.length} ghế nữa!`)
        shouldKeepLocksOnUnmountRef.current = false
        return
      }
      navigate('/group-booking', { state: { movie, showtime, seatIds: selectedIds } })
      return
    }

    const selectedSeatNames = seatMap.filter(s => selectedIds.includes(s.id)).map(s => s.name)
    const lockExpiresAt = Date.now() + countdown * 1000
    navigate('/checkout', { state: { showtimeId, selectedIds, selectedSeatNames, movie, showtime, lockExpiresAt } })
  }

  /**
   * Xây lưới ghế đầy đủ theo tọa độ (row × col).
   * Ô có ghế → hiển thị ghế bình thường.
   * Ô không có ghế (khuyết) → khoảng trống trong suốt.
   */
  const buildGrid = () => {
    if (!auditorium || !auditorium.totalRows || !auditorium.totalColumns) {
      // Fallback: nếu không có thông tin lưới, nhóm theo chữ hàng như cũ
      const rows = {}
      seatMap.forEach(seat => {
        const row = seat.name?.[0] || 'A'
        if (!rows[row]) rows[row] = {}
        rows[row][seat.columnIndex] = seat
      })
      const maxCols = Math.max(...seatMap.map(s => s.columnIndex + 1), 1)
      return Object.entries(rows)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([rowLabel, colMap]) => ({
          rowLabel,
          cols: Array.from({ length: maxCols }, (_, c) => colMap[c] || null),
        }))
    }

    // Xây Map nhanh: "rowIndex-colIndex" → seat
    const seatByPos = {}
    seatMap.forEach(s => { seatByPos[`${s.rowIndex}-${s.columnIndex}`] = s })

    return Array.from({ length: auditorium.totalRows }, (_, r) => ({
      rowLabel: String.fromCharCode(65 + r),
      cols: Array.from({ length: auditorium.totalColumns }, (_, c) => seatByPos[`${r}-${c}`] || null),
    }))
  }

  const grid = buildGrid()

  const cellConfig = buildCellConfig(seatTypes)

  const getSeatStyle = (seat) => {
    if (selectedIds.includes(seat.id)) return { bg: '#166534', border: '#22c55e', text: '#bbf7d0' }
    if (seat.status === SEAT_STATUS.BOOKED)  return { bg: '#1f2937', border: '#374151', text: '#374151' }
    if (seat.status === SEAT_STATUS.LOCKED)  return { bg: '#78350f', border: '#d97706', text: '#fbbf24' }
    
    if (seat.seatTypeId && cellConfig[seat.seatTypeId]) {
      return cellConfig[seat.seatTypeId]
    }
    return { bg: '#1e293b', border: '#475569', text: '#94a3b8' } // fallback
  }

  return (
    <div className="container-fluid py-4" style={{ background: '#0f172a', minHeight: '100vh' }}>
      {/* Header */}
      <div className="container mb-4">
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <h4 className="text-light mb-0">{movie?.title || 'Đặt Vé'}</h4>
            {showtime && (
              <small className="text-secondary">
                {new Date(showtime.startTime).toLocaleString('vi-VN')} · {showtime.auditoriumName}
              </small>
            )}
          </div>
          {countdown !== null && (
            <div className={`badge fs-6 px-3 py-2 ${countdown < 60 ? 'bg-danger' : 'bg-warning text-dark'}`}>
              ⏱ {formatCountdown(countdown)}
            </div>
          )}
        </div>
      </div>

      {/* Screen */}
      <div className="text-center mb-4">
        <div className="mx-auto text-secondary small py-2 rounded"
          style={{ background: '#334155', width: '70%', letterSpacing: 8 }}>
          MÀN HÌNH
        </div>
      </div>

      {/* Seat Grid */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-danger" /></div>
      ) : (
        <div className="container" style={{ overflowX: 'auto' }}>
          {grid.map(({ rowLabel, cols }) => (
            <div key={rowLabel} className="d-flex align-items-center justify-content-center mb-2 gap-1">
              <div className="text-secondary" style={{ width: 24, fontSize: 13, flexShrink: 0 }}>{rowLabel}</div>
              {cols.map((seat, colIdx) => {
                if (!seat) {
                  // Ô trống — ghế khuyết
                  return (
                    <div key={`empty-${rowLabel}-${colIdx}`}
                      style={{ width: 34, height: 34, flexShrink: 0 }} />
                  )
                }
                const style = getSeatStyle(seat)
                const isBooked = seat.status === SEAT_STATUS.BOOKED
                return (
                  <button key={seat.id}
                    disabled={isBooked}
                    onClick={() => handleSeatClick(seat)}
                    title={`${seat.name} - ${seat.seatTypeName || 'Standard'} (${seat.status})`}
                    style={{
                      width: 34, height: 34, borderRadius: 6, flexShrink: 0,
                      background: style.bg, border: `2px solid ${style.border}`,
                      color: style.text, fontSize: 11,
                      cursor: isBooked ? 'not-allowed' : 'pointer',
                      transition: 'transform 0.1s', fontWeight: 600,
                    }}
                    onMouseEnter={e => { if (!isBooked) e.currentTarget.style.transform = 'scale(1.15)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}>
                    {seat.name?.slice(1) || '?'}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="container mt-4">
        <div className="d-flex gap-4 justify-content-center flex-wrap">
          {seatTypes.map(t => {
            const cfg = cellConfig[t.id]
            if (!cfg) return null
            return (
              <div key={t.id} className="d-flex align-items-center gap-2">
                <div style={{ width: 20, height: 20, borderRadius: 4, background: cfg.bg, border: `2px solid ${cfg.border}` }} />
                <small className="text-secondary">{cfg.label}</small>
              </div>
            )
          })}
          
          <div className="d-flex align-items-center gap-2">
            <div style={{ width: 20, height: 20, borderRadius: 4, background: '#166534', border: '2px solid #22c55e' }} />
            <small className="text-secondary">Đang chọn</small>
          </div>
          <div className="d-flex align-items-center gap-2">
            <div style={{ width: 20, height: 20, borderRadius: 4, background: '#78350f', border: '2px solid #d97706' }} />
            <small className="text-secondary">Đang giữ</small>
          </div>
          <div className="d-flex align-items-center gap-2">
            <div style={{ width: 20, height: 20, borderRadius: 4, background: '#1f2937', border: '2px solid #374151' }} />
            <small className="text-secondary">Đã đặt</small>
          </div>
        </div>
      </div>

      {/* Footer Bar */}
      <div className="fixed-bottom bg-dark border-top border-secondary px-4 py-3">
        <div className="container d-flex align-items-center justify-content-between">
          <div className="text-light">
            <strong>{selectedIds.length}</strong> ghế đã chọn
            {bookingMode === 'GROUP' ? (
              selectedIds.length < 20 ? (
                <span className="ms-3 badge bg-warning text-dark fs-6 rounded-pill shadow-sm">
                  ⚡ Chọn thêm {20 - selectedIds.length} ghế nữa
                </span>
              ) : (
                <span className="ms-3 badge fs-6 rounded-pill shadow-sm" style={{ background: '#7c3aed' }}>
                  🏢 Đủ điều kiện Khách Đoàn B2B
                </span>
              )
            ) : null}
          </div>
          <button className="btn btn-danger px-4" disabled={selectedIds.length === 0} onClick={handleContinue}>
            Tiếp Theo →
          </button>
        </div>
      </div>
    </div>
  )
}

export default SeatSelection
