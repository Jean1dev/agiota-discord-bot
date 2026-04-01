const { AdminGuard } = require('../../guards/AdminGuard')
const { ConfigAuthorizationService } = require('../../guards/AuthorizationService')
const { AddBudgetCommand } = require('./AddBudgetCommand')
const { UpdateCardExpensesCommand } = require('./UpdateCardExpensesCommand')
const { BudgetReportCommand } = require('./BudgetReportCommand')
const { SearchDayExpensesCommand } = require('./SearchDayExpensesCommand')
const { UltimoEmprestimoCommand } = require('./UltimoEmprestimoCommand')

const auth = new ConfigAuthorizationService(process.env.ADMIN_DISCORD_USER_IDS ?? '')
const adminGuard = new AdminGuard(auth)

const addBudgetCommand = adminGuard.protect(new AddBudgetCommand())
const updateCardCommand = adminGuard.protect(new UpdateCardExpensesCommand())
const budgetReportCommand = adminGuard.protect(new BudgetReportCommand())
const searchDayCommand = adminGuard.protect(new SearchDayExpensesCommand())
const ultimoEmprestimoCommand = new UltimoEmprestimoCommand()

module.exports = {
  addDailyBudgetHandler: addBudgetCommand.asHandler(),
  updateGastosCartaoHandler: updateCardCommand.asHandler(),
  relatorioMensalDeGastosHandler: budgetReportCommand.asNoArgsHandler(),
  buscarGastoNoDiaHandler: searchDayCommand.asHandler(),
  ultimoEmprestimoInfoHandler: ultimoEmprestimoCommand.asNoArgsHandler(),
}
