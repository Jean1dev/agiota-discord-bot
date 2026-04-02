export interface Comando {
  comando: string
  handler: (...args: any[]) => Promise<unknown>
  descricao: string
  needArgs: boolean
}

const comandos: Comando[] = []

export default comandos
