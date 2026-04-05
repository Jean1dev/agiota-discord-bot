import { randomUUID } from 'crypto'

export interface Aposta {
  autor: string
  numero: number
  segundoNumero?: number
}

export interface DataInicioDetalhes {
  hourUTC: number
  day: number
}

export class Jogo {
  id: string
  data: Date
  dataInicioDetalhes: DataInicioDetalhes
  apostas: Aposta[]
  resultado?: unknown
  duracao = 8

  constructor() {
    this.id = randomUUID()
    this.data = new Date()
    this.dataInicioDetalhes = {
      hourUTC: new Date().getUTCHours(),
      day: new Date().getDay(),
    }
    this.apostas = []
  }

  registrarAposta(aposta: Aposta): void {
    this.apostas.push(aposta)
  }
}

export default Jogo
