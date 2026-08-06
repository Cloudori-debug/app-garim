import { pdfjs } from 'react-pdf'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

/**
 * 한글·CJK PDF 글리프용 cMap + 표준 폰트.
 * Vite가 public/cmaps, public/standard_fonts 로 복사합니다.
 */
export const PDFJS_DOC_OPTIONS = {
  cMapUrl: '/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: '/standard_fonts/',
  // 전체 파일을 미리 긁지 않고 요청 페이지 위주로 (Blob에서도 파싱 부하↓)
  disableAutoFetch: true,
  disableStream: false,
  isEvalSupported: false,
} as const
