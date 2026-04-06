const PeakHourStrategy = {
  name: 'PEAK',
  label: 'Giờ cao điểm',
  multiplier: 1.2,
  badgeClass: 'danger',
  icon: '🔴',
  isApplicable: (hour, dayOfWeek) => dayOfWeek === 0 || dayOfWeek === 6 || hour >= 17,
  describe: () => 'Thứ 7/CN hoặc sau 17:00 — phụ phí ×1.2',
}

const OffPeakStrategy = {
  name: 'OFF_PEAK',
  label: 'Giờ thường',
  multiplier: 1.0,
  badgeClass: 'success',
  icon: '🟢',
  isApplicable: () => true,
  describe: () => 'Trước 17:00 ngày thường — ×1.0',
}

export function detectStrategy(dateTimeString) {
  if (!dateTimeString) return OffPeakStrategy
  const dt = new Date(dateTimeString)
  if (Number.isNaN(dt.getTime())) return OffPeakStrategy

  const hour = dt.getHours()
  const dayOfWeek = dt.getDay()

  if (PeakHourStrategy.isApplicable(hour, dayOfWeek)) return PeakHourStrategy
  return OffPeakStrategy
}

export function calculatePrice(basePrice, dateTimeString) {
  const strategy = detectStrategy(dateTimeString)
  return Math.round(Number(basePrice) * strategy.multiplier)
}

export const ALL_STRATEGIES = [PeakHourStrategy, OffPeakStrategy]
