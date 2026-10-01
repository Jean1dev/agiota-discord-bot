import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import {
  LlmUsageReport,
  RankingEntry,
  formatInt,
  formatUsd,
} from '../llm/LlmUsageReportService'

const COLORS = {
  primary: '#2563eb',
  primaryDark: '#1e3a8a',
  success: '#16a34a',
  danger: '#dc2626',
  text: '#1f2937',
  muted: '#6b7280',
  cardBg: '#eff6ff',
  barBg: '#e5e7eb',
  rowAlt: '#f3f4f6',
  grid: '#e5e7eb',
}

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/** "2026-09-30" → "30/09". */
export function diaMesLabel(date: string): string {
  const [, mes = '', dia = ''] = date.split('-')
  return `${dia}/${mes}`
}

function diaSemanaLabel(date: string): string {
  return DIAS_SEMANA[new Date(`${date}T00:00:00Z`).getUTCDay()] ?? ''
}

export function nomeArquivoRelatorioLlm(report: Pick<LlmUsageReport, 'startDate' | 'endDate'>): string {
  return `uso-litellm-${report.startDate}_a_${report.endDate}.pdf`
}

/**
 * Gera um PDF em formato de dashboard com o uso do LiteLLM no período
 * e retorna o caminho absoluto do arquivo.
 */
export function gerarPdfUsoLlm(report: LlmUsageReport): string {
  const doc = new PDFDocument({ size: 'A4', margin: 40 })
  const filename = `${randomUUID()}-${nomeArquivoRelatorioLlm(report)}`
  const absolutePath = path.resolve(__dirname, '..', '..', '..', filename)
  doc.pipe(fs.createWriteStream(absolutePath))

  const left = doc.page.margins.left
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right

  // ── Cabeçalho ────────────────────────────────────────────────────────────
  doc.fillColor(COLORS.primaryDark).fontSize(22).text('Uso do LiteLLM', left, 40)
  doc
    .fillColor(COLORS.muted)
    .fontSize(12)
    .text(`${diaMesLabel(report.startDate)} a ${diaMesLabel(report.endDate)} (UTC) · valores em USD`)
  doc.moveDown(0.8)

  if (report.isEmpty) {
    emptyState(doc, left, usableWidth)
    footer(doc, left, usableWidth)
    doc.end()
    return absolutePath
  }

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const t = report.totals
  const successRate = t.api_requests > 0 ? (t.successful_requests / t.api_requests) * 100 : 0
  const activeDays = report.days.filter(d => d.metrics.api_requests > 0).length
  kpiCards(doc, left, usableWidth, [
    { label: 'Gasto total', value: formatUsd(t.spend), hint: `média ${formatUsd(t.spend / report.days.length)}/dia` },
    { label: 'Requisições', value: formatInt(t.api_requests), hint: `${successRate.toFixed(1)}% com sucesso` },
    { label: 'Tokens', value: formatInt(t.total_tokens), hint: `${formatInt(t.prompt_tokens)} in · ${formatInt(t.completion_tokens)} out` },
    { label: 'Falhas', value: formatInt(t.failed_requests), hint: `${activeDays} de ${report.days.length} dias com uso`, alert: t.failed_requests > 0 },
  ])

  // ── Gráficos diários ─────────────────────────────────────────────────────
  sectionTitle(doc, 'Gasto por dia', left)
  barChart(doc, left, usableWidth, report.days.map(d => ({
    label: d.date,
    segments: [{ value: d.metrics.spend, color: COLORS.primary }],
    valueLabel: d.metrics.spend > 0 ? formatUsd(d.metrics.spend) : '',
  })))

  sectionTitle(doc, 'Requisições por dia', left)
  legend(doc, left, [
    { color: COLORS.success, label: 'Sucesso' },
    { color: COLORS.danger, label: 'Falha' },
  ])
  barChart(doc, left, usableWidth, report.days.map(d => ({
    label: d.date,
    segments: [
      { value: d.metrics.successful_requests, color: COLORS.success },
      { value: d.metrics.failed_requests, color: COLORS.danger },
    ],
    valueLabel: d.metrics.api_requests > 0 ? formatInt(d.metrics.api_requests) : '',
  })))

  // ── Rankings ─────────────────────────────────────────────────────────────
  ranking(doc, 'Modelos', report.models, t.spend, left, usableWidth)
  ranking(doc, 'Provedores', report.providers, t.spend, left, usableWidth)
  ranking(doc, 'Chaves de API', report.apiKeys, t.spend, left, usableWidth)

  // ── Tabela diária ────────────────────────────────────────────────────────
  sectionTitle(doc, 'Detalhe diário', left)
  const cols: Col[] = [
    { title: 'Dia', width: usableWidth * 0.2, align: 'left' },
    { title: 'Gasto', width: usableWidth * 0.18, align: 'right' },
    { title: 'Requisições', width: usableWidth * 0.18, align: 'right' },
    { title: 'Falhas', width: usableWidth * 0.14, align: 'right' },
    { title: 'Tokens', width: usableWidth * 0.3, align: 'right' },
  ]
  tableHeader(doc, cols, left)
  report.days.forEach((d, i) => {
    ensureSpace(doc, 20)
    const y = doc.y
    if (i % 2 === 1) doc.rect(left, y - 2, usableWidth, 18).fill(COLORS.rowAlt)
    rowCells(doc, [
      `${diaSemanaLabel(d.date)} ${diaMesLabel(d.date)}`,
      formatUsd(d.metrics.spend),
      formatInt(d.metrics.api_requests),
      formatInt(d.metrics.failed_requests),
      formatInt(d.metrics.total_tokens),
    ], cols, left, y)
    doc.y = y + 18
  })

  footer(doc, left, usableWidth)
  doc.end()
  return absolutePath
}

// ── Blocos do dashboard ──────────────────────────────────────────────────────

interface Kpi {
  label: string
  value: string
  hint: string
  alert?: boolean
}

function kpiCards(doc: PDFKit.PDFDocument, left: number, usableWidth: number, cards: Kpi[]): void {
  const gap = 10
  const cardW = (usableWidth - gap * (cards.length - 1)) / cards.length
  const cardH = 64
  const y = doc.y
  cards.forEach((card, i) => {
    const x = left + i * (cardW + gap)
    doc.roundedRect(x, y, cardW, cardH, 8).fill(COLORS.cardBg)
    doc.fillColor(COLORS.muted).fontSize(8).text(card.label.toUpperCase(), x + 10, y + 10, { width: cardW - 20 })
    doc
      .fillColor(card.alert ? COLORS.danger : COLORS.primaryDark)
      .fontSize(16)
      .text(card.value, x + 10, y + 24, { width: cardW - 20, lineBreak: false })
    doc.fillColor(COLORS.muted).fontSize(7).text(card.hint, x + 10, y + 46, { width: cardW - 20, lineBreak: false })
  })
  doc.y = y + cardH + 16
}

interface Bar {
  label: string
  segments: Array<{ value: number; color: string }>
  valueLabel: string
}

function barChart(doc: PDFKit.PDFDocument, left: number, usableWidth: number, bars: Bar[]): void {
  const chartH = 110
  const labelH = 24
  ensureSpace(doc, chartH + labelH + 16)

  const top = doc.y + 12 // espaço para o rótulo de valor da maior barra
  const baseY = top + chartH
  const max = Math.max(0, ...bars.map(b => b.segments.reduce((s, seg) => s + seg.value, 0)))

  doc.moveTo(left, baseY).lineTo(left + usableWidth, baseY).lineWidth(0.5).strokeColor(COLORS.grid).stroke()

  const slot = usableWidth / Math.max(1, bars.length)
  const barW = Math.min(48, slot * 0.6)
  bars.forEach((bar, i) => {
    const x = left + i * slot + (slot - barW) / 2
    let cursor = baseY
    for (const seg of bar.segments) {
      if (seg.value <= 0 || max <= 0) continue
      const h = Math.max(1, (seg.value / max) * chartH)
      doc.rect(x, cursor - h, barW, h).fill(seg.color)
      cursor -= h
    }
    if (bar.valueLabel) {
      doc.fillColor(COLORS.text).fontSize(7).text(bar.valueLabel, left + i * slot, cursor - 10, {
        width: slot,
        align: 'center',
        lineBreak: false,
      })
    }
    doc.fillColor(COLORS.muted).fontSize(7)
    doc.text(diaSemanaLabel(bar.label), left + i * slot, baseY + 4, { width: slot, align: 'center', lineBreak: false })
    doc.text(diaMesLabel(bar.label), left + i * slot, baseY + 13, { width: slot, align: 'center', lineBreak: false })
  })
  doc.y = baseY + labelH + 10
}

function legend(doc: PDFKit.PDFDocument, left: number, items: Array<{ color: string; label: string }>): void {
  const y = doc.y
  let x = left
  for (const item of items) {
    doc.rect(x, y + 1, 8, 8).fill(item.color)
    doc.fillColor(COLORS.muted).fontSize(8).text(item.label, x + 12, y, { lineBreak: false })
    x += 12 + doc.widthOfString(item.label) + 16
  }
  doc.y = y + 12
}

function ranking(
  doc: PDFKit.PDFDocument,
  title: string,
  entries: RankingEntry[],
  totalSpend: number,
  left: number,
  usableWidth: number,
): void {
  if (entries.length === 0) return
  sectionTitle(doc, title, left)
  const cols: Col[] = [
    { title: 'Nome', width: usableWidth * 0.34, align: 'left' },
    { title: 'Gasto', width: usableWidth * 0.14, align: 'right' },
    { title: 'Req.', width: usableWidth * 0.1, align: 'right' },
    { title: 'Tokens', width: usableWidth * 0.16, align: 'right' },
    { title: '% do gasto', width: usableWidth * 0.26, align: 'left' },
  ]
  tableHeader(doc, cols, left)
  entries.forEach((entry, i) => {
    ensureSpace(doc, 20)
    const y = doc.y
    if (i % 2 === 1) doc.rect(left, y - 2, usableWidth, 18).fill(COLORS.rowAlt)
    const pct = totalSpend > 0 ? (entry.metrics.spend / totalSpend) * 100 : 0
    rowCells(doc, [
      entry.name,
      formatUsd(entry.metrics.spend),
      formatInt(entry.metrics.api_requests),
      formatInt(entry.metrics.total_tokens),
      '',
    ], cols, left, y)

    // Barra proporcional à participação no gasto
    const barCol = cols[4]!
    const barX = left + usableWidth - barCol.width + 6
    const barMaxW = barCol.width - 48
    doc.roundedRect(barX, y + 4, barMaxW, 7, 3).fill(COLORS.barBg)
    const filled = (Math.max(0, Math.min(100, pct)) / 100) * barMaxW
    if (filled > 0) doc.roundedRect(barX, y + 4, filled, 7, 3).fill(COLORS.primary)
    doc.fillColor(COLORS.muted).fontSize(8).text(`${pct.toFixed(1)}%`, barX + barMaxW + 4, y + 3, {
      width: 38,
      align: 'right',
      lineBreak: false,
    })
    doc.y = y + 18
  })
  doc.moveDown(0.8)
}

function emptyState(doc: PDFKit.PDFDocument, left: number, usableWidth: number): void {
  const y = doc.y + 20
  doc.roundedRect(left, y, usableWidth, 90, 10).fill(COLORS.cardBg)
  doc
    .fillColor(COLORS.primaryDark)
    .fontSize(15)
    .text('Nenhum uso registrado neste período', left, y + 22, { width: usableWidth, align: 'center' })
  doc
    .fillColor(COLORS.muted)
    .fontSize(10)
    .text(
      'O gateway não registrou requisições nesses dias. O histórico começa no deploy da feature de métricas, então semanas iniciais podem vir vazias.',
      left + 30,
      y + 46,
      { width: usableWidth - 60, align: 'center' },
    )
  doc.y = y + 110
}

function footer(doc: PDFKit.PDFDocument, left: number, usableWidth: number): void {
  doc
    .fillColor(COLORS.muted)
    .fontSize(8)
    .text(
      `Gerado automaticamente em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · dados podem ter alguns segundos de atraso`,
      left,
      doc.page.height - doc.page.margins.bottom - 12,
      { width: usableWidth, align: 'center', lineBreak: false },
    )
}

// ── Helpers de layout ────────────────────────────────────────────────────────

function sectionTitle(doc: PDFKit.PDFDocument, text: string, left: number): void {
  ensureSpace(doc, 60)
  doc.fillColor(COLORS.primaryDark).fontSize(13).text(text, left, doc.y)
  doc.moveDown(0.3)
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
  doc.fillColor('#ffffff').fontSize(9)
  for (const col of cols) {
    doc.text(col.title, x + 6, y + 2, { width: col.width - 12, align: col.align, lineBreak: false })
    x += col.width
  }
  doc.y = y + 18
}

function rowCells(doc: PDFKit.PDFDocument, values: string[], cols: Col[], left: number, y: number): void {
  let x = left
  doc.fillColor(COLORS.text).fontSize(9)
  values.forEach((value, i) => {
    const col = cols[i]
    if (!col) return
    if (value) {
      doc.text(value, x + 6, y + 2, { width: col.width - 12, align: col.align, lineBreak: false, ellipsis: true })
    }
    x += col.width
  })
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number): void {
  // Reserva espaço para o rodapé
  const bottom = doc.page.height - doc.page.margins.bottom - 20
  if (doc.y + needed > bottom) {
    doc.addPage()
  }
}
