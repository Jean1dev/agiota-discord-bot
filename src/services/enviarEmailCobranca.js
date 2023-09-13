const gerarPDF = require('./GerarPDF')
const sendEmail = require('./EmailService')

function eviarEmailComAnexo() {

  data.forEach(devedor => {
    listaDebitos = devedor.dividas.map(item => {
      return `${item.descricao}  -  ${item.valor}`
    })

    const filename = gerarPDF(listaDebitos)

    const data = {
      to: devedor.email,
      subject: 'cobrança do mamaco',
      message: 'voce foi cobrado',
      attachment: fs.createReadStream(filename)
    }
    sendEmail(data)

  })

}

module.exports = eviarEmailComAnexo
