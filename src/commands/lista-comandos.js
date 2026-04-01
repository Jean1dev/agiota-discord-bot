const comandos = require('./comandos-struct')

// ── Domínios migrados para TypeScript ─────────────────────────────────────
const { addDividaHandler, pagarDividaHandler, cobrarDividaHandler } = require('../discord/commands/debt')
const { addDailyBudgetHandler, updateGastosCartaoHandler, relatorioMensalDeGastosHandler, buscarGastoNoDiaHandler } = require('../discord/commands/finance')
const { jogoBixoHandler, estatisticasJogoBixoHandler } = require('../discord/commands/game')
const { chatGpt, changeIaMode } = require('../discord/commands/ai')
const { arbitragemHandler, changeAutoArbitragemHandler, crossingCountsHandler, atualizarCotacaoHandler } = require('../discord/commands/b3')
const { restartHandler, dbCleanHandler, meconecteiHandler } = require('../discord/commands/admin')
const { assinaturasHandler, assinaturasAtivasHandler } = require('../discord/commands/subscriptions')

// ── Handlers JS ainda não migrados ────────────────────────────────────────
const {
  helpHandler,
  recordHandler,
  uploadRecords,
  imgur,
  realTimeConversaGpt,
  airDropHandler,
  ultimoEmprestimoInfoHandler,
  configWhatsAppHandler,
  clearWhatsAppHandler,
  testWhatsAppHandler,
  youtubeAuthHandler,
  youtubeWatchLaterHandler,
  youtubeWatchLaterClearHandler,
  musicPlayerHanlder,
} = require('../handlers')

function registrarComando(comando, handler, descricao, needArgs = false) {
  comandos.push({ comando, handler, descricao, needArgs })
}

// ── Registro de todos os comandos ─────────────────────────────────────────
registrarComando('help',        helpHandler,                    'lista os comandos disponíveis')
registrarComando('add-divida',  addDividaHandler,               'Adicionar uma dívida :: $add-divida <valor> <@usuario> [descrição]', true)
registrarComando('cobrar',      cobrarDividaHandler,            'Lista usuários com débitos em aberto')
registrarComando('pagar',       pagarDividaHandler,             'Registra um pagamento :: $pagar <valor>', true)
registrarComando('budget',      addDailyBudgetHandler,          'Adiciona valor ao orçamento diário :: $budget <valor>', true)
registrarComando('relatorio',   relatorioMensalDeGastosHandler, 'Gera relatório mensal de gastos')
registrarComando('bg',          buscarGastoNoDiaHandler,        'Busca transações do dia :: $bg <DD/MM>', true)
registrarComando('card',        updateGastosCartaoHandler,      'Atualiza gastos do cartão :: $card <valor>', true)
registrarComando('bixo',        jogoBixoHandler,                'Aposta no jogo do bixo :: $bixo <0-99>', true)
registrarComando('bixo-data',   estatisticasJogoBixoHandler,    'Estatísticas do jogo do bixo')
registrarComando('gpt',         chatGpt,                        'Tire dúvidas com o ChatGPT :: $gpt <pergunta>', true)
registrarComando('ia',          changeIaMode,                   'Liga ou desliga a IA')
registrarComando('arb',         arbitragemHandler,              'Executa rounds de arbitragem :: $arb <quantidade>', true)
registrarComando('auto-arb',    changeAutoArbitragemHandler,    'Alterna auto-arbitragem (admin)')
registrarComando('cr-counts',   crossingCountsHandler,          'POST crossing-counts (admin)')
registrarComando('acao',        atualizarCotacaoHandler,        'Atualiza cotações da carteira')
registrarComando('rs',          restartHandler,                 'Reinicia a aplicação (admin)')
registrarComando('db-clean',    dbCleanHandler,                 'Limpa banco crypto (admin)')
registrarComando('meconectei',  meconecteiHandler,              'Cria conta admin no Me Conectei :: $meconectei <email> (admin)', true)
registrarComando('sub',         assinaturasHandler,             'Cria assinatura de 30 dias :: $sub <email> (admin)', true)
registrarComando('ass',         assinaturasAtivasHandler,       'Lista assinaturas ativas (admin)')
registrarComando('rec',         recordHandler,                  'Grava áudio :: $rec <segundos>', true)
registrarComando('uprec',       uploadRecords,                  'Upload das gravações para o Google Drive')
registrarComando('imgur',       imgur,                          'Busca 5 imagens aleatórias do Imgur')
registrarComando('conversa',    realTimeConversaGpt,            'Conversa em tempo real com o ChatGPT')
registrarComando('ad',          airDropHandler,                 'Airdrop de SOL :: $ad <valor> <carteira> <cluster>', true)
registrarComando('up',          ultimoEmprestimoInfoHandler,    'Mostra o último empréstimo')
registrarComando('p',           musicPlayerHanlder,             'Liga o player de música')
registrarComando('zap-config',  configWhatsAppHandler,          'Inicia vinculação do WhatsApp (QR code)')
registrarComando('zap-clear',   clearWhatsAppHandler,           'Remove sessão do WhatsApp')
registrarComando('zap-test',    testWhatsAppHandler,            'Envia mensagem de teste via WhatsApp')
registrarComando('yt-auth',     youtubeAuthHandler,             'Autoriza o bot no YouTube')
registrarComando('yt-wl',       youtubeWatchLaterHandler,       'Envia vídeos para a playlist Watch Later')
registrarComando('yt-clear',    youtubeWatchLaterClearHandler,  'Remove todos os vídeos da playlist configurada')
