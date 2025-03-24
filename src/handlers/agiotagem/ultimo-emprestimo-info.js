const { getInfoUltimoEmprestimo } = require("../../services/CaixinhaService")

module.exports = message => {
    const { author } = message
    getInfoUltimoEmprestimo(author.username)
        .then(data => {
            if (data.error) {
                message.channel.send(data.error)
                return
            }

            const { link, text } = data
            message.channel.send(text)
            message.channel.send(link)
        })
}