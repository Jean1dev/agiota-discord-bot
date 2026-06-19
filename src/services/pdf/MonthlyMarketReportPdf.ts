import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import {
  MonthlyReport,
  StoreRankingEntry,
  CategorySpending,
} from '../finance/ComprasMercadoReportService'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

// Paleta usada nas barras/cards
const COLORS = {
  primary: '#2563eb',
  primaryDark: '#1e3a8a',
  text: '#1f2937',
  muted: '#6b7280',
  cardBg: '#eff6ff',
  barBg: '#e5e7eb',
  rowAlt: '#f3f4f6',
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(value) ? value : 0)
}

/** Converte "YYYY-MM" em "Junho/2026". */
export function mesAnoLabel(month: string): string {
  const [ano = '', mes = ''] = month.split('-')
  const idx = parseInt(mes, 10) - 1
  return `${MESES[idx] ?? mes}/${ano}`
}

// Acesso defensivo: a forma exata dos itens dos arrays não é 100% garantida.
function num(value: unknown): number {
  const n = typeof value === 'string' ? parseFloat(value) : (value as number)
  return Number.isFinite(n) ? n : 0
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k]
  }
  return undefined
}

/**
 * Gera um PDF visual com o relatório mensal de compras de mercado
 * e retorna o caminho absoluto do arquivo.
 */
export function gerarPdfRelatorioMensalCompras(
  report: MonthlyReport,
  month: string,
): string {
  const doc = new PDFDocument({ size: 'A4', margin: 48 })
  const filename = `${randomUUID()}-relatorio-compras.pdf`
  const absolutePath = path.resolve(__dirname, '..', '..', '..', filename)
  doc.pipe(fs.createWriteStream(absolutePath))

  const left = doc.page.margins.left
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right

  // ── Cabeçalho ────────────────────────────────────────────────────────────
  doc
    .fillColor(COLORS.primaryDark)
    .fontSize(22)
    .text('Relatório de Compras de Mercado', left, 48)
  doc
    .fillColor(COLORS.muted)
    .fontSize(13)
    .text(mesAnoLabel(month), { continued: false })
  doc.moveDown(1)

  // ── Cards de resumo (2 x 2) ──────────────────────────────────────────────
  const cards: Array<{ label: string; value: string }> = [
    { label: 'Total gasto', value: formatBRL(num(report.totalSpent)) },
    { label: 'Compras', value: String(num(report.purchaseCount)) },
    { label: 'Ticket médio', value: formatBRL(num(report.averageTicket)) },
    { label: 'Itens comprados', value: String(num(report.itemCount)) },
  ]

  const gap = 12
  const cardW = (usableWidth - gap) / 2
  const cardH = 58
  const startY = doc.y
  cards.forEach((card, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = left + col * (cardW + gap)
    const y = startY + row * (cardH + gap)

    doc.roundedRect(x, y, cardW, cardH, 8).fill(COLORS.cardBg)
    doc
      .fillColor(COLORS.muted)
      .fontSize(10)
      .text(card.label.toUpperCase(), x + 14, y + 12, { width: cardW - 28 })
    doc
      .fillColor(COLORS.primaryDark)
      .fontSize(18)
      .text(card.value, x + 14, y + 28, { width: cardW - 28 })
  })
  doc.y = startY + 2 * cardH + gap + 18

  // ── Loja destaque ────────────────────────────────────────────────────────
  if (report.topStore) {
    const storeName =
      (pick(report.topStore, ['store', 'name', 'storeName']) as string) ?? '—'
    const storeTotal = num(pick(report.topStore, ['totalSpent', 'total', 'spent']))
    const y = doc.y
    doc.roundedRect(left, y, usableWidth, 46, 8).fill(COLORS.primary)
    doc
      .fillColor('#ffffff')
      .fontSize(10)
      .text('LOJA DESTAQUE DO MÊS', left + 14, y + 9)
    doc
      .fillColor('#ffffff')
      .fontSize(15)
      .text(`${storeName}  —  ${formatBRL(storeTotal)}`, left + 14, y + 23)
    doc.y = y + 46 + 18
  }

  // ── Ranking de lojas ─────────────────────────────────────────────────────
  const ranking = Array.isArray(report.storeRanking) ? report.storeRanking : []
  if (ranking.length > 0) {
    sectionTitle(doc, 'Ranking de lojas', left)
    const cols = [
      { title: 'Loja', width: usableWidth * 0.4, align: 'left' as const },
      { title: 'Gasto', width: usableWidth * 0.22, align: 'right' as const },
      { title: 'Visitas', width: usableWidth * 0.18, align: 'right' as const },
      { title: 'Ticket médio', width: usableWidth * 0.2, align: 'right' as const },
    ]
    tableHeader(doc, cols, left)
    ranking.forEach((entry: StoreRankingEntry, i) => {
      ensureSpace(doc, 22)
      const y = doc.y
      if (i % 2 === 1) {
        doc.rect(left, y - 2, usableWidth, 18).fill(COLORS.rowAlt)
      }
      const store =
        (pick(entry, ['store', 'name', 'storeName']) as string) ?? '—'
      const total = num(pick(entry, ['totalSpent', 'total', 'spent']))
      const visits = num(pick(entry, ['visitCount', 'visits', 'purchaseCount']))
      const avg = num(pick(entry, ['averageTicket', 'avgTicket', 'average']))
      rowCells(
        doc,
        [store, formatBRL(total), String(visits), formatBRL(avg)],
        cols,
        left,
        y,
      )
      doc.y = y + 18
    })
    doc.moveDown(1)
  }

  // ── Gastos por categoria (barras) ────────────────────────────────────────
  const categories = Array.isArray(report.spendingByCategory)
    ? report.spendingByCategory
    : []
  if (categories.length > 0) {
    sectionTitle(doc, 'Gastos por categoria', left)
    categories.forEach((cat: CategorySpending) => {
      ensureSpace(doc, 34)
      const name = (pick(cat, ['category', 'name']) as string) ?? '—'
      const total = num(pick(cat, ['totalSpent', 'value', 'total']))
      const items = num(pick(cat, ['itemCount', 'items', 'count']))
      const pct = num(pick(cat, ['percentage', 'percent', 'pct']))

      const y = doc.y
      doc
        .fillColor(COLORS.text)
        .fontSize(11)
        .text(name, left, y, { width: usableWidth * 0.55, continued: false })
      doc
        .fillColor(COLORS.muted)
        .fontSize(10)
        .text(
          `${formatBRL(total)}  ·  ${items} itens  ·  ${pct.toFixed(1)}%`,
          left,
          y,
          { width: usableWidth, align: 'right' },
        )

      // Barra proporcional ao percentual
      const barY = y + 16
      const barH = 8
      doc.roundedRect(left, barY, usableWidth, barH, 4).fill(COLORS.barBg)
      const filled = Math.max(0, Math.min(100, pct)) / 100 * usableWidth
      if (filled > 0) {
        doc.roundedRect(left, barY, filled, barH, 4).fill(COLORS.primary)
      }
      doc.y = barY + barH + 12
    })
  }

  // ── Rodapé ───────────────────────────────────────────────────────────────
  doc
    .fillColor(COLORS.muted)
    .fontSize(8)
    .text(
      `Gerado automaticamente em ${new Date().toLocaleString('pt-BR')}`,
      left,
      doc.page.height - doc.page.margins.bottom - 12,
      { width: usableWidth, align: 'center' },
    )

  doc.end()
  return absolutePath
}

// ── Helpers de layout ────────────────────────────────────────────────────────

function sectionTitle(doc: PDFKit.PDFDocument, text: string, left: number): void {
  ensureSpace(doc, 40)
  doc
    .fillColor(COLORS.primaryDark)
    .fontSize(15)
    .text(text, left, doc.y)
  doc.moveDown(0.4)
}

interface Col {
  title: string
  width: number
  align: 'left' | 'right'
}

function tableHeader(doc: PDFKit.PDFDocument, cols: Col[], left: number): void {
  const y = doc.y
  doc.rect(left, y - 2, cols.reduce((a, c) => a + c.width, 0), 18).fill(COLORS.primaryDark)
  let x = left
  doc.fillColor('#ffffff').fontSize(10)
  for (const col of cols) {
    doc.text(col.title, x + 6, y + 2, { width: col.width - 12, align: col.align })
    x += col.width
  }
  doc.y = y + 18
}

function rowCells(
  doc: PDFKit.PDFDocument,
  values: string[],
  cols: Col[],
  left: number,
  y: number,
): void {
  let x = left
  doc.fillColor(COLORS.text).fontSize(10)
  values.forEach((value, i) => {
    const col = cols[i]
    if (!col) return
    doc.text(value, x + 6, y + 2, {
      width: col.width - 12,
      align: col.align,
      lineBreak: false,
    })
    x += col.width
  })
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number): void {
  const bottom = doc.page.height - doc.page.margins.bottom
  if (doc.y + needed > bottom) {
    doc.addPage()
  }
}
