const { AirDropCommand } = require('./AirDropCommand')

const airDropCommand = new AirDropCommand()

module.exports = {
  airDropHandler: airDropCommand.asHandler(),
}
