import { AdminGuard } from '../../guards/AdminGuard'
import { ConfigAuthorizationService } from '../../guards/AuthorizationService'
import { WhatsAppConfigCommand } from './WhatsAppConfigCommand'
import { WhatsAppClearCommand } from './WhatsAppClearCommand'
import { WhatsAppTestCommand } from './WhatsAppTestCommand'

const auth = new ConfigAuthorizationService(process.env.ADMIN_DISCORD_USER_IDS ?? '')
const adminGuard = new AdminGuard(auth)

const zapConfigCommand = adminGuard.protect(new WhatsAppConfigCommand())
const zapClearCommand = adminGuard.protect(new WhatsAppClearCommand())
const zapTestCommand = adminGuard.protect(new WhatsAppTestCommand())

export const configWhatsAppHandler = zapConfigCommand.asNoArgsHandler()
export const clearWhatsAppHandler = zapClearCommand.asNoArgsHandler()
export const testWhatsAppHandler = zapTestCommand.asNoArgsHandler()
