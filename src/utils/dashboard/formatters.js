export function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export function formatCurrencyVND(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(toNumber(value))
}

export function formatInteger(value) {
  return new Intl.NumberFormat('vi-VN').format(toNumber(value))
}

export function normalizePercent(value) {
  const raw = toNumber(value)
  const percent = raw <= 1 ? raw * 100 : raw
  return Math.max(0, Math.min(100, percent))
}

export function formatPercent(value) {
  return `${normalizePercent(value).toFixed(0)}%`
}

export function formatTrendLabel(period, fallbackIndex) {
  if (!period) return `Moc ${fallbackIndex + 1}`
  const raw = String(period)

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return `${raw.slice(8, 10)}/${raw.slice(5, 7)}`
  }

  if (/^\d{4}-W\d{2}$/.test(raw)) {
    return raw.replace(/^\d{4}-/, '')
  }

  if (/^\d{4}-\d{2}$/.test(raw)) {
    return `${raw.slice(5, 7)}/${raw.slice(0, 4)}`
  }

  return raw.length > 10 ? raw.slice(0, 10) : raw
}

export function formatDateTimeVi(value) {
  if (!value) return '-'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return String(value)
  return dt.toLocaleString('vi-VN')
}

export function isValidDateRange(fromDate, toDate) {
  if (!fromDate || !toDate) {
    return { valid: false, message: 'Vui long chon day du tu ngay va den ngay.' }
  }

  const from = new Date(fromDate)
  const to = new Date(toDate)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { valid: false, message: 'Dinh dang ngay khong hop le.' }
  }

  if (from.getTime() > to.getTime()) {
    return { valid: false, message: 'Tu ngay phai nho hon hoac bang den ngay.' }
  }

  return { valid: true, message: '' }
}

export function isValidYearMonth(year, month) {
  const y = Number(year)
  const m = Number(month)

  if (!Number.isInteger(y) || y < 2000 || y > 2100) {
    return { valid: false, message: 'Nam khong hop le. Vui long nhap trong khoang 2000-2100.' }
  }

  if (!Number.isInteger(m) || m < 1 || m > 12) {
    return { valid: false, message: 'Thang phai trong khoang 1-12.' }
  }

  return { valid: true, message: '' }
}
