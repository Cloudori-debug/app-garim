/** 학습 | 단어(형광펜) 가림 편집 | 페이지 숨김 관리 */
export type ReaderMode = 'study' | 'wordCover' | 'pageCover'

export function isWordCoverMode(mode: ReaderMode): boolean {
  return mode === 'wordCover'
}

export function isStudyMode(mode: ReaderMode): boolean {
  return mode === 'study'
}
