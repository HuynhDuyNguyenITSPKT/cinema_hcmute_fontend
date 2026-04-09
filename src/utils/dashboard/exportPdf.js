import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'

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

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [28, 30, 28, 30],
    content: [
      { text: 'BÁO CÁO TỔNG QUAN ADMIN', style: 'title' },
      { text: `Tháng: ${String(month).padStart(2, '0')}/${year}`, style: 'subtitle', margin: [0, 2, 0, 14] },

      { text: 'Chỉ số KPI', style: 'sectionHeader' },
      {
        table: {
          widths: ['*', '*'],
          body: [
            ['Doanh thu', currency(keyMetrics.revenue)],
            ['Vé đã bán', integer(keyMetrics.soldTickets)],
            ['Tỷ lệ lấp đầy', `${keyMetrics.occupancyRate ?? 0}%`],
            ['Tổng đơn hàng', integer(keyMetrics.totalBookings)],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 2, 0, 12],
      },

      { text: 'Top phim', style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: [26, '*', 90],
          body: [
            ['#', 'Tên phim', 'Doanh thu'],
            ...topMovies.slice(0, 10).map((item, index) => [
              String(index + 1),
              item.title || 'N/A',
              currency(item.revenue),
            ]),
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 2, 0, 12],
      },

      { text: 'Top dịch vụ thêm', style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: [26, '*', 72, 72],
          body: [
            ['#', 'Dịch vụ', 'Số lượng', 'Doanh thu'],
            ...topExtraServices.slice(0, 10).map((item, index) => [
              String(index + 1),
              item.name || 'N/A',
              integer(item.soldQuantity),
              currency(item.revenue),
            ]),
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 2, 0, 12],
      },

      { text: 'Hiệu suất phòng chiếu', style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: [26, '*', 72],
          body: [
            ['#', 'Phòng', 'Occupancy'],
            ...auditoriumPerformance.slice(0, 12).map((item, index) => [
              String(index + 1),
              item.name || 'N/A',
              `${item.occupancyRate ?? 0}%`,
            ]),
          ],
        },
        layout: 'lightHorizontalLines',
      },
    ],
    styles: {
      title: {
        fontSize: 16,
        bold: true,
        color: '#111827',
      },
      subtitle: {
        fontSize: 11,
        color: '#4b5563',
      },
      sectionHeader: {
        fontSize: 12,
        bold: true,
        color: '#0f172a',
        margin: [0, 6, 0, 4],
      },
    },
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
    },
  }

  await new Promise((resolve, reject) => {
    try {
      pdfMake.createPdf(docDefinition).download(fileName, resolve)
    } catch (error) {
      reject(error)
    }
  })
}
