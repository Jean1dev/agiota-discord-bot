import { Telegram } from 'telegraf'
import { TELEGRAM_API_KEY, AUTHORIZED_CHAT_ID } from './TelegramConfig'
import { createLogger } from '../shared/logger/Logger'

const log = createLogger('TelegramUtils')

const telegram = new Telegram(TELEGRAM_API_KEY)

export { telegram }

export function enviarMensagemParaMim(message: string): void {
  telegram.sendMessage(String(AUTHORIZED_CHAT_ID), message)
    .catch(err => log.error({ err }, 'enviarMensagemParaMim failed'))
}

export function enviarMensagemHTML(message: string, chatID: string | number): void {
  telegram.sendMessage(String(chatID), message, { parse_mode: 'HTML' })
    .catch(err => log.error({ err }, 'enviarMensagemHTML failed'))
}

export function isAuthorizedUser(chatId: number): boolean {
  return chatId === AUTHORIZED_CHAT_ID
}

export async function enviarMensagemParaUsuario(
  userId: string | number,
  message: string,
): Promise<void> {
  await telegram.sendMessage(String(userId), message)
    .catch(err => log.error({ err, userId }, 'enviarMensagemParaUsuario failed'))
}
