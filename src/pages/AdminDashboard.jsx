import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAdminDashboardData } from '../hooks/useAdminDashboardData'
import { exportDashboardExcel } from '../utils/dashboard/exportExcel'
import { exportDashboardPdf } from '../utils/dashboard/exportPdf'
import {
  formatCurrencyVND,
  formatDateTimeVi,
  formatInteger,
  formatPercent,
  formatTrendLabel,
  isValidDateRange,
  isValidYearMonth,
  normalizePercent,
  toNumber,
} from '../utils/dashboard/formatters'
import { listByKey } from '../utils/dashboard/parseDashboardResponse'
import './AdminDashboard.css'

const CHART_COLORS = ['#ea580c', '#0f766e', '#2563eb', '#d97706', '#7c3aed']

function monthStartDateInput() {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

function monthEndDateInput() {
  const d = new Date()
  d.setMonth(d.getMonth() + 1, 0)
  return d.toISOString().slice(0, 10)
}

function monthRangeByYearMonth(year, month) {
  const y = Number(year)
  const m = Number(month)
  const from = new Date(y, m - 1, 1)
  const to = new Date(y, m, 0)

  return {
    fromDate: from.toISOString().slice(0, 10),
    toDate: to.toISOString().slice(0, 10),
  }
}

function formatAuditoriumStatusLabel(status) {
  const normalized = String(status || '').toUpperCase()

  if (normalized === 'ACTIVE') return 'Phòng đang hoạt động'
  if (normalized === 'INACTIVE') return 'Phòng tạm ngưng'
  if (normalized === 'MAINTENANCE') return 'Phòng bảo trì'

  return `Trạng thái ${normalized || 'N/A'}`
}

function formatOccupancyDetailed(value) {
  if (value == null || value === '') return '--'
  return `${normalizePercent(value).toFixed(2)}%`
}

function SectionState({ section, onRetry, emptyText, children }) {
  if (section.loading && !section.data) {
    return <p className="empty-hint">Đang tải dữ liệu...</p>
  }

  if (section.error) {
    return (
      <div className="block-error">
        <p>{section.error}</p>
        <button type="button" className="btn-retry" onClick={onRetry}>Thử lại</button>
      </div>
    )
  }

  if (!section.data) {
    return <p className="empty-hint">{emptyText}</p>
  }

  return children
}

function AdminDashboard() {
  const [fromDate, setFromDate] = useState(monthStartDateInput())
  const [toDate, setToDate] = useState(monthEndDateInput())
  const [filterFromDate, setFilterFromDate] = useState(fromDate)
  const [filterToDate, setFilterToDate] = useState(toDate)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [validationError, setValidationError] = useState('')
  const [exportError, setExportError] = useState('')
  const [exportingExcel, setExportingExcel] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [pdfOverride, setPdfOverride] = useState(null)
  const [showOverview, setShowOverview] = useState(true)
  const [showHeroBar, setShowHeroBar] = useState(false)

  const { sections, runSection, loadDashboard } = useAdminDashboardData({
    fromDate,
    toDate,
  })

  const dateValidation = useMemo(() => isValidDateRange(filterFromDate, filterToDate), [filterFromDate, filterToDate])
  const appliedDateValidation = useMemo(() => isValidDateRange(fromDate, toDate), [fromDate, toDate])

  useEffect(() => {
    if (!appliedDateValidation.valid) {
      setValidationError(appliedDateValidation.message)
      return
    }

    void loadDashboard()
  }, [appliedDateValidation, loadDashboard])

  useEffect(() => {
    if (!appliedDateValidation.valid) return undefined

    const timerId = window.setInterval(() => {
      void runSection('liveSales')
      void runSection('systemStatus')
    }, 30000)

    return () => {
      window.clearInterval(timerId)
    }
  }, [appliedDateValidation.valid, runSection])

  const keyMetrics = pdfOverride?.keyMetrics || sections.keyMetrics.data || {}
  const trendSeries = pdfOverride
    ? listByKey(pdfOverride.revenueTrend, 'series')
    : listByKey(sections.revenueTrend.data, 'series')
  const topMovies = pdfOverride?.topMovies || listByKey(sections.topMovies.data, 'topMovies')
  const topExtraServices = pdfOverride?.topExtraServices || listByKey(sections.topExtraServices.data, 'topExtraServices')
  const auditoriumRows = pdfOverride?.auditoriumPerformance || listByKey(sections.auditoriumPerformance.data, 'auditoriums')
  const heatmapRows = listByKey(sections.showtimeHeatmap.data, 'heatmap')
  const liveSales = listByKey(sections.liveSales.data, 'liveSales')
  const breakdown = pdfOverride?.revenueBreakdown || sections.revenueBreakdown.data || {}
  const forecast = sections.nextWeekForecast.data || {}
  const systemStatus = sections.systemStatus.data || {}

  const normalizedTrend = useMemo(() => {
    return trendSeries.map((item, index) => ({
      label: formatTrendLabel(item.period, index),
      revenue: toNumber(item.revenue),
    }))
  }, [trendSeries])

  const topMoviesChart = useMemo(() => {
    return topMovies.slice(0, 5).map((item) => ({
      title: item.title || 'N/A',
      revenue: toNumber(item.revenue),
      soldTickets: toNumber(item.soldTickets),
    }))
  }, [topMovies])

  const breakdownChart = useMemo(() => {
    return [
      { name: 'Vé', value: toNumber(breakdown.ticketRevenue) },
      { name: 'Dịch vụ thêm', value: toNumber(breakdown.extraServiceRevenue) },
    ].filter((item) => item.value > 0)
  }, [breakdown])

  const kpiCards = [
    {
      label: 'Doanh thu',
      value: formatCurrencyVND(keyMetrics.revenue),
      note: 'Trong khoảng ngày đã lọc',
    },
    {
      label: 'Vé đã bán',
      value: formatInteger(keyMetrics.soldTickets),
      note: 'Tất cả suất chiếu',
    },
    {
      label: 'Tỷ lệ lấp đầy',
      value: formatPercent(keyMetrics.occupancyRate),
      note: 'Trung bình theo sức chứa',
    },
    {
      label: 'Tổng đơn hàng',
      value: formatInteger(keyMetrics.totalBookings),
      note: 'Bao gồm mọi trạng thái',
    },
  ]

  const auditoriumStatus = systemStatus.auditoriumStatus || {}
  const generatedAt = systemStatus.generatedAt

  const handleApplyFilter = async () => {
    const validRange = isValidDateRange(filterFromDate, filterToDate)
    if (!validRange.valid) {
      setValidationError(validRange.message)
      return
    }

    setValidationError('')

    const isSameRange = fromDate === filterFromDate && toDate === filterToDate
    if (isSameRange) {
      await loadDashboard()
      return
    }

    setFromDate(filterFromDate)
    setToDate(filterToDate)
  }

  const buildFallbackTransactions = () => {
    return liveSales.map((sale) => ({
      bookingId: sale.bookingId,
      createdAt: sale.createdAt,
      customerName: sale.customerName,
      grandTotalPrice: sale.grandTotalPrice ?? sale.totalAmount,
      status: 'SUCCESS',
    }))
  }

  const handleExportExcel = async () => {
    setExportError('')
    setExportingExcel(true)

    try {
      const validMonth = isValidYearMonth(year, month)
      if (!validMonth.valid) {
        setExportError(validMonth.message)
        return
      }

      const { fromDate: excelFromDate, toDate: excelToDate } = monthRangeByYearMonth(year, month)
      const excelPayload = await runSection('excelData', {
        fromDate: excelFromDate,
        toDate: excelToDate,
      })

      const transactions = listByKey(excelPayload, 'transactions')
      const sourceTransactions = transactions.length ? transactions : buildFallbackTransactions()

      await exportDashboardExcel({
        fileName: `admin-dashboard-${year}-${String(month).padStart(2, '0')}.xlsx`,
        transactions: sourceTransactions,
        kpiSummary: [
          { metric: 'Doanh thu', value: keyMetrics.revenue },
          { metric: 'Vé đã bán', value: keyMetrics.soldTickets },
          { metric: 'Tỷ lệ lấp đầy (%)', value: normalizePercent(keyMetrics.occupancyRate) },
          { metric: 'Tổng đơn hàng', value: keyMetrics.totalBookings },
          { metric: 'Từ ngày', value: excelFromDate },
          { metric: 'Đến ngày', value: excelToDate },
        ],
        topMovies: topMoviesChart,
        topExtraServices: topExtraServices.map((item) => ({
          name: item.name,
          soldQuantity: item.soldQuantity,
          revenue: item.revenue,
        })),
      })
    } catch (error) {
      setExportError(error?.message || 'Không thể xuất Excel. Vui lòng thử lại.')
    } finally {
      setExportingExcel(false)
    }
  }

  const handleExportPdf = async () => {
    setExportError('')
    setExportingPdf(true)

    try {
      const validMonth = isValidYearMonth(year, month)
      if (!validMonth.valid) {
        setExportError(validMonth.message)
        return
      }

      const summaryPayload = await runSection('pdfSummary', { year, month })

      if (summaryPayload) {
        setPdfOverride(summaryPayload)
      }

      await exportDashboardPdf({
        summaryData: summaryPayload,
        year,
        month,
        fileName: `admin-dashboard-${year}-${String(month).padStart(2, '0')}.pdf`,
      })
    } catch (error) {
      setExportError(error?.message || 'Không thể xuất PDF. Vui lòng thử lại.')
    } finally {
      setPdfOverride(null)
      setExportingPdf(false)
    }
  }

  return (
    <section className="admin-dashboard">
      <div className="dashboard-toolbar">
        <button
          type="button"
          className="btn-overview-toggle"
          onClick={() => setShowOverview((prev) => !prev)}
        >
          {showOverview ? 'Ẩn tổng quan' : 'Hiện tổng quan'}
        </button>
        <button
          type="button"
          className="btn-overview-toggle"
          onClick={() => setShowHeroBar((prev) => !prev)}
        >
          {showHeroBar ? 'Ẩn bộ lọc & xuất file' : 'Hiện bộ lọc & xuất file'}
        </button>
      </div>

      {showHeroBar ? (
        <div className="dashboard-hero">
          <div className="dashboard-heading">
            <h2>Tổng quan Admin Dashboard</h2>
            <p>Dữ liệu theo thời gian thực, có biểu đồ và xuất báo cáo miễn phí.</p>
          </div>

          <div className="dashboard-filters dashboard-filters-6">
            <div className="filter-item">
              <label>Từ ngày</label>
              <input type="date" value={filterFromDate} onChange={(e) => setFilterFromDate(e.target.value)} />
            </div>

            <div className="filter-item">
              <label>Đến ngày</label>
              <input type="date" value={filterToDate} onChange={(e) => setFilterToDate(e.target.value)} />
            </div>

            <div className="filter-item">
              <label>Năm PDF</label>
              <input
                type="number"
                min="2000"
                max="2100"
                value={year}
                onChange={(e) => setYear(toNumber(e.target.value))}
              />
            </div>

            <div className="filter-item">
              <label>Tháng PDF</label>
              <input
                type="number"
                min="1"
                max="12"
                value={month}
                onChange={(e) => setMonth(toNumber(e.target.value))}
              />
            </div>

            <div className="filter-item filter-action">
              <button type="button" className="btn-refresh" onClick={handleApplyFilter}>Làm mới</button>
            </div>

            <div className="filter-item export-row">
              <button type="button" className="btn-export" onClick={handleExportExcel} disabled={exportingExcel}>
                {exportingExcel ? 'Đang xuất Excel...' : 'Xuất Excel'}
              </button>
              <button type="button" className="btn-export" onClick={handleExportPdf} disabled={exportingPdf}>
                {exportingPdf ? 'Đang xuất PDF...' : 'Xuất PDF'}
              </button>
            </div>
          </div>

          {validationError ? <p className="form-error">{validationError}</p> : null}
          {exportError ? <p className="form-error">{exportError}</p> : null}
          <p className="panel-sub">Lưu ý: Excel và PDF xuất theo toàn bộ tháng đã chọn, còn dashboard hiển thị theo khoảng ngày đang lọc.</p>
        </div>
      ) : null}

      {showOverview ? (
        <div className="metrics-grid">
          <SectionState section={sections.keyMetrics} onRetry={() => runSection('keyMetrics')} emptyText="Chưa có KPI.">
            {kpiCards.map((item) => (
              <article className="metric-card" key={item.label}>
                <span className="metric-label">{item.label}</span>
                <strong className="metric-value">{item.value}</strong>
                <p className="metric-note">{item.note}</p>
              </article>
            ))}
          </SectionState>
        </div>
      ) : null}

      <div className="dashboard-grid">
        <article className="panel">
          <h3>Biểu đồ xu hướng doanh thu</h3>
          <p className="panel-sub">Dữ liệu doanh thu theo thời gian trong khoảng lọc.</p>
          <SectionState section={sections.revenueTrend} onRetry={() => runSection('revenueTrend')} emptyText="Không có dữ liệu trend.">
            {normalizedTrend.length ? (
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={normalizedTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrencyVND(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#ea580c" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="empty-hint">Không có điểm dữ liệu để vẽ biểu đồ.</p>
            )}
          </SectionState>
        </article>

        <article className="panel">
          <h3>Biểu đồ cơ cấu doanh thu</h3>
          <p className="panel-sub">Tỷ trọng doanh thu từ vé và dịch vụ thêm.</p>
          <SectionState section={sections.revenueBreakdown} onRetry={() => runSection('revenueBreakdown')} emptyText="Không có dữ liệu breakdown.">
            {breakdownChart.length ? (
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={breakdownChart} dataKey="value" nameKey="name" outerRadius={95} label>
                      {breakdownChart.map((entry, index) => (
                        <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrencyVND(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="empty-hint">Không có doanh thu để chia tỷ trọng.</p>
            )}
          </SectionState>
        </article>
      </div>

      <div className="dashboard-grid">
        <article className="panel">
          <h3>Top phim theo doanh thu</h3>
          <p className="panel-sub">Top 5 phim có doanh thu cao nhất.</p>
          <SectionState section={sections.topMovies} onRetry={() => runSection('topMovies')} emptyText="Không có top movies.">
            {topMoviesChart.length ? (
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={290}>
                  <BarChart data={topMoviesChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="title" hide />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrencyVND(value)} />
                    <Legend />
                    <Bar dataKey="revenue" name="Doanh thu" fill="#2563eb" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="empty-hint">Chưa có dữ liệu top movies.</p>
            )}
            <div className="kpi-columns">
              {topMoviesChart.map((item) => (
                <div key={item.title} className="kpi-row">
                  <strong>{item.title}</strong>
                  <span>{formatCurrencyVND(item.revenue)}</span>
                </div>
              ))}
            </div>
          </SectionState>
        </article>

        <article className="panel">
          <h3>Heatmap suất chiếu & Top dịch vụ thêm</h3>
          <p className="panel-sub">Khung giờ bán chạy trong tuần và các dịch vụ thêm được mua nhiều nhất.</p>
          <SectionState section={sections.showtimeHeatmap} onRetry={() => runSection('showtimeHeatmap')} emptyText="Không có dữ liệu heatmap.">
            <div className="pill-list">
              {heatmapRows.slice(0, 12).map((item, index) => (
                <span className="pill" key={`${item.dayOfWeek}-${item.hour}-${index}`}>
                  {item.dayOfWeek} {item.hour}:00
                  <strong>{formatInteger(item.soldTickets)}</strong>
                </span>
              ))}
            </div>
          </SectionState>

          <h3 style={{ marginTop: 18 }}>Top dịch vụ thêm</h3>
          <SectionState section={sections.topExtraServices} onRetry={() => runSection('topExtraServices')} emptyText="Không có top extra services.">
            <div className="pill-list">
              {topExtraServices.map((item) => (
                <span className="pill" key={item.extraServiceId || item.name}>
                  {item.name}
                  <strong>{formatInteger(item.soldQuantity)}</strong>
                </span>
              ))}
            </div>
          </SectionState>
        </article>
      </div>

      <div className="dashboard-grid">
        <article className="panel">
          <h3>Realtime và trạng thái hệ thống</h3>
          <p className="panel-sub">Theo dõi giao dịch gần nhất và trạng thái hệ thống.</p>

          <SectionState section={sections.liveSales} onRetry={() => runSection('liveSales')} emptyText="Không có dữ liệu live sales.">
            <div className="pill-list">
              <span className="pill">Giao dịch 30 phút <strong>{formatInteger(liveSales.length)}</strong></span>
              <span className="pill">Dự báo tuần tới <strong>{formatCurrencyVND(forecast.predictedRevenue)}</strong></span>
            </div>
          </SectionState>

          <SectionState section={sections.systemStatus} onRetry={() => runSection('systemStatus')} emptyText="Không có dữ liệu trạng thái hệ thống.">
            <p className="panel-sub" style={{ marginTop: 10 }}>
              Số phòng theo trạng thái vận hành, không phải số giao dịch.
            </p>
            <div className="kpi-columns">
              {Object.entries(auditoriumStatus).map(([status, count]) => (
                <div className="kpi-row" key={status}>
                  <span>{formatAuditoriumStatusLabel(status)}</span>
                  <strong>{formatInteger(count)}</strong>
                </div>
              ))}
            </div>
            <p className="panel-sub">Cập nhật: {formatDateTimeVi(generatedAt)}</p>
          </SectionState>
        </article>

        <article className="panel">
          <h3>Hiệu suất phòng chiếu</h3>
          <SectionState section={sections.auditoriumPerformance} onRetry={() => runSection('auditoriumPerformance')} emptyText="Không có dữ liệu phòng chiếu.">
            <p className="panel-sub">Khoảng lọc hiện tại: {fromDate} đến {toDate}</p>
            <div className="kpi-columns">
              {auditoriumRows.slice(0, 6).map((item) => (
                <div className="kpi-row" key={item.auditoriumId || item.name}>
                  <span>{item.name}</span>
                  <strong>{formatOccupancyDetailed(item.occupancyRate)}</strong>
                </div>
              ))}
            </div>
          </SectionState>
        </article>
      </div>
    </section>
  )
}

export default AdminDashboard
