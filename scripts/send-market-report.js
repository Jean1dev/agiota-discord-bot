#!/usr/bin/env node
require('dotenv').config()

const axios = require('axios')
const { fetchMonthlyReport } = require('../dist/services/finance/ComprasMercadoReportService')
const {
  gerarPdfRelatorioMensalCompras,
  mesAnoLabel,
  nomeArquivoRelatorioCompras,
} = require('../dist/services/pdf/MonthlyMarketReportPdf')
const { upload } = require('../dist/services/upload/UploadService')
const { sendEmail } = require('../dist/services/email/EmailService')
const { ADMIN_EMAIL } = require('../dist/config/constants')

function lastMonth(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1))
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(value) ? value : 0)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function sendMarketReport(month) {
  console.log(`[sendMarketReport] month=${month}`)

  const report = await fetchMonthlyReport(month)
  if (!report) {
    throw new Error(`Relatório vazio para ${month}`)
  }

  console.log('[sendMarketReport] report', {
    totalSpent: report.totalSpent,
    purchaseCount: report.purchaseCount,
    averageTicket: report.averageTicket,
    itemCount: report.itemCount,
  })

  const pdfPath = gerarPdfRelatorioMensalCompras(report, month)
  console.log(`[sendMarketReport] pdf=${pdfPath}`)
  await sleep(1500)

  const attachmentLink = await upload(pdfPath)
  if (!attachmentLink) {
    throw new Error('Upload do PDF falhou')
  }
  console.log('[sendMarketReport] upload ok', attachmentLink)

  const ref = mesAnoLabel(month)
  sendEmail({
    to: ADMIN_EMAIL,
    subject: `Relatório de compras de mercado — ${ref}`,
    message: [
      `Segue em anexo o relatório de compras de mercado de ${ref}.`,
      '',
      `Total gasto: ${formatBRL(report.totalSpent)}`,
      `Compras: ${report.purchaseCount}`,
      `Ticket médio: ${formatBRL(report.averageTicket)}`,
      `Itens comprados: ${report.itemCount}`,
    ].join('\n'),
    attachmentLink,
    attachmentName: nomeArquivoRelatorioCompras(month),
  })

  await sleep(3000)
  console.log(`[sendMarketReport] e-mail disparado para ${ADMIN_EMAIL}`)
}

async function main() {
  const month = process.argv[2] || lastMonth()
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error(`Mês inválido: "${month}". Use YYYY-MM (ex.: 2026-07).`)
  }

  await axios.get(
    `https://merchant-receipt-analysis-8c20061837f6.herokuapp.com/reports/${month}`,
    { timeout: 60_000 },
  ).then(r => {
    console.log('[preflight] merchant-receipt-analysis OK', {
      month: r.data.month,
      totalSpent: r.data.totalSpent,
      purchaseCount: r.data.purchaseCount,
    })
  })

  await sendMarketReport(month)
}

main().catch(err => {
  console.error('[sendMarketReport] falhou', err?.response?.data || err)
  process.exit(1)
})
