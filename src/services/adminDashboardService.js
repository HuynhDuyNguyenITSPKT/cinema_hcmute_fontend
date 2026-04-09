import axiosClient from '../api/axiosClient'

function resolveDashboardBasePath() {
  const baseURL = String(axiosClient?.defaults?.baseURL || '')
  const hasApiPrefix = /\/api(\/|$)/.test(baseURL)
  return hasApiPrefix ? '/admin/dashboard' : '/api/admin/dashboard'
}

const DASHBOARD_BASE_PATH = resolveDashboardBasePath()

function endpoint(path) {
  return `${DASHBOARD_BASE_PATH}${path}`
}

const adminDashboardService = {
  getKeyMetrics: ({ fromDate, toDate }) =>
    axiosClient.get(endpoint('/key-metrics'), {
      params: { fromDate, toDate },
    }),

  getRevenueTrend: ({ fromDate, toDate, granularity = 'DAY' }) =>
    axiosClient.get(endpoint('/trends/revenue'), {
      params: { fromDate, toDate, granularity },
    }),

  getRevenueBreakdown: ({ fromDate, toDate }) =>
    axiosClient.get(endpoint('/trends/revenue-breakdown'), {
      params: { fromDate, toDate },
    }),

  getShowtimeHeatmap: ({ fromDate, toDate }) =>
    axiosClient.get(endpoint('/trends/showtime-heatmap'), {
      params: { fromDate, toDate },
    }),

  getTopMovies: ({ fromDate, toDate, limit = 5, metric = 'REVENUE' }) =>
    axiosClient.get(endpoint('/performance/top-movies'), {
      params: { fromDate, toDate, limit, metric },
    }),

  getTopExtraServices: ({ fromDate, toDate, limit = 5 }) =>
    axiosClient.get(endpoint('/performance/top-extra-services'), {
      params: { fromDate, toDate, limit },
    }),

  getAuditoriumPerformance: ({ fromDate, toDate }) =>
    axiosClient.get(endpoint('/performance/auditoriums'), {
      params: { fromDate, toDate },
    }),

  getNextWeekRevenueForecast: () =>
    axiosClient.get(endpoint('/forecast/next-week-revenue')),

  getCapacityAlerts: ({ threshold = 0.85, hoursAhead = 48 } = {}) =>
    axiosClient.get(endpoint('/forecast/capacity-alerts'), {
      params: { threshold, hoursAhead },
    }),

  getExtraServiceSpikeAlerts: ({ multiplier = 2.0, lookbackDays = 14 } = {}) =>
    axiosClient.get(endpoint('/forecast/extra-service-spikes'), {
      params: { multiplier, lookbackDays },
    }),

  getExcelReportData: ({ fromDate, toDate }) =>
    axiosClient.get(endpoint('/reports/excel-data'), {
      params: { fromDate, toDate },
    }),

  getExportExcelCsv: ({ fromDate, toDate }) =>
    axiosClient.get(endpoint('/reports/export-excel.csv'), {
      params: { fromDate, toDate },
      responseType: 'blob',
    }),

  getMonthlyPdfSummaryData: ({ year, month }) =>
    axiosClient.get(endpoint('/reports/pdf-summary'), {
      params: { year, month },
    }),

  getLiveSales: ({ minutes = 30 } = {}) =>
    axiosClient.get(endpoint('/realtime/live-sales'), {
      params: { minutes },
    }),

  getSystemStatus: () =>
    axiosClient.get(endpoint('/realtime/system-status')),
}

export default adminDashboardService
