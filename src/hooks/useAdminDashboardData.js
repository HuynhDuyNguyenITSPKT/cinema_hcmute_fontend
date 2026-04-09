import { useCallback, useMemo, useState } from 'react'
import adminDashboardService from '../services/adminDashboardService'
import { parseDashboardResponse, resolveDashboardError } from '../utils/dashboard/parseDashboardResponse'

const ENDPOINTS = {
  keyMetrics: '/key-metrics',
  revenueTrend: '/trends/revenue',
  revenueBreakdown: '/trends/revenue-breakdown',
  showtimeHeatmap: '/trends/showtime-heatmap',
  topMovies: '/performance/top-movies',
  topExtraServices: '/performance/top-extra-services',
  auditoriumPerformance: '/performance/auditoriums',
  nextWeekForecast: '/forecast/next-week-revenue',
  capacityAlerts: '/forecast/capacity-alerts',
  extraServiceSpikes: '/forecast/extra-service-spikes',
  liveSales: '/realtime/live-sales',
  systemStatus: '/realtime/system-status',
  excelData: '/reports/excel-data',
  pdfSummary: '/reports/pdf-summary',
}

const FRIENDLY_LABELS = {
  keyMetrics: 'chỉ số tổng quan',
  revenueTrend: 'xu hướng doanh thu',
  revenueBreakdown: 'cơ cấu doanh thu',
  showtimeHeatmap: 'heatmap suất chiếu',
  topMovies: 'top phim',
  topExtraServices: 'top dịch vụ thêm',
  auditoriumPerformance: 'hiệu suất phòng chiếu',
  nextWeekForecast: 'dự báo doanh thu tuần tới',
  capacityAlerts: 'cảnh báo sức chứa',
  extraServiceSpikes: 'cảnh báo đột biến dịch vụ',
  liveSales: 'giao dịch thời gian thực',
  systemStatus: 'trạng thái hệ thống',
  excelData: 'dữ liệu excel',
  pdfSummary: 'dữ liệu tổng hợp pdf',
}

function createSection(endpoint) {
  return {
    endpoint,
    loading: false,
    error: '',
    data: null,
  }
}

export function useAdminDashboardData({ fromDate, toDate, year, month }) {
  const [sections, setSections] = useState({
    keyMetrics: createSection(ENDPOINTS.keyMetrics),
    revenueTrend: createSection(ENDPOINTS.revenueTrend),
    revenueBreakdown: createSection(ENDPOINTS.revenueBreakdown),
    showtimeHeatmap: createSection(ENDPOINTS.showtimeHeatmap),
    topMovies: createSection(ENDPOINTS.topMovies),
    topExtraServices: createSection(ENDPOINTS.topExtraServices),
    auditoriumPerformance: createSection(ENDPOINTS.auditoriumPerformance),
    nextWeekForecast: createSection(ENDPOINTS.nextWeekForecast),
    capacityAlerts: createSection(ENDPOINTS.capacityAlerts),
    extraServiceSpikes: createSection(ENDPOINTS.extraServiceSpikes),
    liveSales: createSection(ENDPOINTS.liveSales),
    systemStatus: createSection(ENDPOINTS.systemStatus),
    excelData: createSection(ENDPOINTS.excelData),
    pdfSummary: createSection(ENDPOINTS.pdfSummary),
  })

  const requestMap = useMemo(() => ({
    keyMetrics: () => adminDashboardService.getKeyMetrics({ fromDate, toDate }),
    revenueTrend: () => adminDashboardService.getRevenueTrend({ fromDate, toDate, granularity: 'DAY' }),
    revenueBreakdown: () => adminDashboardService.getRevenueBreakdown({ fromDate, toDate }),
    showtimeHeatmap: () => adminDashboardService.getShowtimeHeatmap({ fromDate, toDate }),
    topMovies: () => adminDashboardService.getTopMovies({ fromDate, toDate, limit: 5, metric: 'REVENUE' }),
    topExtraServices: () => adminDashboardService.getTopExtraServices({ fromDate, toDate, limit: 5 }),
    auditoriumPerformance: () => adminDashboardService.getAuditoriumPerformance({ fromDate, toDate }),
    nextWeekForecast: () => adminDashboardService.getNextWeekRevenueForecast(),
    capacityAlerts: () => adminDashboardService.getCapacityAlerts({ threshold: 0.85, hoursAhead: 48 }),
    extraServiceSpikes: () => adminDashboardService.getExtraServiceSpikeAlerts({ multiplier: 2.0, lookbackDays: 14 }),
    liveSales: () => adminDashboardService.getLiveSales({ minutes: 30 }),
    systemStatus: () => adminDashboardService.getSystemStatus(),
    excelData: () => adminDashboardService.getExcelReportData({ fromDate, toDate }),
    pdfSummary: () => adminDashboardService.getMonthlyPdfSummaryData({ year, month }),
  }), [fromDate, toDate, year, month])

  const runSection = useCallback(async (key) => {
    const requestFn = requestMap[key]
    if (!requestFn) return null

    setSections((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        loading: true,
        error: '',
      },
    }))

    try {
      const response = await requestFn()
      const parsedData = parseDashboardResponse(response)

      setSections((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          loading: false,
          error: '',
          data: parsedData,
        },
      }))

      return parsedData
    } catch (error) {
      const endpointLabel = FRIENDLY_LABELS[key] || 'du lieu dashboard'
      const friendlyError = resolveDashboardError(error, endpointLabel)

      setSections((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          loading: false,
          error: friendlyError,
        },
      }))

      return null
    }
  }, [requestMap])

  const loadDashboard = useCallback(async () => {
    const keys = [
      'keyMetrics',
      'revenueTrend',
      'revenueBreakdown',
      'showtimeHeatmap',
      'topMovies',
      'topExtraServices',
      'auditoriumPerformance',
      'nextWeekForecast',
      'liveSales',
      'systemStatus',
    ]

    await Promise.allSettled(keys.map((key) => runSection(key)))
  }, [runSection])

  return {
    sections,
    runSection,
    loadDashboard,
  }
}
