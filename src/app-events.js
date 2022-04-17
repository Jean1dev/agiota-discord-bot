const { updateStateAfterDataLoad } = require('./handlers/jogo-bixo/game-functions')

const EventEmitter = require('events')

class AppEvents extends EventEmitter { }

const appEvents = new AppEvents()

appEvents.on('update-state-jogo-bixo', () => {
    console.info('event::', 'update-state-jogo-bixo')
    updateStateAfterDataLoad()
})

module.exports = appEvents