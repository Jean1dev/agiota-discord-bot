import { Client } from 'discord.js'
import { appEvents } from './shared/events/AppEvents'
import { getContextState, saveContextState } from './infrastructure/database/MongoRepository'
import { createLogger } from './shared/logger/Logger'

const log = createLogger('Context')

export interface AppContext {
    dividas: any[]
    client: Client
    gravacoes: string[]
    isIAEnabled: boolean
    isChatGPTEnabled: boolean
    jogoAberto: boolean
    jogo: any
    totalGastoCartao: number
    autoArbitragem: boolean
    conversationHistory: any[]
    setClient(client: Client): void
    changeAutoArbitragem(): void
    emitEvent(eventName: string, payload: unknown): void
    fillState(): Promise<void>
    save(): void
}

const state: { context: AppContext | null } = {
    context: null,
}

class Context implements AppContext {
    dividas: any[] = []
    client!: Client
    gravacoes: string[] = []
    isIAEnabled = false
    isChatGPTEnabled = true
    jogoAberto = false
    jogo: any = null
    totalGastoCartao = 0
    autoArbitragem = false
    conversationHistory: any[] = []

    setClient(client: Client): void {
        this.client = client
    }

    changeAutoArbitragem(): void {
        this.autoArbitragem = !this.autoArbitragem
        this.save()
    }

    emitEvent(eventName: string, payload: unknown): void {
        appEvents.emit(eventName as any, payload as any)
    }

    async fillState(): Promise<void> {
        try {
            const data = await getContextState()
            this.dividas = data?.dividas as any[]
            this.jogoAberto = data?.jogoAberto
            this.jogo = data?.jogo
            this.totalGastoCartao = data?.totalGastoCartao || 0
            this.autoArbitragem = data.autoArbitragem

            appEvents.emit('update-state-jogo-bixo', null)
        } catch (error) {
            log.error({ err: error }, 'Erro ao carregar estado do contexto')
        }
    }

    save(): void {
        saveContextState({
            dividas: this.dividas,
            jogoAberto: this.jogoAberto,
            jogo: this.jogo,
            totalGastoCartao: this.totalGastoCartao,
            autoArbitragem: this.autoArbitragem,
        })
    }
}

export function contextInstance(): AppContext {
    return state.context!
}

export function createContext(): AppContext {
    state.context = new Context()
    return state.context
}
