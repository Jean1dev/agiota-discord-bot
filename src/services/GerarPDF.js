/**
 * @docs http://pdfkit.org/docs/text.html#lists
 *
 */

const PDFDocument = require('pdfkit')
const fs = require('fs')
const path = require('path')
const { randomUUID } = require('crypto')

function criarPDFRetornarCaminho(itens) {
  const doc = new PDFDocument()
  const filename = `${randomUUID()}-output.pdf`
  doc.pipe(fs.createWriteStream(filename))

  doc.image(path.resolve(__dirname, '..', '..', 'assets', 'mamaco.jpg'), {
    fit: [250, 300],
    align: 'right',
    valign: 'right'
  })

  doc.text(`Relatorios de dividas.`, {
    width: 410,
    align: 'center'
  })

  doc.list(itens)

  doc
    .addPage()
    .fillColor('blue')
    .text('Estamos melhorando', 100, 100)
    .underline(100, 100, 160, 27, { color: '#0000FF' })

  doc.end()

  return path.resolve(__dirname, '..', '..', filename)
}

module.exports = criarPDFRetornarCaminho
