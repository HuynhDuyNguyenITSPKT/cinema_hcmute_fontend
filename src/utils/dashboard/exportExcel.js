import * as XLSX from 'xlsx'

function normalizeRows(value) {
  return Array.isArray(value) ? value : []
}

function withColumnWidths(rows, headers) {
  const widths = []

  headers.forEach((header, index) => {
    widths[index] = Math.max(widths[index] || 10, Math.min(50, String(header).length + 4))
  })

  rows.forEach((row) => {
    row.forEach((cell, index) => {
      const text = String(cell ?? '')
      widths[index] = Math.max(widths[index] || 10, Math.min(50, text.length + 2))
    })
  })

  return widths.map((wch) => ({ wch }))
}

function toRowValues(items, columns) {
  return items.map((item) => columns.map((col) => (item?.[col.key] ?? '')))
}

function makeSheet(rows, columns) {
  const headers = columns.map((col) => col.header)
  const values = toRowValues(normalizeRows(rows), columns)
  const data = [headers, ...values]

  const sheet = XLSX.utils.aoa_to_sheet(data)
  sheet['!cols'] = withColumnWidths(data, headers)
  sheet['!autofilter'] = { ref: `A1:${String.fromCharCode(64 + headers.length)}1` }

  return sheet
}

export function exportDashboardExcel({
  fileName,
  transactions,
  kpiSummary,
  topMovies,
  topExtraServices,
}) {
  const wb = XLSX.utils.book_new()

  const transactionCols = [
    { key: 'bookingId', header: 'Mã đặt vé' },
    { key: 'createdAt', header: 'Thời gian tạo' },
    { key: 'customerName', header: 'Khách hàng' },
    { key: 'customerEmail', header: 'Email' },
    { key: 'totalAmount', header: 'Tổng tiền' },
    { key: 'status', header: 'Trạng thái' },
    { key: 'promotionCode', header: 'Mã khuyến mãi' },
    { key: 'extraServiceAmount', header: 'Tiền dịch vụ thêm' },
  ]

  const kpiCols = [
    { key: 'metric', header: 'Chỉ số' },
    { key: 'value', header: 'Giá trị' },
  ]

  const movieCols = [
    { key: 'title', header: 'Phim' },
    { key: 'revenue', header: 'Doanh thu' },
    { key: 'soldTickets', header: 'Vé đã bán' },
  ]

  const extraCols = [
    { key: 'name', header: 'Dịch vụ thêm' },
    { key: 'soldQuantity', header: 'Số lượng bán' },
    { key: 'revenue', header: 'Doanh thu' },
  ]

  XLSX.utils.book_append_sheet(wb, makeSheet(transactions, transactionCols), 'Transactions')
  XLSX.utils.book_append_sheet(wb, makeSheet(kpiSummary, kpiCols), 'KPI Summary')
  XLSX.utils.book_append_sheet(wb, makeSheet(topMovies, movieCols), 'Top Movies')
  XLSX.utils.book_append_sheet(wb, makeSheet(topExtraServices, extraCols), 'Top Extra Services')

  XLSX.writeFile(wb, fileName || 'admin-dashboard-report.xlsx')
}
