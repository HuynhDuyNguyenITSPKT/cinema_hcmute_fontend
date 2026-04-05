export function createGenreOption(genre) {
  return {
    value: genre?.id ?? '',
    label: genre?.name ?? 'Không rõ',
  }
}

export function createGenreOptions(genres) {
  if (!Array.isArray(genres)) return []
  return genres.map(createGenreOption)
}

export function createGenreMap(genres) {
  if (!Array.isArray(genres)) return {}
  return genres.reduce((map, genre) => {
    if (genre?.id) map[genre.id] = genre.name ?? '?'
    return map
  }, {})
}

export function getGenreLabels(genreList) {
  if (!Array.isArray(genreList)) return []
  return genreList.map((g) => g?.name ?? '?')
}
