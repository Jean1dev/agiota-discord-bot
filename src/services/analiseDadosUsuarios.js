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

module.exports = {
    registrarEntradaTexto,
    getRegistros,
    clearRegistros
}