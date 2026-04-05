import { EventEmitter } from 'events'

/** Mapa de todos os eventos da aplicação com seus payloads tipados. */
export interface AppEventMap {
  'update-state-jogo-bixo': [payload: null]
  'notification-emprestimo': []
  'enviar-mensagem-telegram': [payload: string | { message: string; chatId: string }]
  'enviar-mensagem-discord': [payload: { message: string }]
}

export class AppEvents extends EventEmitter {
  emit<K extends keyof AppEventMap>(event: K, ...args: AppEventMap[K]): boolean {
    return super.emit(event, ...args)
  }

  on<K extends keyof AppEventMap>(
    event: K,
    listener: (...args: AppEventMap[K]) => void,
  ): this {
    return super.on(event, listener as (...a: unknown[]) => void)
  }

  once<K extends keyof AppEventMap>(
    event: K,
    listener: (...args: AppEventMap[K]) => void,
  ): this {
    return super.once(event, listener as (...a: unknown[]) => void)
  }
}

export const appEvents = new AppEvents()
