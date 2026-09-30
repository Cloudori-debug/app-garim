import { PDFDocument } from 'pdf-lib'

import { db } from '@/entities/db'
import * as documentRepo from '@/entities/document/repository'
import * as folderRepo from '@/entities/folder/repository'
import * as markRepo from '@/entities/mark/repository'
import type { MarkColor } from '@/entities/mark/types'
import { SAMPLE_PDF_NAME } from '@/shared/lib/appMeta'

/** PDF 페이지 위 정규화 좌표 — 답란을 가로지르는 형광펜 */
const SAMPLE_MARKS: {
  points: { x: number; y: number }[]
  strokeWidth: number
  color: MarkColor
}[] = [
  {
    points: [
      { x: 0.1, y: 0.321 },
      { x: 0.9, y: 0.321 },
    ],
    strokeWidth: 0.07,
    color: 'yellow',
  },
  {
    points: [
      { x: 0.1, y: 0.521 },
      { x: 0.9, y: 0.521 },
    ],
    strokeWidth: 0.07,
    color: 'red',
  },
  {
    points: [
      { x: 0.1, y: 0.721 },
      { x: 0.9, y: 0.721 },
    ],
    strokeWidth: 0.07,
    color: 'purple',
  },
]

const BLOCKS = [
  { q: '헌법 제1조', a: '대한민국은 민주공화국이다.', y: 0.22 },
  { q: '삼권분립', a: '입법 · 행정 · 사법', y: 0.42 },
  { q: '지방자치의 주체', a: '주민이 선출한 지방자치단체', y: 0.62 },
] as const

export async function findSampleDocumentId(): Promise<string | undefined> {
  const docs = await db.documents.toArray()
  return docs.find((d) => d.fileName === SAMPLE_PDF_NAME)?.id
}

export async function seedSampleDocument(): Promise<{ documentId: string }> {
  const existingId = await findSampleDocumentId()
  if (existingId) return { documentId: existingId }

  const blob = await buildSamplePdf()
  const file = new File([blob], SAMPLE_PDF_NAME, { type: 'application/pdf' })
  const folder = await folderRepo.ensureDefaultFolder()
  const doc = await documentRepo.addDocument({
    folderId: folder.id,
    file,
    pageCount: 1,
    pageLayout: 'portrait',
  })
  for (const mark of SAMPLE_MARKS) {
    await markRepo.createMark({ documentId: doc.id, page: 1, ...mark })
  }
  return { documentId: doc.id }
}

async function buildSamplePdf(): Promise<Blob> {
  const width = 1190
  const height = 1684
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('샘플 PDF를 그릴 수 없습니다.')
  drawSamplePage(ctx, width, height)

  const png = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('샘플 이미지를 만들지 못했습니다.'))
    }, 'image/png')
  })

  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595, 842])
  const image = await pdf.embedPng(await png.arrayBuffer())
  page.drawImage(image, { x: 0, y: 0, width: 595, height: 842 })
  const bytes = await pdf.save()
  const copy = new Uint8Array(bytes)
  return new Blob([copy], { type: 'application/pdf' })
}

function drawSamplePage(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#f4f5f7'
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = '#0f766e'
  ctx.fillRect(0, 0, w, 16)

  ctx.fillStyle = '#1a1d21'
  ctx.font = '700 54px "Noto Sans KR", "Apple SD Gothic Neo", sans-serif'
  ctx.fillText('가림 암기노트 샘플', w * 0.1, h * 0.09)

  ctx.fillStyle = '#6b7280'
  ctx.font = '400 28px "Noto Sans KR", "Apple SD Gothic Neo", sans-serif'
  ctx.fillText('노란·빨간·보라 칸을 가린 뒤, 오늘 탭에서 복습해 보세요.', w * 0.1, h * 0.14)

  for (const block of BLOCKS) {
    const boxY = block.y * h
    const boxH = h * 0.16
    roundRect(ctx, w * 0.08, boxY, w * 0.84, boxH, 18)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.strokeStyle = '#d1d5db'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = '#6b7280'
    ctx.font = '600 26px "Noto Sans KR", "Apple SD Gothic Neo", sans-serif'
    ctx.fillText(block.q, w * 0.12, boxY + 48)

    const answerY = boxY + boxH * 0.42
    const answerH = boxH * 0.44
    roundRect(ctx, w * 0.1, answerY, w * 0.8, answerH, 12)
    ctx.fillStyle = '#ecfdf5'
    ctx.fill()

    ctx.fillStyle = '#134e4a'
    ctx.font = '600 32px "Noto Sans KR", "Apple SD Gothic Neo", sans-serif'
    ctx.fillText(block.a, w * 0.13, answerY + answerH * 0.64)
  }

  ctx.fillStyle = '#6b7280'
  ctx.font = '400 24px "Noto Sans KR", "Apple SD Gothic Neo", sans-serif'
  ctx.fillText('이 PDF는 앱에만 저장되며 서버로 전송되지 않습니다.', w * 0.1, h * 0.9)
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}
