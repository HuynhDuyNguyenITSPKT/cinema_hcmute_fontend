const EVENTS = {
  CREATED: 'movie:created',
  UPDATED: 'movie:updated',
  DELETED: 'movie:deleted',
  LIST_REFRESHED: 'movie:list:refreshed',
}

function emit(event, detail = {}) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(event, { detail }))
  }
}

function subscribe(event, handler) {
  window.addEventListener(event, handler)
  return () => window.removeEventListener(event, handler)
}

export const movieEventBus = {
  events: EVENTS,
  emitCreated: (movie) => emit(EVENTS.CREATED, { movie }),
  emitUpdated: (movie) => emit(EVENTS.UPDATED, { movie }),
  emitDeleted: (id) => emit(EVENTS.DELETED, { movieId: id }),
  emitListRefreshed: () => emit(EVENTS.LIST_REFRESHED),
  onCreated: (handler) => subscribe(EVENTS.CREATED, handler),
  onUpdated: (handler) => subscribe(EVENTS.UPDATED, handler),
  onDeleted: (handler) => subscribe(EVENTS.DELETED, handler),
  onListRefreshed: (handler) => subscribe(EVENTS.LIST_REFRESHED, handler),
}
