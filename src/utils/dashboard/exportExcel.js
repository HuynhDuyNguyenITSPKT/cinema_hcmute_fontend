import ExcelJS from 'exceljs'

function normalizeRows(value) {
  return Array.isArray(value) ? value : []
}

function toRowValues(items, columns) {
  return items.map((item) => columns.map((col) => (item?.[col.key] ?? '')))
}

function autoSizeColumns(worksheet, min = 12, max = 42) {
  worksheet.columns.forEach((column) => {
    let widest = min

    column.eachCell({ includeEmpty: true }, (cell) => {
      const raw = cell.value
      const text = raw == null
        ? ''
        : typeof raw === 'object' && raw.richText
          ? raw.richText.map((part) => part.text).join('')
          : String(raw)
      widest = Math.max(widest, Math.min(max, text.length + 2))
    })

    column.width = widest
  })
}

function styleHeaderRow(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' },
    }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    }
  })
}

function styleDataRows(worksheet, fromRow, toRow) {
  for (let r = fromRow; r <= toRow; r += 1) {
    const row = worksheet.getRow(r)
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', horizontal: 'left' }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      }
    })
  }
}

function buildSheet(workbook, sheetName, title, rows, columns) {
  const worksheet = workbook.addWorksheet(sheetName)
  const headers = columns.map((col) => col.header)
  const values = toRowValues(normalizeRows(rows), columns)

  worksheet.columns = columns.map((col) => ({ key: col.key, header: col.header }))

  worksheet.mergeCells(1, 1, 1, headers.length)
  const titleCell = worksheet.getCell(1, 1)
  titleCell.value = title
  titleCell.font = { bold: true, size: 15, color: { argb: 'FF0F172A' } }
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' }

  worksheet.mergeCells(2, 1, 2, headers.length)
  const subtitleCell = worksheet.getCell(2, 1)
  subtitleCell.value = `Generated at: ${new Date().toLocaleString('vi-VN')}`
  subtitleCell.font = { italic: true, size: 10, color: { argb: 'FF64748B' } }
  subtitleCell.alignment = { horizontal: 'left', vertical: 'middle' }

  const headerRow = worksheet.getRow(4)
  headerRow.values = headers
  styleHeaderRow(headerRow)

  values.forEach((rowValues, index) => {
    worksheet.getRow(5 + index).values = rowValues
  })

  const endDataRow = 4 + Math.max(values.length, 1)
  styleDataRows(worksheet, 5, endDataRow)
  worksheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: headers.length },
  }

  worksheet.views = [{ state: 'frozen', ySplit: 4 }]
  autoSizeColumns(worksheet)
}

function downloadWorkbookBuffer(buffer, fileName) {
  const blob = new Blob([
    buffer,
  ], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName || 'admin-dashboard-report.xlsx'
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function exportDashboardExcel({
  fileName,
  transactions,
  kpiSummary,
  topMovies,
  topExtraServices,
}) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Cinema HCMUTE Admin Dashboard'
  workbook.created = new Date()

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

  buildSheet(workbook, 'Transactions', 'Danh sach giao dich', transactions, transactionCols)
  buildSheet(workbook, 'KPI Summary', 'Tong hop KPI', kpiSummary, kpiCols)
  buildSheet(workbook, 'Top Movies', 'Top phim theo doanh thu', topMovies, movieCols)
  buildSheet(workbook, 'Top Extra Services', 'Top dich vu them', topExtraServices, extraCols)

  const buffer = await workbook.xlsx.writeBuffer()
  downloadWorkbookBuffer(buffer, fileName || 'admin-dashboard-report.xlsx')
}
