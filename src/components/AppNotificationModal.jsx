import { useEffect, useRef, useState } from 'react'
import { NOTIFY_EVENT } from '../utils/notify'

const defaultState = {
  open: false,
  type: 'success',
  message: '',
  duration: 1600,
}

function AppNotificationModal() {
  const [state, setState] = useState(defaultState)
  const timerRef = useRef(null)

  useEffect(() => {
    const handleNotification = (event) => {
      const detail = event.detail || {}
      const parsedDuration = Number(detail.duration)

      setState({
        open: true,
        type: detail.type === 'error' ? 'error' : 'success',
        message: detail.message || '',
        duration: Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : 1600,
      })
    }

    window.addEventListener(NOTIFY_EVENT, handleNotification)

    return () => {
      window.removeEventListener(NOTIFY_EVENT, handleNotification)
    }
  }, [])

  useEffect(() => {
    if (!state.open) {
      return undefined
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, open: false }))
      timerRef.current = null
    }, state.duration)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [state.open, state.duration, state.message, state.type])

  if (!state.open || !state.message) {
    return null
  }

  return (
    <div className="notify-toast-wrap" aria-live="polite" aria-atomic="true">
      <div className={`notify-toast ${state.type === 'error' ? 'error' : 'success'}`} role="status">
        <span className="notify-toast-mark" aria-hidden="true">
          {state.type === 'error' ? '!' : 'V'}
        </span>
        <p>{state.message}</p>
      </div>
    </div>
  )
}

export default AppNotificationModal
