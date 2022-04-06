const { BASIC_MAILGUN_KEY } = require('../config')
const fs = require('fs')
const gerarPDF = require('./GerarPDF')
const FormData = require("form-data")
const axios = require('axios')

const data = [{
  nome: 'Fabio',
  email: 'fabiuhp@msn.com',
  dividas: [{
    descricao: 'Passagem aeria e hospedagem -- pagando 172,55 por mes -- 4 paga',
    valor: 1035.35
  }, {
    descricao: 'uber',
    valor: 7.60
  }]
}, {
  nome: 'Gean',
  email: 'geanhomem@hotmail.com',
  dividas: [{
    descricao: 'Passagem aeria e hospedagem  -- pagando 163,88 por mes -- 2 paga',
    valor: 1306.12
  }, {
    descricao: 'uber',
    valor: 7.60
  }]
}, {
  nome: 'Arthur',
  email: 'souki.arthur@gmail.com',
  dividas: []
}]

function eviarEmailComAnexo() {

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
  })

}

module.exports = eviarEmailComAnexo
