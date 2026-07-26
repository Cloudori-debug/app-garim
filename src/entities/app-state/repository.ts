import { db } from '@/entities/db'
import {
  APP_STATE_ID,
  DEFAULT_APP_STATE,
  type AppState,
} from '@/entities/app-state/types'

export async function getAppState(): Promise<AppState> {
  const state = await db.appState.get(APP_STATE_ID)
  return state ?? DEFAULT_APP_STATE
}

export async function setLastOpened(documentId: string, page: number): Promise<void> {
  await db.appState.put({
    id: APP_STATE_ID,
    lastDocumentId: documentId,
    lastPage: page,
  })
}
