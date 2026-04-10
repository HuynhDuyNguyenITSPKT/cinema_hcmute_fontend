import { useCallback, useMemo, useState } from 'react'
import axiosClient from '../api/axiosClient'
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

function resolveDashboardBasePath() {
  const baseURL = String(axiosClient?.defaults?.baseURL || '')
  const hasApiPrefix = /\/api(\/|$)/.test(baseURL)
  return hasApiPrefix ? '/admin/dashboard' : '/api/admin/dashboard'
}

const DASHBOARD_BASE_PATH = resolveDashboardBasePath()

function endpoint(path) {
  return `${DASHBOARD_BASE_PATH}${path}`
}

function createSection(endpoint) {
  return {
    endpoint,
    loading: false,
    error: '',
    data: null,
  }
}

export function useAdminDashboardData({ fromDate, toDate }) {
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
    keyMetrics: () => axiosClient.get(endpoint('/key-metrics'), { params: { fromDate, toDate } }),
    revenueTrend: () => axiosClient.get(endpoint('/trends/revenue'), { params: { fromDate, toDate, granularity: 'DAY' } }),
    revenueBreakdown: () => axiosClient.get(endpoint('/trends/revenue-breakdown'), { params: { fromDate, toDate } }),
    showtimeHeatmap: () => axiosClient.get(endpoint('/trends/showtime-heatmap'), { params: { fromDate, toDate } }),
    topMovies: () => axiosClient.get(endpoint('/performance/top-movies'), { params: { fromDate, toDate, limit: 5, metric: 'REVENUE' } }),
    topExtraServices: () => axiosClient.get(endpoint('/performance/top-extra-services'), { params: { fromDate, toDate, limit: 5 } }),
    auditoriumPerformance: () => axiosClient.get(endpoint('/performance/auditoriums'), { params: { fromDate, toDate } }),
    nextWeekForecast: () => axiosClient.get(endpoint('/forecast/next-week-revenue')),
    capacityAlerts: () => axiosClient.get(endpoint('/forecast/capacity-alerts'), { params: { threshold: 0.85, hoursAhead: 48 } }),
    extraServiceSpikes: () => axiosClient.get(endpoint('/forecast/extra-service-spikes'), { params: { multiplier: 2.0, lookbackDays: 14 } }),
    liveSales: () => axiosClient.get(endpoint('/realtime/live-sales'), { params: { minutes: 30 } }),
    systemStatus: () => axiosClient.get(endpoint('/realtime/system-status')),
    excelData: () => axiosClient.get(endpoint('/reports/excel-data'), { params: { fromDate, toDate } }),
  }), [fromDate, toDate])

  const runSection = useCallback(async (key, options = {}) => {
    const requestFn = key === 'pdfSummary'
      ? () => axiosClient.get(endpoint('/reports/pdf-summary'), { params: { year: options.year, month: options.month } })
      : requestMap[key]

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
