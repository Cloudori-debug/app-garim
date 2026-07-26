export const APP_STATE_ID = 'singleton' as const

export interface AppState {
  id: typeof APP_STATE_ID
  lastDocumentId?: string
  lastPage?: number
}

export const DEFAULT_APP_STATE: AppState = {
  id: APP_STATE_ID,
}
