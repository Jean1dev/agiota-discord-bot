// Analytics
export { registrarEntradaTexto, getRegistros, clearRegistros, rankearUso, exibirRankingNoChat } from './analytics/UserAnalyticsService'

// Github
export { listarAsUltimasFeatures } from './github/GithubService'

// PDF
export { criarPDFRetornarCaminho } from './pdf/PdfService'

// Finance - Caixinha
export { notificar as notificacaoCaixinha } from './finance/CaixinhaService'

// Finance - FinanceService
export { default as financeServices } from './finance/FinanceService'

// Music
export { addMusic, ramdomMusic } from './music/MusicManagerService'

// Crypto
export { processAMQPMessage as cryptoServiceProcessMessage, forceArbitrage, rotinaDiariaCrypto, futureCrossingCounts } from './b3/CryptoArbitrageService'

// Daily Budget — expose as namespace object for myDailyBudgetService.fillDaylyBudgetState()
import * as _dailyBudget from './finance/DailyBudgetService'
export const myDailyBudgetService = _dailyBudget
export { gerarRelatorioFechamentoCompentencia } from './finance/DailyBudgetService'

// Broadcast
export { broadcastDiscord, sendToChannel } from './discord/BroadcastService'

// Upload
import * as _upload from './upload/UploadService'
export const UploadService = _upload

// Quiz
export { runQuizTask } from './quiz/QuizService'

// GastosCartao — expose as namespace object
import * as _gastosCartao from './finance/GastosCartaoService'
export const gastosCartao = _gastosCartao

// Organizze
import * as _organizze from './finance/OrganizzeService'
export const organizzeService = _organizze

// Transaction categorization
import * as _txCat from './finance/TransactionCategorizationService'
export const transactionCategorizationService = _txCat

// Auto Arbitrage
export { startAutoArbitrage } from './b3/AutoArbitrageService'

// YouTube RSS
import * as _youtubeRss from './youtube/YoutubeRssService'
export const youtubeRssService = _youtubeRss
