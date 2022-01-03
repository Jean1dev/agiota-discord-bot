const { BASIC_MAILGUN_KEY } = require('../config')
// const http = require("https")
const fs = require('fs')
const gerarPDF = require('./GerarPDF')
const FormData = require("form-data")
const axios = require('axios')
//const auth = 'Basic ' + Buffer.from('api' + ':' + MAILGUN_API_KEY).toString('base64')

const data = [{
  nome: 'Fabio',
  email: 'fabiuhp@msn.com',
  dividas: [{
    descricao: 'Passagem aeria',
    valor: 853
  }, {
    descricao: 'Hospedagem',
    valor: 785
  }]
}, {
  nome: 'Gean',
  email: 'geanhomem@hotmail.com',
  dividas: [{
    descricao: 'Passagem aeria',
    valor: 853
  }, {
    descricao: 'Hospedagem',
    valor: 785
  }, {
    descricao: 'Almoço floripa',
    valor: 59
  }, {
    descricao: 'Gas floripa',
    valor: 38.71
  }]
}, {
  nome: 'Arthur',
  email: 'souki.arthur@gmail.com',
  dividas: [{
    descricao: 'cinema',
    valor: 17
  }]
}]

function eviarEmailComAnexo() {
  // const options = {
  //   method: "POST",
  //   hostname: "api.mailgun.net",
  //   port: null,
  //   path: "/v3/central.binnoapp.com/messages",
  //   headers: {
  //     'Content-Type': "multipart/form-data; boundary=---011000010111000001101001",
  //     accept: "*/*",
  //     'Content-Length': "0",
  //     Authorization: `Basic ${BASIC_MAILGUN_KEY}`
  //   }
  // }

  data.forEach(devedor => {
    listaDebitos = devedor.dividas.map(item => {
      return `${item.descricao}  -  ${item.valor}`
    })

    const filename = gerarPDF(listaDebitos)

    const form = new FormData()
    form.append('from', 'Binno apps <equipe@central.binnoapp.com>')
    form.append('to', devedor.email)
    form.append('subject', 'cobrança do mamaco')
    form.append('text', 'voce foi cobrado')
    form.append('attachment', fs.createReadStream(filename))

    // options.formData = {
    //   from: 'Binno apps <equipe@central.binnoapp.com>',
    //   to: devedor.email,
    //   subject: 'cobrança do mamaco',
    //   text: 'voce foi cobrado',
    //   attachment: fs.createReadStream(filename)
    // }

    // options.formData = form

    axios({
      method: 'post',
      url: 'https://api.mailgun.net/v3/central.binnoapp.com/messages',
      data: form,
      headers: { Authorization: `Basic ${BASIC_MAILGUN_KEY}`, ...form.getHeaders() }
    }).then(response => {
      console.log(response.data, response.status)
      fs.rmSync(filename, { force: true })
    }).catch(error => {
      console.log(error.message)
      fs.rmSync(filename, { force: true })
    })

    // const req = http.request(options, function (res) {
    //   const chunks = []

    //   res.on("data", function (chunk) {
    //     chunks.push(chunk)
    //   })

    //   res.on("end", function () {
    //     const body = Buffer.concat(chunks)
    //     console.log(body.toString())
    //     fs.rmSync(filename, { force: true })
    //   })
    // })

    // req.write(form)
    //req.write(`-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"from\"\r\n\r\nBinno apps <equipe@central.binnoapp.com>\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"to\"\r\n\r\ ${devedor.email} \r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"subject\"\r\n\r\nRelatorio de dividas\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"text\"\r\n\r\nteste envio\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"attachment[1]\"; filename=\"${filename}\"\r\nContent-Type: application/pdf\r\n\r\n\r\n-----011000010111000001101001--\r\n`);
    // req.end()
  })

}

module.exports = eviarEmailComAnexo
