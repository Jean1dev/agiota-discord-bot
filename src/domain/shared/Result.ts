/**
 * Result<T, E> — tipo explícito para operações que podem falhar.
 *
 * Elimina throws silenciosos: o chamador é obrigado pelo sistema de tipos
 * a tratar o caso de erro antes de acessar o valor.
 *
 * Uso:
 *   // Produzir
 *   return Result.ok(debtUser)
 *   return Result.err(new DomainError('Valor inválido'))
 *
 *   // Consumir
 *   const result = await useCase.execute(dto)
 *   if (!result.ok) {
 *     logger.error({ err: result.error }, 'Falha no caso de uso')
 *     return
 *   }
 *   doSomethingWith(result.value)
 */

export type ResultOk<T> = { readonly ok: true; readonly value: T }
export type ResultErr<E extends Error> = { readonly ok: false; readonly error: E }
export type Result<T, E extends Error = Error> = ResultOk<T> | ResultErr<E>

export const Result = {
  ok<T>(value: T): ResultOk<T> {
    return { ok: true, value }
  },

  err<E extends Error>(error: E): ResultErr<E> {
    return { ok: false, error }
  },

  /**
   * Executa um bloco async e captura exceções como ResultErr,
   * evitando try/catch repetitivo nos use cases.
   *
   * Exemplo:
   *   const result = await Result.fromAsync(() => repo.save(entity))
   */
  async fromAsync<T>(fn: () => Promise<T>): Promise<Result<T>> {
    try {
      return Result.ok(await fn())
    } catch (err) {
      return Result.err(err instanceof Error ? err : new Error(String(err)))
    }
  },
}
