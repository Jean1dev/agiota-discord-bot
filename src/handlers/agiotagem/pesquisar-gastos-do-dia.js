const { consultarTransacoesDoDia } = require("../../services/myDailyBudget")

function parseDate(dateString) {
    // Separar os componentes da data
    const parts = dateString.split('/');
    
    // Obter dia, mês e ano dos componentes
    let day, month, year;
    if (parts.length === 3) {
        // Se houver três partes, assumimos o formato DD/MM/YYYY
        day = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1; // Os meses em JavaScript são zero-indexed
        year = parseInt(parts[2]);
    } else if (parts.length === 2) {
        // Se houver duas partes, assumimos o formato DD/MM e usamos o ano atual
        const currentYear = new Date().getFullYear();
        day = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
        year = currentYear;
    } else {
        // Formato inválido
        throw new Error('Formato de data inválido');
    }

    // Criar objeto Date
    const date = new Date(year, month, day);

    // Verificar se a data é válida
    if (isNaN(date.getTime())) {
        throw new Error('Data inválida');
    }

    return date;
}

module.exports = (args, message) => {
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