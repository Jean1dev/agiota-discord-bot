const { updateStateAfterDataLoad } = require('./handlers/jogo-bixo/game-functions')
const { searchingAndNotifyEmprestimos } = require('./services')

const EventEmitter = require('events')

class AppEvents extends EventEmitter { }

const appEvents = new AppEvents()

appEvents.on('update-state-jogo-bixo', () => {
    console.info('event::', 'update-state-jogo-bixo')
    updateStateAfterDataLoad()
})

appEvents.on('notification-emprestimo', () => {
    console.info('event::', 'notification-emprestimo')
    searchingAndNotifyEmprestimos()
})

module.exports = appEvents