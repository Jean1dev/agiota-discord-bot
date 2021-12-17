const context = require('../../context')
const { MAILGUN_API_KEY } = require('../../config')
const http = require("https")
const fs = require('fs')
const gerarPDF = require('../../services/GerarPDF')

function eviarEmailComAnexo(filename, email) {
  const auth = 'Basic ' + Buffer.from('api' + ':' + MAILGUN_API_KEY).toString('base64')
  const options = {
    method: "POST",
    hostname: "api.mailgun.net",
    port: null,
    path: "/v3/central.binnoapp.com/messages",
    headers: {
      'Content-Type': "multipart/form-data; boundary=---011000010111000001101001",
      accept: "*/*",
      'Content-Length': "0",
      Authorization: auth
    }
  }

  const req = http.request(options, function (res) {
    const chunks = []

    res.on("data", function (chunk) {
      chunks.push(chunk)
    });

    res.on("end", function () {
      const body = Buffer.concat(chunks)
      console.log(body.toString())
      fs.rmSync(filename, { force: true })
    })
  })

  req.write(`-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"from\"\r\n\r\nBinno apps <equipe@central.binnoapp.com>\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"to\"\r\n\r\ ${email} \r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"subject\"\r\n\r\nRelatorio de dividas\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"text\"\r\n\r\nteste envio\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"attachment[1]\"; filename=\"${filename}\"\r\nContent-Type: application/pdf\r\n\r\n\r\n-----011000010111000001101001--\r\n`);
  req.end()
}

module.exports = async message => {
  if (!context.dividas.length) {
    message.reply('Ninguem esta te devendo meu mano')
    return
  }

  context.dividas.forEach(usuarioComDividas => {
    message.channel.send(`Dividas do ${usuarioComDividas.id}`)
    const dividas = usuarioComDividas.pendencias
      .map(divida => `${divida.descricao} : R$${divida.valor}, 00`)
      .join(', ')

    message.channel.send(dividas)

    const pdfGerado = gerarPDF(dividas)
    eviarEmailComAnexo(pdfGerado, 'jeanlucafp@gmail.com')

    const totalDivida = usuarioComDividas.pendencias
      .map(divida => Number(divida.valor))
      .reduce((total, valorAtual) => total + valorAtual, 0)

    const pagamentos = usuarioComDividas.pagamentos
      .map(pagamento => `R$${pagamento.valorPago}, 00`)
      .join(', ')

    message.channel.send(`pagamentos, ${pagamentos}`)

    const totalPago = usuarioComDividas.pagamentos
      .map(pagamento => Number(pagamento.valorPago))
      .reduce((total, valorAtual) => total + valorAtual, 0)

    message.channel.send(`Total de : R$${((totalPago - totalDivida) * -1)}`)
  })
}
