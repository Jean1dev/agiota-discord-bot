import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

/**
 * Gera um PDF com a lista de itens e retorna o caminho absoluto do arquivo.
 */
export function criarPDFRetornarCaminho(
  itens: string[],
  titulo = 'Relatorios de dividas.',
): string {
  const doc = new PDFDocument()
  const filename = `${randomUUID()}-output.pdf`
  doc.pipe(fs.createWriteStream(filename))

  doc.image(path.resolve(__dirname, '..', '..', '..', 'assets', 'mamaco.jpg'), {
    fit: [250, 300],
    align: 'center',
  })

  doc.text(titulo, { width: 410, align: 'center' })
  doc.list(itens)

  doc
    .addPage()
    .fillColor('blue')
    .text('Estamos melhorando', 100, 100)
    .underline(100, 100, 160, 27, { color: '#0000FF' })

  doc.end()

  return path.resolve(__dirname, '..', '..', '..', filename)
}
