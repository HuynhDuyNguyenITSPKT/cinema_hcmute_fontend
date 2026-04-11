function isObject(value) {
  return value !== null && typeof value === 'object'
}

/**
 * Parse dashboard payload safely for both axios response object and interceptor-unwrapped payload.
 * Priority:
 * 1) response.data.data (raw axios + wrapper)
 * 2) response.data (raw axios, already unwrapped by backend adapter)
 * 3) payload.data (interceptor returned wrapper)
 * 4) payload (interceptor returned unwrapped data)
 */
export function parseDashboardResponse(response) {
  if (response == null) return null

  if (isObject(response) && 'data' in response) {
    const firstLayer = response.data

    if (isObject(firstLayer) && 'data' in firstLayer) {
      return firstLayer.data
    }

    if (firstLayer !== undefined) {
      return firstLayer
    }
  }

  if (isObject(response) && 'success' in response && 'data' in response) {
    return response.data
  }

  return response
}

export function listByKey(payload, key) {
  if (!isObject(payload)) return []
  const raw = payload[key]
  return Array.isArray(raw) ? raw : []
}

export function resolveDashboardError(error, endpointLabel) {
  const fallback = endpointLabel
    ? `Không tải được ${endpointLabel}. Vui lòng thử lại.`
    : 'Không tải được dữ liệu dashboard'

  if (!error) return fallback
  if (typeof error === 'string') return error
  if (typeof error?.message === 'string' && error.message.trim()) return error.message.trim()

  return fallback
}
