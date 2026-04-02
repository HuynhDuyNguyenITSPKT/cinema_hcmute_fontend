import { useEffect, useState } from 'react'
import userService from '../services/userService'
import { notifyError, notifySuccess } from '../utils/notify'

const PAGE_SIZE = 10

function buildPagination(currentPage, totalPages) {
  if (totalPages <= 0) {
    return []
  }

  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx)
  }

  const pages = [0]
  const start = Math.max(1, currentPage - 1)
  const end = Math.min(totalPages - 2, currentPage + 1)

  if (start > 1) {
    pages.push('ellipsis-left')
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }

  if (end < totalPages - 2) {
    pages.push('ellipsis-right')
  }

  pages.push(totalPages - 1)
  return pages
}

function AdminUsers() {
  const [inputKeyword, setInputKeyword] = useState('')
  const [keyword, setKeyword] = useState('')
  const [pageData, setPageData] = useState({
    currentItems: [],
    currentPage: 0,
    totalPages: 0,
    totalItems: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [updatingUserId, setUpdatingUserId] = useState(null)

  const fetchUsers = async (page = 0, searchKeyword = keyword) => {
    setLoading(true)
    setError('')

    try {
      const response = await userService.getPageable({
        page,
        size: PAGE_SIZE,
        keyword: searchKeyword,
      })
      const data = response?.data || {}

      setPageData({
        currentItems: data.currentItems || [],
        currentPage: data.currentPage || 0,
        totalPages: data.totalPages || 0,
        totalItems: data.totalItems || 0,
      })
    } catch (err) {
      setError(err?.message || 'Không thể lấy danh sách users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers(0, '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    const trimmed = inputKeyword.trim()
    setKeyword(trimmed)
    fetchUsers(0, trimmed)
  }

  const handlePageChange = (nextPage) => {
    if (nextPage < 0 || nextPage >= pageData.totalPages) {
      return
    }

    fetchUsers(nextPage, keyword)
  }

  const handleToggleStatus = async (user) => {
    if (!user?.userId) {
      return
    }

    const nextActive = !Boolean(user.active)
    setUpdatingUserId(user.userId)

    try {
      const response = await userService.updateStatus(user.userId, nextActive)

      setPageData((prev) => ({
        ...prev,
        currentItems: prev.currentItems.map((item) =>
          item.userId === user.userId
            ? {
                ...item,
                active: response?.data?.active ?? nextActive,
              }
            : item
        ),
      }))

      notifySuccess(response?.message || 'Cập nhật trạng thái tài khoản thành công.')
    } catch (err) {
      notifyError(err?.message || 'Cập nhật trạng thái tài khoản thất bại.')
    } finally {
      setUpdatingUserId(null)
    }
  }

  const paginationItems = buildPagination(pageData.currentPage, pageData.totalPages)
  const activeUsers = pageData.currentItems.filter((item) => Boolean(item.active)).length
  const inactiveUsers = pageData.currentItems.length - activeUsers

  return (
    <section className="container-fluid px-2 px-md-3 px-xl-4">
      <div className="card border-0 shadow-sm">
        <div className="card-body p-3 p-md-4">
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
            <div>
              <h2 className="h4 mb-1">Quản lý người dùng</h2>
              <p className="text-secondary mb-0">Danh sách tài khoản trong hệ thống (ADMIN).</p>
            </div>
            <span className="badge text-bg-dark px-3 py-2 rounded-pill">Tổng: {pageData.totalItems} tài khoản</span>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-12 col-md-6 col-xl-3">
              <div className="card h-100 border-light-subtle bg-primary-subtle">
                <div className="card-body">
                  <p className="small text-secondary mb-1">Trang hiện tại</p>
                  <p className="h4 mb-0">{pageData.currentPage + 1}</p>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <div className="card h-100 border-light-subtle bg-success-subtle">
                <div className="card-body">
                  <p className="small text-secondary mb-1">Đang hoạt động</p>
                  <p className="h4 mb-0 text-success">{activeUsers}</p>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <div className="card h-100 border-light-subtle bg-warning-subtle">
                <div className="card-body">
                  <p className="small text-secondary mb-1">Đang vô hiệu hóa</p>
                  <p className="h4 mb-0 text-warning-emphasis">{inactiveUsers}</p>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <div className="card h-100 border-light-subtle bg-info-subtle">
                <div className="card-body">
                  <p className="small text-secondary mb-1">Tổng số trang</p>
                  <p className="h4 mb-0 text-info-emphasis">{Math.max(pageData.totalPages, 1)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card border-light-subtle mb-3">
            <div className="card-body">
              <form className="row g-2 g-md-3 align-items-center" onSubmit={handleSearch}>
                <div className="col-12 col-lg-8">
                  <input
                    type="text"
                    className="form-control"
                    value={inputKeyword}
                    onChange={(e) => setInputKeyword(e.target.value)}
                    placeholder="Tìm theo username / email"
                  />
                </div>
                <div className="col-12 col-lg-4 d-grid d-lg-flex justify-content-lg-end gap-2">
                  <button className="btn btn-primary" type="submit" disabled={loading}>
                    {loading ? 'Đang tìm...' : 'Tìm kiếm'}
                  </button>
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => {
                      setInputKeyword('')
                      setKeyword('')
                      fetchUsers(0, '')
                    }}
                    disabled={loading}
                  >
                    Làm mới
                  </button>
                </div>
              </form>
            </div>
          </div>

          {error ? <div className="alert alert-danger py-2 px-3">{error}</div> : null}

          <div className="table-responsive border rounded-3 bg-white">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="text-center" style={{ width: '72px' }}>STT</th>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Trạng thái</th>
                  <th className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {!loading && pageData.currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center text-secondary py-4">
                      Không có dữ liệu.
                    </td>
                  </tr>
                ) : null}

                {pageData.currentItems.map((item, index) => (
                  <tr key={item.userId}>
                    <td className="text-center fw-semibold">{pageData.currentPage * PAGE_SIZE + index + 1}</td>
                    <td>{item.userId ?? '-'}</td>
                    <td className="fw-semibold">{item.username}</td>
                    <td>{item.fullName}</td>
                    <td>{item.email}</td>
                    <td>
                      <span className="badge text-bg-secondary">{item.role}</span>
                    </td>
                    <td>
                      <span className={`badge ${item.active ? 'text-bg-success' : 'text-bg-warning'}`}>
                        {item.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className={`btn btn-sm ${item.active ? 'btn-outline-danger' : 'btn-outline-success'}`}
                        onClick={() => handleToggleStatus(item)}
                        disabled={updatingUserId === item.userId}
                      >
                        {updatingUserId === item.userId
                          ? 'Đang cập nhật...'
                          : item.active
                            ? 'Vô hiệu hóa'
                            : 'Kích hoạt'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mt-3">
            <p className="text-secondary mb-0">
              Trang {pageData.currentPage + 1} / {Math.max(pageData.totalPages, 1)} - Tổng bản ghi: {pageData.totalItems}
            </p>

            <div className="d-flex flex-wrap gap-2 align-items-center">
              <button
                className="btn btn-outline-secondary btn-sm"
                type="button"
                onClick={() => handlePageChange(pageData.currentPage - 1)}
                disabled={loading || pageData.currentPage <= 0}
              >
                Trước
              </button>

              {paginationItems.map((item, index) => {
                if (typeof item !== 'number') {
                  return (
                    <span className="text-secondary px-1" key={`${item}-${index}`}>
                      ...
                    </span>
                  )
                }

                return (
                  <button
                    key={item}
                    className={`btn btn-sm ${item === pageData.currentPage ? 'btn-primary' : 'btn-outline-secondary'}`}
                    type="button"
                    onClick={() => handlePageChange(item)}
                    disabled={loading}
                  >
                    {item + 1}
                  </button>
                )
              })}

              <button
                className="btn btn-outline-secondary btn-sm"
                type="button"
                onClick={() => handlePageChange(pageData.currentPage + 1)}
                disabled={
                  loading ||
                  pageData.totalPages === 0 ||
                  pageData.currentPage >= pageData.totalPages - 1
                }
              >
                Sau
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AdminUsers
