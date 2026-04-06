import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import genreService from '../services/genreService'
import { notifyError, notifySuccess } from '../utils/notify'

const PAGE_SIZE = 10

const EMPTY_FORM = {
  name: '',
}

function normalizeForSearch(value) {
  return String(value || '').trim().toLowerCase()
}

function AdminGenres() {
  const [genres, setGenres] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [inputKeyword, setInputKeyword] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingLoadingId, setEditingLoadingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const fetchGenres = useCallback(async (targetPage = 0, kw = '') => {
    setLoading(true)
    setError('')

    try {
      const res = await genreService.getPageable({ page: targetPage, size: PAGE_SIZE, keyword: kw })
      const data = res?.data ?? {}
      setGenres(data.currentItems ?? [])
      setPage(data.currentPage ?? 0)
      setTotalPages(data.totalPages ?? 0)
      setTotalItems(data.totalItems ?? 0)
    } catch (err) {
      setError(err?.message ?? 'Không thể tải danh sách thể loại.')
      setGenres([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGenres(0, '')
  }, [fetchGenres])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowModal(true)
  }

  const openEdit = async (genre) => {
    if (!genre?.id) return

    setEditingLoadingId(genre.id)
    setFormError('')

    try {
      const res = await genreService.getById(genre.id)
      const detail = res?.data ?? genre

      setEditingId(detail.id)
      setForm({
        name: detail.name ?? '',
      })
      setShowModal(true)
    } catch (err) {
      notifyError(err?.message ?? 'Không thể tải thông tin thể loại.')
    } finally {
      setEditingLoadingId(null)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError('')
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setFormError('')

    const name = String(form.name || '').trim()

    if (!name) {
      setFormError('Tên thể loại không được để trống.')
      return
    }

    setSaving(true)

    try {
      const payload = { name }

      if (editingId) {
        const res = await genreService.update(editingId, payload)
        notifySuccess(res?.message ?? 'Cập nhật thể loại thành công.')
      } else {
        const res = await genreService.create(payload)
        notifySuccess(res?.message ?? 'Thêm thể loại thành công.')
      }

      closeModal()
      fetchGenres(page, keyword)
    } catch (err) {
      const message = err?.message ?? 'Lưu thể loại thất bại.'
      setFormError(message)
      notifyError(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (genre) => {
    if (!genre?.id) return

    const confirmed = window.confirm(`Xoá thể loại "${genre.name}"?`)

    if (!confirmed) return

    setDeletingId(genre.id)

    try {
      const res = await genreService.remove(genre.id)
      notifySuccess(res?.message ?? 'Xoá thể loại thành công.')

      const nextPage = genres.length === 1 && page > 0 ? page - 1 : page
      fetchGenres(nextPage, keyword)
    } catch (err) {
      notifyError(err?.message ?? 'Xoá thể loại thất bại.')
    } finally {
      setDeletingId(null)
    }
  }

  const normalizedKeyword = normalizeForSearch(keyword)
  const filteredGenres = normalizedKeyword
    ? genres.filter((genre) => normalizeForSearch(genre?.name).includes(normalizedKeyword))
    : genres

  const handleSearch = (event) => {
    event.preventDefault()
    const nextKeyword = inputKeyword.trim()
    setKeyword(nextKeyword)
    fetchGenres(0, nextKeyword)
  }

  const handleResetSearch = () => {
    setInputKeyword('')
    setKeyword('')
    fetchGenres(0, '')
  }

  return (
    <section className="container-fluid px-2 px-md-3 px-xl-4">
      <div className="card border-0 shadow-sm">
        <div className="card-body p-3 p-md-4">
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
            <div>
              <h2 className="h4 mb-1">Quản lý thể loại</h2>
              <p className="text-secondary mb-0">Tổng số thể loại trong hệ thống: {totalItems}</p>
            </div>
            <div className="d-flex gap-2">
              <Link to="/admin/movies" className="btn btn-outline-secondary">
                🎬 Quản lý phim
              </Link>
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                + Thêm thể loại
              </button>
            </div>
          </div>

          <form className="row g-2 mb-3" onSubmit={handleSearch}>
            <div className="col-12 col-md-6 col-lg-5">
              <input
                type="text"
                className="form-control"
                placeholder="Tìm theo tên thể loại..."
                value={inputKeyword}
                onChange={(event) => setInputKeyword(event.target.value)}
              />
            </div>
            <div className="col-auto d-flex gap-2">
              <button type="submit" className="btn btn-outline-primary" disabled={loading}>
                {loading ? 'Đang tìm...' : 'Tìm kiếm'}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleResetSearch}
                disabled={loading || (!keyword && !inputKeyword)}
              >
                Làm mới
              </button>
            </div>
          </form>

          {keyword && (
            <div className="small text-secondary mb-3">
              Kết quả cho "{keyword}": {filteredGenres.length} thể loại trên trang hiện tại.
            </div>
          )}

          {error && <div className="alert alert-danger py-2 px-3">{error}</div>}

          <div className="table-responsive border rounded-3 bg-white">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 48 }}>STT</th>
                  <th>Tên thể loại</th>
                  <th className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={3} className="text-center text-secondary py-4">Đang tải...</td>
                  </tr>
                )}

                {!loading && filteredGenres.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-secondary py-4">
                      {keyword ? 'Không tìm thấy thể loại phù hợp trên trang hiện tại.' : 'Không có dữ liệu.'}
                    </td>
                  </tr>
                )}

                {filteredGenres.map((genre, idx) => (
                  <tr key={genre.id}>
                    <td className="text-center">{page * PAGE_SIZE + idx + 1}</td>
                    <td className="fw-semibold">{genre.name ?? '-'}</td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary me-1"
                        onClick={() => openEdit(genre)}
                        disabled={editingLoadingId === genre.id}
                      >
                        {editingLoadingId === genre.id ? '...' : 'Sửa'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(genre)}
                        disabled={deletingId === genre.id}
                      >
                        {deletingId === genre.id ? '...' : 'Xoá'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <span className="text-secondary small">Trang {page + 1} / {totalPages}</span>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={loading || page <= 0}
                  onClick={() => fetchGenres(page - 1, keyword)}
                >
                  Trước
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={loading || page >= totalPages - 1}
                  onClick={() => fetchGenres(page + 1, keyword)}
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div
          className="modal d-block"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={(event) => event.target === event.currentTarget && closeModal()}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingId ? 'Sửa thể loại' : 'Thêm thể loại'}</h5>
                <button type="button" className="btn-close" onClick={closeModal} />
              </div>

              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <label className="form-label">Tên thể loại *</label>
                  <input
                    type="text"
                    className="form-control"
                    maxLength={100}
                    value={form.name}
                    onChange={(event) => setForm({ name: event.target.value })}
                    required
                  />

                  {formError && (
                    <div className="alert alert-danger py-2 px-3 small mt-3 mb-0">
                      {formError}
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Huỷ
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Thêm thể loại'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default AdminGenres