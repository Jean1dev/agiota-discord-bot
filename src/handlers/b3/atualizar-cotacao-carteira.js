const axios = require('axios')
const Scraper = require('images-scraper')
const captureException = require('../../observability/Sentry')

const baseUrl = 'https://carteira-14bc707a7fab.herokuapp.com/admin'

function deleteMessageAfterTime(message) {
    setTimeout(() => message.delete(), 10000)
}

module.exports = async message => {
    message.reply('momentinho vou verificar').then(deleteMessageAfterTime)

    await axios.default.post(`${baseUrl}`)

    const { data: listaAtivos } = await axios.default.get(`${baseUrl}/ativos-sem-image`)
    if (listaAtivos.length == 0) {
        message.reply('nenhum ativo para monitorar').then(deleteMessageAfterTime)
        return
    }

    const google = new Scraper({
        puppeteer: {
            headless: false,
        },
    })

    const ativoComImagem = []
    for (const papel of listaAtivos) {
        try {
            const results = await google.scrape(papel, 200)
            ativoComImagem.push({
                papel,
                imagem: results[0]['url']
            })
        } catch (e) {
            captureException(e)
            message.channel.send(`Nao consegui adicionar esse papel ${papel}`).then(deleteMessageAfterTime)
        }
    }

    for (const obj of ativoComImagem) {
        await axios.default.put(`${baseUrl}/atualizar-ativo`, {
            nome: obj.papel,
            imageUrl: obj.imagem
        })
        message.channel.send(`Atualizado ${obj.papel}`).then(deleteMessageAfterTime)
    }

}