const { consultarTransacoesDoDia } = require("../../services/myDailyBudget");
const { requireAdmin } = require("../guard-handler");

function parseDate(dateString) {
    const parts = dateString.split('/');

    let day, month, year;
    if (parts.length === 3) {
        day = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
        year = parseInt(parts[2]);
    } else if (parts.length === 2) {
        const currentYear = new Date().getFullYear();
        day = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
        year = currentYear;
    } else {
        throw new Error('Formato de data inválido');
    }

    const date = new Date(year, month, day);
    if (isNaN(date.getTime())) {
        throw new Error('Data inválida');
    }

    return date;
}

function handler(args, message) {

    const dataParaBusca = parseDate(args[0])

    consultarTransacoesDoDia(dataParaBusca)
        .then(resultado => {
            if (resultado.length === 0) {
                message.reply("Não há transações para esta data.")
                return
            }

            message.reply(resultado.join("\n"))
        })
}

module.exports = (args, message) => requireAdmin(args, message, handler)