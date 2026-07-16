import { Comando } from '../../../src/commands/comandos-struct'

describe('lista-comandos', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('registra apenas o comando unificado de gastos mensais', () => {
    const handler = async () => undefined

    jest.doMock('../../../src/discord/commands/debt', () => ({
      addDividaHandler: handler,
      pagarDividaHandler: handler,
      cobrarDividaHandler: handler,
    }))
    jest.doMock('../../../src/discord/commands/finance', () => ({
      addDailyBudgetHandler: handler,
      updateGastosCartaoHandler: handler,
      relatorioMensalDeGastosHandler: handler,
      buscarGastoNoDiaHandler: handler,
      ultimoEmprestimoInfoHandler: handler,
    }))
    jest.doMock('../../../src/discord/commands/game', () => ({
      jogoBixoHandler: handler,
      estatisticasJogoBixoHandler: handler,
    }))
    jest.doMock('../../../src/discord/commands/ai', () => ({
      chatGpt: handler,
      changeIaMode: handler,
    }))
    jest.doMock('../../../src/discord/commands/b3', () => ({
      arbitragemHandler: handler,
      changeAutoArbitragemHandler: handler,
      atualizarCotacaoHandler: handler,
    }))
    jest.doMock('../../../src/discord/commands/admin', () => ({
      restartHandler: handler,
      dbCleanHandler: handler,
      meconecteiHandler: handler,
      updateMonthlySpendingHandler: handler,
    }))
    jest.doMock('../../../src/discord/commands/subscriptions', () => ({
      assinaturasHandler: handler,
      assinaturasAtivasHandler: handler,
    }))
    jest.doMock('../../../src/discord/commands/media', () => ({
      helpHandler: handler,
      imgurHandler: handler,
    }))
    jest.doMock('../../../src/discord/commands/whatsapp', () => ({
      configWhatsAppHandler: handler,
      clearWhatsAppHandler: handler,
      testWhatsAppHandler: handler,
    }))
    jest.doMock('../../../src/discord/commands/youtube', () => ({
      youtubeAuthHandler: handler,
      youtubeWatchLaterHandler: handler,
      youtubeWatchLaterClearHandler: handler,
    }))
    jest.doMock('../../../src/discord/commands/web3', () => ({
      airDropHandler: handler,
    }))
    jest.doMock('../../../src/discord/commands/audio', () => ({
      musicPlayerHandler: handler,
      recordHandler: handler,
      uploadRecordsHandler: handler,
      realTimeConversaHandler: handler,
    }))

    const comandos = require('../../../src/commands/comandos-struct').default as Comando[]
    require('../../../src/commands/lista-comandos')

    const commandNames = comandos.map(c => c.comando)
    expect(commandNames).toContain('atualizar-gastos')
    expect(commandNames).not.toContain('atualizar-juros')
    expect(commandNames).not.toContain('food-spending')

    const unifiedCommand = comandos.find(c => c.comando === 'atualizar-gastos')
    expect(unifiedCommand?.needArgs).toBe(false)
    expect(unifiedCommand?.descricao).toContain('juros e alimentação')
  })
})
