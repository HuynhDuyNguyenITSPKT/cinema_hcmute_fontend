export const getDefaultPathByRole = (role) => {
  if (role === 'ADMIN') {
    return '/admin/profile'
  }

  if (role === 'USER') {
    return '/'
  }

  return '/login'
}
