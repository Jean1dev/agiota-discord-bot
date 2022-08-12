const { client: MongoClient, DATABASE } = require('../repository/mongodb')
const rankingService = require('./RankingService')
const context = require('../context')

const state = {
    registros: []
}

function registrarEntradaTexto(discordMessage) {
    const data = {
        username: discordMessage.author.username,
        message: discordMessage.content,
        userId: discordMessage.author.id,
        channelId: discordMessage.channelId,
        anexos: discordMessage.attachments
    }

    console.table(data)
    state.registros.push(data)
}

function getRegistros() {
    return state.registros
}

function clearRegistros() {
    state.registros = []
}

function executarRegraPontuacao(acumuladorDeCaracteres, acumuladorDeAnexos) {
    const BASE_DIVISAO_PARA_MENSAGENS = 100
    const BASE_DIVISAO_PARA_ANEXOS = 10

    const resultado = (acumuladorDeCaracteres / BASE_DIVISAO_PARA_MENSAGENS) + ((acumuladorDeAnexos / BASE_DIVISAO_PARA_ANEXOS) + 1)
    return Math.trunc(resultado)
}

async function exibirDadosUsuarioERankear(dadosUsuarioAcumulados) {
    const chatGeral = context.client.channels.cache.find(channel => channel.name === '🧵-geral')
    let acumuladorDeCaracteres = 0
    let acumuladorDeAnexos = 0

    dadosUsuarioAcumulados[1].forEach(element => {
        acumuladorDeCaracteres += element.message.length
        const temAnexo = !!Object.keys(element.anexos).length

        if (temAnexo) {
            acumuladorDeAnexos++
        }
    })

    const pontuacaoFinal = executarRegraPontuacao(acumuladorDeCaracteres, acumuladorDeAnexos)
    await rankingService.criarOuAtualizarRanking({
        userId: dadosUsuarioAcumulados[0],
        pontuacao: pontuacaoFinal,
        operacao: 'ADICIONAR'
    })

    await chatGeral.send(`<@${dadosUsuarioAcumulados[0]}> nessa rodada vc conseguiu ${pontuacaoFinal} pontos`)
}

function rankearUso() {
    function groupBy(array, key) {
        return array.reduce((result, currentValue) => {
            (result[currentValue[key]] = result[currentValue[key]] || []).push(
                currentValue
            )
            return result;
        }, {})
    }

    MongoClient.connect().then(client => {
        client.db(DATABASE)
            .collection('analise_dados_usuarios')
            .find({})
            .toArray()
            .then(async elements => {
                const dadosUsuarioAcumulados = groupBy(elements, 'userId')

                for (const iterator of Object.entries(dadosUsuarioAcumulados)) {
                    await exibirDadosUsuarioERankear(iterator)
                }

                await client.db(DATABASE).collection('analise_dados_usuarios').deleteMany()
                await client.close()
            })
    })
}

function exibirRankingNoChat() {
    rankingService.listagem().then(data => {
        const chatGeral = context.client.channels.cache.find(channel => channel.name === '🧵-geral')
        data.sort((valor1, valor2) => {
            if (valor1.pontuacao > valor2.pontuacao) {
                return 1
            }

            if (valor1.pontuacao < valor2.pontuacao) {
                return -1
            }

            return 0
        })
            .reverse()
            .forEach(item => {
                chatGeral.send(`<@${item.userId}> voce tem um total de ${item.pontuacao}`)
            })
    })
}

module.exports = {
    registrarEntradaTexto,
    getRegistros,
    clearRegistros,
    rankearUso,
    exibirRankingNoChat
}