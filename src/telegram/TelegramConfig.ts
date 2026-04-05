import { env } from '../config/env'

export const TELEGRAM_API_KEY = env.TELEGRAM_API_KEY ?? ''
export const AUTHORIZED_CHAT_ID = 512142034

export const KEYBOARDS = {
  dailyBudget: {
    keyboard: [['My Daily budget'], ['spent money'], ['batch']] as string[][],
    resize_keyboard: true,
  },
  publicUser: {
    keyboard: [['📊 Ver minha assinatura'], ['✉️ Alterar email'], ['ℹ️ Ajuda']] as string[][],
    resize_keyboard: true,
  },
}

export const SUBSCRIPTION_PURCHASE_URL = 'https://market.arbitragem-crypto.cloud/'
