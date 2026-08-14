import { ReadingTracker } from './ReadingTracker'

/**
 * Contrato do repositório de débito de leitura.
 * Use cases dependem desta interface, não da implementação concreta.
 */
export interface IReadingRepository {
  /** Retorna o estado atual do tracker de leitura. */
  get(): Promise<ReadingTracker>

  /** Persiste o estado do tracker de leitura. */
  save(tracker: ReadingTracker): Promise<void>
}
