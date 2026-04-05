const PeakHourStrategy = {
  name: 'PEAK',
  label: 'Giờ cao điểm',
  multiplier: 1.5,
  badgeClass: 'danger',
  icon: '🔴',
  isApplicable: (hour) => hour >= 18 && hour <= 22,
  describe: () => 'Khung 18:00–22:00 — phụ phí ×1.5',
}

const OffPeakStrategy = {
  name: 'OFF_PEAK',
  label: 'Giờ thấp điểm',
  multiplier: 0.8,
  badgeClass: 'success',
  icon: '🟢',
  isApplicable: (hour) => hour >= 8 && hour < 12,
  describe: () => 'Khung 08:00–12:00 — giảm ×0.8',
}

const WeekendStrategy = {
  name: 'WEEKEND',
  label: 'Cuối tuần',
  multiplier: 1.3,
  badgeClass: 'warning',
  icon: '🟡',
  isApplicable: (_hour, dayOfWeek) => dayOfWeek === 0 || dayOfWeek === 6,
  describe: () => 'Thứ 7 & Chủ nhật — phụ phí ×1.3',
}

const NormalStrategy = {
  name: 'NORMAL',
  label: 'Giờ bình thường',
  multiplier: 1.0,
  badgeClass: 'secondary',
  icon: '⚪',
  isApplicable: () => true,
  describe: () => 'Khung giờ thông thường — ×1.0',
}

export function detectStrategy(dateTimeString) {
  if (!dateTimeString) return NormalStrategy
  const dt = new Date(dateTimeString)
  if (Number.isNaN(dt.getTime())) return NormalStrategy

  const hour = dt.getHours()
  const dayOfWeek = dt.getDay()

  if (PeakHourStrategy.isApplicable(hour)) return PeakHourStrategy
  if (WeekendStrategy.isApplicable(hour, dayOfWeek)) return WeekendStrategy
  if (OffPeakStrategy.isApplicable(hour)) return OffPeakStrategy
  return NormalStrategy
}

export function calculatePrice(basePrice, dateTimeString) {
  const strategy = detectStrategy(dateTimeString)
  return Math.round(Number(basePrice) * strategy.multiplier)
}

export const ALL_STRATEGIES = [PeakHourStrategy, OffPeakStrategy, WeekendStrategy, NormalStrategy]
