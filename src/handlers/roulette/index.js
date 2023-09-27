const {roletaOptions} = require("./apostas")


module.exports = async message => {
    message.reply({content: "Seleciones sua(s) aposta(s)!", components: roletaOptions})
}
