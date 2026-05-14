import comandos from './comandos-struct'
import { addDividaHandler, pagarDividaHandler, cobrarDividaHandler } from '../discord/commands/debt'
import { addDailyBudgetHandler, updateGastosCartaoHandler, relatorioMensalDeGastosHandler, buscarGastoNoDiaHandler, ultimoEmprestimoInfoHandler } from '../discord/commands/finance'
import { jogoBixoHandler, estatisticasJogoBixoHandler } from '../discord/commands/game'
import { chatGpt, changeIaMode } from '../discord/commands/ai'
import { arbitragemHandler, changeAutoArbitragemHandler, crossingCountsHandler, atualizarCotacaoHandler } from '../discord/commands/b3'
import { restartHandler, dbCleanHandler, meconecteiHandler, updateInterestHandler, foodSpendingHandler } from '../discord/commands/admin'
import { assinaturasHandler, assinaturasAtivasHandler } from '../discord/commands/subscriptions'
import { helpHandler, imgurHandler } from '../discord/commands/media'
import { configWhatsAppHandler, clearWhatsAppHandler, testWhatsAppHandler } from '../discord/commands/whatsapp'
import { youtubeAuthHandler, youtubeWatchLaterHandler, youtubeWatchLaterClearHandler } from '../discord/commands/youtube'
import { airDropHandler } from '../discord/commands/web3'
import { musicPlayerHandler, recordHandler, uploadRecordsHandler, realTimeConversaHandler } from '../discord/commands/audio'

function registrarComando(
  comando: string,
  handler: (...args: any[]) => Promise<unknown>,
  descricao: string,
  needArgs = false
): void {
  comandos.push({ comando, handler, descricao, needArgs })
}

registrarComando('help', helpHandler, 'lista os comandos disponíveis')
registrarComando('add-divida', addDividaHandler, 'Adicionar uma dívida :: $add-divida <valor> <@usuario> [descrição]', true)
registrarComando('cobrar', cobrarDividaHandler, 'Lista usuários com débitos em aberto')
registrarComando('pagar', pagarDividaHandler, 'Registra um pagamento :: $pagar <valor>', true)
registrarComando('budget', addDailyBudgetHandler, 'Adiciona valor ao orçamento diário :: $budget <valor>', true)
registrarComando('relatorio', relatorioMensalDeGastosHandler, 'Gera relatório mensal de gastos')
registrarComando('bg', buscarGastoNoDiaHandler, 'Busca transações do dia :: $bg <DD/MM>', true)
registrarComando('card', updateGastosCartaoHandler, 'Atualiza gastos do cartão :: $card <valor>', true)
registrarComando('bixo', jogoBixoHandler, 'Aposta no jogo do bixo :: $bixo <0-99>', true)
registrarComando('bixo-data', estatisticasJogoBixoHandler, 'Estatísticas do jogo do bixo')
registrarComando('gpt', chatGpt, 'Tire dúvidas com o ChatGPT :: $gpt <pergunta>', true)
registrarComando('ia', changeIaMode, 'Liga ou desliga a IA')
registrarComando('arb', arbitragemHandler, 'Executa rounds de arbitragem :: $arb <quantidade>', true)
registrarComando('auto-arb', changeAutoArbitragemHandler, 'Alterna auto-arbitragem (admin)')
registrarComando('cr-counts', crossingCountsHandler, 'POST crossing-counts (admin)')
registrarComando('acao', atualizarCotacaoHandler, 'Atualiza cotações da carteira')
registrarComando('rs', restartHandler, 'Reinicia a aplicação (admin)')
registrarComando('db-clean', dbCleanHandler, 'Limpa banco crypto (admin)')
registrarComando('meconectei', meconecteiHandler, 'Cria conta admin no Me Conectei :: $meconectei <email> (admin)', true)
registrarComando('atualizar-juros', updateInterestHandler, 'Atualiza o gasto mensal de juros e envia e-mail ao admin (admin)')
registrarComando('food-spending', foodSpendingHandler, 'Atualiza o gasto mensal com alimentação e envia e-mail ao admin (admin)')
registrarComando('sub', assinaturasHandler, 'Cria assinatura de 30 dias :: $sub <email> (admin)', true)
registrarComando('ass', assinaturasAtivasHandler, 'Lista assinaturas ativas (admin)')
registrarComando('rec', recordHandler, 'Grava áudio :: $rec <segundos>', true)
registrarComando('uprec', uploadRecordsHandler, 'Upload das gravações para o Google Drive')
registrarComando('imgur', imgurHandler, 'Busca 5 imagens aleatórias do Imgur')
registrarComando('conversa', realTimeConversaHandler, 'Conversa em tempo real com o ChatGPT')
registrarComando('ad', airDropHandler, 'Airdrop de SOL :: $ad <valor> <carteira> <cluster>', true)
registrarComando('up', ultimoEmprestimoInfoHandler, 'Mostra o último empréstimo')
registrarComando('p', musicPlayerHandler, 'Liga o player de música')
registrarComando('zap-config', configWhatsAppHandler, 'Inicia vinculação do WhatsApp (QR code) — admin')
registrarComando('zap-clear', clearWhatsAppHandler, 'Remove sessão do WhatsApp — admin')
registrarComando('zap-test', testWhatsAppHandler, 'Envia mensagem de teste via WhatsApp — admin')
registrarComando('yt-auth', youtubeAuthHandler, 'Autoriza o bot no YouTube')
registrarComando('yt-wl', youtubeWatchLaterHandler, 'Envia vídeos para a playlist Watch Later')
registrarComando('yt-clear', youtubeWatchLaterClearHandler, 'Remove todos os vídeos da playlist configurada')
