import { useMemo, type ReactNode } from 'react'
import { Document, Page } from 'react-pdf'

import { cn } from '@/shared/lib/cn'
import { PDFJS_DOC_OPTIONS } from '@/shared/lib/setupPdfWorker'
import '@/shared/lib/setupPdfWorker'

const DEFAULT_WIDTH = 140

interface PdfPageThumbProps {
  fileUrl: string | undefined
  page: number
  width?: number
  className?: string
  badge?: ReactNode
}

export function PdfPageThumb({
  fileUrl,
  page,
  width = DEFAULT_WIDTH,
  className,
  badge,
}: PdfPageThumbProps) {
  const file = useMemo(() => (fileUrl ? { url: fileUrl } : null), [fileUrl])
  const placeholderH = Math.round(width * 1.35)

  if (!file) {
    return (
      <div
        className={cn(
          'relative mx-auto flex items-center justify-center bg-[var(--bg)] text-xs text-[var(--muted)]',
          className,
        )}
        style={{ width, height: placeholderH }}
      >
        …
      </div>
    )
  }

  return (
    <div
      className={cn('relative mx-auto overflow-hidden bg-white', className)}
      style={{ width }}
    >
      <Document file={file} options={PDFJS_DOC_OPTIONS} loading={null} error={null}>
        <Page
          pageNumber={page}
          width={width}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          loading={
            <div
              className="flex items-center justify-center bg-[var(--bg)] text-xs text-[var(--muted)]"
              style={{ width, height: placeholderH }}
            >
              …
            </div>
          }
        />
      </Document>
      {badge}
    </div>
  )
}
