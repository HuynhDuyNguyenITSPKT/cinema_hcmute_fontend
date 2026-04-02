export const NOTIFY_EVENT = 'app:notify'
const DEFAULT_DURATION = 1600

function emitNotification(payload) {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new CustomEvent(NOTIFY_EVENT, { detail: payload }))
}

function resolveOptions(titleOrOptions, fallbackTitle) {
  if (typeof titleOrOptions === 'string') {
    return { title: titleOrOptions }
  }

  if (titleOrOptions && typeof titleOrOptions === 'object') {
    return titleOrOptions
  }

  return { title: fallbackTitle }
}

export function notifySuccess(message, titleOrOptions = 'Thành công') {
  const options = resolveOptions(titleOrOptions, 'Thành công')
  const normalizedMessage = typeof message === 'string' ? message.trim() : ''

  if (!normalizedMessage) {
    return
  }

  emitNotification({
    type: 'success',
    title: options.title || 'Thành công',
    message: normalizedMessage,
    duration: Number.isFinite(options.duration) && options.duration > 0 ? options.duration : DEFAULT_DURATION,
  })
}

export function notifyError(message, titleOrOptions = 'Thất bại') {
  const options = resolveOptions(titleOrOptions, 'Thất bại')
  const normalizedMessage = typeof message === 'string' ? message.trim() : ''

  if (!normalizedMessage) {
    return
  }

  emitNotification({
    type: 'error',
    title: options.title || 'Thất bại',
    message: normalizedMessage,
    duration: Number.isFinite(options.duration) && options.duration > 0 ? options.duration : DEFAULT_DURATION,
  })
}
