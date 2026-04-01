import { AdminGuard } from '../../guards/AdminGuard'
import { ConfigAuthorizationService } from '../../guards/AuthorizationService'
import { AddBudgetCommand } from './AddBudgetCommand'
import { UpdateCardExpensesCommand } from './UpdateCardExpensesCommand'
import { BudgetReportCommand } from './BudgetReportCommand'
import { SearchDayExpensesCommand } from './SearchDayExpensesCommand'
import { UltimoEmprestimoCommand } from './UltimoEmprestimoCommand'

const auth = new ConfigAuthorizationService(process.env.ADMIN_DISCORD_USER_IDS ?? '')
const adminGuard = new AdminGuard(auth)

const addBudgetCommand = adminGuard.protect(new AddBudgetCommand())
const updateCardCommand = adminGuard.protect(new UpdateCardExpensesCommand())
const budgetReportCommand = adminGuard.protect(new BudgetReportCommand())
const searchDayCommand = adminGuard.protect(new SearchDayExpensesCommand())
const ultimoEmprestimoCommand = new UltimoEmprestimoCommand()

export const addDailyBudgetHandler = addBudgetCommand.asHandler()
export const updateGastosCartaoHandler = updateCardCommand.asHandler()
export const relatorioMensalDeGastosHandler = budgetReportCommand.asNoArgsHandler()
export const buscarGastoNoDiaHandler = searchDayCommand.asHandler()
export const ultimoEmprestimoInfoHandler = ultimoEmprestimoCommand.asNoArgsHandler()
