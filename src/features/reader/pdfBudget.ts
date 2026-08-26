/** 이 용량·장수를 넘으면 아이패드에서 pdf.js 미리보기가 위험해집니다. */
export const HEAVY_PDF_BYTES = 80 * 1024 * 1024
export const HEAVY_PDF_PAGES = 80

export function isHeavyPdf(byteSize: number, pageCount: number): boolean {
  return byteSize >= HEAVY_PDF_BYTES || pageCount > HEAVY_PDF_PAGES
}
