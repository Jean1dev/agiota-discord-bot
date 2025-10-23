const comandos = require('./comandos-struct')

const {
  addDividaHandler,
  cobrarDividaHandler,
  pagarDividaHandler,
  helpHandler,
  recordHandler,
  uploadRecords,
  changeIaMode,
  jogoBixoHandler,
  estatisticasJogoBixoHandler,
  musicPlayerHanlder,
  atualizarCotacaoHandler,
  chatGpt,
  imgur,
  addDailyBudgetHandler,
  relatorioMensalDeGastosHandler,
  buscarGastoNoDiaHandler,
  assinaturasHandler,
  realTimeConversaGpt,
  airDropHandler,
  updateGastosCartaoHandler,
  ultimoEmprestimoInfoHandler,
  arbitragemHandler,
  changeAutoArbitragemHandler,
  assinaturasAtivasHandler,
  restartHandler,
  dbCleanHandler
} = require('../handlers')

function registrarComando(comando, handler, descricao, needArgs = false) {
  comandos.push({
    comando,
    handler,
    descricao,
    needArgs
  })
}

registrarComando('help', helpHandler, 'lista os comandos disponiveis')
registrarComando('add-divida', addDividaHandler, 'Adicionar uma divida para um usuario :: args @valor @usuario @descricao', true)
registrarComando('cobrar', cobrarDividaHandler, 'Lista os usuarios que possuem debitos')
registrarComando('pagar', pagarDividaHandler, 'Paga a divida :: args @valorPago', true)
registrarComando('rec', recordHandler, 'grava audio por X tempo em segundos :: args @tempo', true)
registrarComando('uprec', uploadRecords, 'faz upload das gravações para o google drive')
registrarComando('ia', changeIaMode, 'liga ou desliga a inteligencia artifical')
registrarComando('bixo', jogoBixoHandler, 'aposta em um bixo no jogo do bixo :: args @numero', true)
registrarComando('bixo-data', estatisticasJogoBixoHandler, 'gera as estatisticas do bixo')
registrarComando('p', musicPlayerHanlder, 'Liga o player de musica')
registrarComando('acao', atualizarCotacaoHandler, 'atualizar cotacoes no app da carteira')
registrarComando('gpt', chatGpt, 'Tire suas dúvidas com o chatgpt', true)
registrarComando('imgur', imgur, 'Busca 5 imagens aleatorias do imgur')
registrarComando('budget', addDailyBudgetHandler, 'Adiciona um valor no orcamento diario de gastos', true)
registrarComando('relatorio', relatorioMensalDeGastosHandler, 'Gera o relatorio mensal de gastos do Jean')
registrarComando('bg', buscarGastoNoDiaHandler, 'Busca as transacoes do dia enviado por parametro no formato DD/MM', true)
registrarComando('sub', assinaturasHandler, 'Cria uma nova assinatura de 30 dias :: args @email', true)
registrarComando('conversa', realTimeConversaGpt, 'Converse com o chat gpt')
registrarComando('ad', airDropHandler, 'Faz um airdrop de SOL para os usuarios :: @args @valor @carteira, @cluster', true)
registrarComando('card', updateGastosCartaoHandler, 'Atualiza os gastos do cartao de credito :: args @valor', true)
registrarComando('up', ultimoEmprestimoInfoHandler, 'Mostra o ultimo emprestimo solicitado')
registrarComando('arb', arbitragemHandler, 'Verifica oportunidades de arbitragem em exchanges :: args @quantidade_execucoes', true)
registrarComando('auto-arb', changeAutoArbitragemHandler, 'Altera o status da auto arbitragem (apenas JEAN)')
registrarComando('ass', assinaturasAtivasHandler, 'Verifica as assinaturas ativas')
registrarComando('rs', restartHandler, 'Reinicia a aplicação (apenas JEAN)')
registrarComando('db-clean', dbCleanHandler, 'Executa migração de coleções e limpa o banco crypto2 (apenas JEAN)')
