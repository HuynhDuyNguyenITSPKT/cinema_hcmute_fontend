class MovieBuilder {
  constructor() {
    this._data = {
      title: '',
      description: '',
      director: '',
      cast: '',
      durationMinutes: 0,
      releaseDate: '',
      posterUrl: '',
      trailerUrl: '',
      ageRating: '',
      status: 'COMING_SOON',
      genreIds: [],
    }
  }

  setTitle(v) { this._data.title = String(v || '').trim(); return this }
  setDescription(v) { this._data.description = String(v || '').trim(); return this }
  setDirector(v) { this._data.director = String(v || '').trim(); return this }
  setCast(v) { this._data.cast = String(v || '').trim(); return this }
  setDurationMinutes(v) { this._data.durationMinutes = Number(v) || 0; return this }
  setReleaseDate(v) { this._data.releaseDate = v || ''; return this }
  setPosterUrl(v) { this._data.posterUrl = String(v || '').trim(); return this }
  setTrailerUrl(v) { this._data.trailerUrl = String(v || '').trim(); return this }
  setAgeRating(v) { this._data.ageRating = String(v || '').trim(); return this }
  setStatus(v) { this._data.status = v || 'COMING_SOON'; return this }
  setGenreIds(ids) { this._data.genreIds = Array.isArray(ids) ? ids : []; return this }

  validate() {
    const errors = []
    if (!this._data.title) errors.push('Tên phim không được để trống.')
    if (this._data.durationMinutes <= 0) errors.push('Thời lượng phải lớn hơn 0 phút.')
    if (!this._data.releaseDate) errors.push('Ngày khởi chiếu không được để trống.')
    if (!this._data.ageRating) errors.push('Độ tuổi quy định không được để trống.')
    if (!this._data.status) errors.push('Trạng thái phim không được để trống.')
    return errors
  }

  build() {
    const errors = this.validate()
    if (errors.length > 0) throw new Error(errors.join(' '))
    return { ...this._data }
  }
}

export function buildMovieFromForm(form) {
  return new MovieBuilder()
    .setTitle(form.title)
    .setDescription(form.description)
    .setDirector(form.director)
    .setCast(form.cast)
    .setDurationMinutes(form.durationMinutes)
    .setReleaseDate(form.releaseDate)
    .setPosterUrl(form.posterUrl)
    .setTrailerUrl(form.trailerUrl)
    .setAgeRating(form.ageRating)
    .setStatus(form.status)
    .setGenreIds(form.genreIds)
    .build()
}

export { MovieBuilder }
