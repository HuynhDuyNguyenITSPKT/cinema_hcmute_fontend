import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import { normalizePercent } from './formatters'

pdfMake.vfs = pdfFonts.vfs

function numberValue(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function currency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(numberValue(value))
}

function integer(value) {
  return new Intl.NumberFormat('vi-VN').format(numberValue(value))
}

function percent(value) {
  return `${normalizePercent(value).toFixed(2)}%`
}

function headerCell(text) {
  return {
    text,
    style: 'tableHeader',
  }
}

function zebraFillColor(rowIndex) {
  if (rowIndex === 0) return '#1e3a8a'
  return rowIndex % 2 === 0 ? '#f8fafc' : null
}

/**
 * Export monthly summary data (from /reports/pdf-summary) to A4 PDF with Vietnamese support.
 */
export async function exportDashboardPdf({
  summaryData,
  year,
  month,
  fileName = 'admin-dashboard-report.pdf',
}) {
  if (!summaryData || typeof summaryData !== 'object') {
    throw new Error('Không có dữ liệu tổng hợp tháng để xuất PDF.')
  }

  const keyMetrics = summaryData.keyMetrics || {}
  const topMovies = Array.isArray(summaryData.topMovies) ? summaryData.topMovies : []
  const topExtraServices = Array.isArray(summaryData.topExtraServices) ? summaryData.topExtraServices : []
  const auditoriumPerformance = Array.isArray(summaryData.auditoriumPerformance)
    ? summaryData.auditoriumPerformance
    : []

  const generatedAt = new Date().toLocaleString('vi-VN')

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [28, 30, 28, 30],
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: `Generated: ${generatedAt}`, alignment: 'left', style: 'footerText' },
        { text: `Trang ${currentPage}/${pageCount}`, alignment: 'right', style: 'footerText' },
      ],
      margin: [28, 0, 28, 16],
    }),
    content: [
      {
        table: {
          widths: ['*', 'auto'],
          body: [[
            {
              stack: [
                { text: 'CINEMA HCMUTE', style: 'brand' },
                { text: 'BAO CAO TONG QUAN ADMIN', style: 'title' },
                { text: `Ky bao cao: Thang ${String(month).padStart(2, '0')}/${year}`, style: 'subtitle' },
              ],
              border: [false, false, false, false],
            },
            {
              text: 'CONFIDENTIAL',
              style: 'badge',
              border: [false, false, false, false],
              margin: [0, 12, 0, 0],
            },
          ]],
        },
        layout: {
          fillColor: () => '#eff6ff',
          paddingLeft: () => 14,
          paddingRight: () => 14,
          paddingTop: () => 12,
          paddingBottom: () => 12,
        },
        margin: [0, 0, 0, 16],
      },

      { text: 'Chỉ số KPI', style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: ['*', '*'],
          body: [
            [headerCell('Chi so'), headerCell('Gia tri')],
            ['Doanh thu', currency(keyMetrics.revenue)],
            ['Vé đã bán', integer(keyMetrics.soldTickets)],
            ['Tỷ lệ lấp đầy', percent(keyMetrics.occupancyRate)],
            ['Tổng đơn hàng', integer(keyMetrics.totalBookings)],
          ],
        },
        layout: {
          fillColor: (rowIndex) => zebraFillColor(rowIndex),
          hLineColor: () => '#dbeafe',
          vLineColor: () => '#dbeafe',
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
        margin: [0, 2, 0, 14],
      },

      { text: 'Top phim', style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: [26, '*', 90],
          body: [
            [headerCell('#'), headerCell('Ten phim'), headerCell('Doanh thu')],
            ...topMovies.slice(0, 10).map((item, index) => [
              String(index + 1),
              item.title || 'N/A',
              currency(item.revenue),
            ]),
          ],
        },
        layout: {
          fillColor: (rowIndex) => zebraFillColor(rowIndex),
          hLineColor: () => '#dbeafe',
          vLineColor: () => '#dbeafe',
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
        margin: [0, 2, 0, 14],
      },

      { text: 'Top dịch vụ thêm', style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: [26, '*', 72, 72],
          body: [
            [headerCell('#'), headerCell('Dich vu'), headerCell('So luong'), headerCell('Doanh thu')],
            ...topExtraServices.slice(0, 10).map((item, index) => [
              String(index + 1),
              item.name || 'N/A',
              integer(item.soldQuantity),
              currency(item.revenue),
            ]),
          ],
        },
        layout: {
          fillColor: (rowIndex) => zebraFillColor(rowIndex),
          hLineColor: () => '#dbeafe',
          vLineColor: () => '#dbeafe',
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
        margin: [0, 2, 0, 14],
      },

      { text: 'Hiệu suất phòng chiếu', style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: [26, '*', 72],
          body: [
            [headerCell('#'), headerCell('Phong'), headerCell('Occupancy')],
            ...auditoriumPerformance.slice(0, 12).map((item, index) => [
              String(index + 1),
              item.name || 'N/A',
              percent(item.occupancyRate),
            ]),
          ],
        },
        layout: {
          fillColor: (rowIndex) => zebraFillColor(rowIndex),
          hLineColor: () => '#dbeafe',
          vLineColor: () => '#dbeafe',
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
      },
    ],
    styles: {
      brand: {
        fontSize: 10,
        bold: true,
        color: '#1d4ed8',
      },
      title: {
        fontSize: 18,
        bold: true,
        color: '#0f172a',
        margin: [0, 3, 0, 3],
      },
      subtitle: {
        fontSize: 11,
        color: '#334155',
      },
      sectionHeader: {
        fontSize: 12,
        bold: true,
        color: '#0f172a',
        margin: [0, 7, 0, 5],
      },
      tableHeader: {
        bold: true,
        color: '#ffffff',
        fontSize: 10,
      },
      badge: {
        color: '#1e3a8a',
        bold: true,
        fontSize: 9,
      },
      footerText: {
        fontSize: 8,
        color: '#64748b',
      },
    },
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
    },
  }

  try {
    pdfMake.createPdf(docDefinition).download(fileName)
  } catch (error) {
    throw error
  }
}
