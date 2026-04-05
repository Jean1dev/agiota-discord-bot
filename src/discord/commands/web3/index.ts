import { AirDropCommand } from './AirDropCommand'

const airDropCommand = new AirDropCommand()

export const airDropHandler = airDropCommand.asHandler()
