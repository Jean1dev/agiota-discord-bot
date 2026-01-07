const { TELEGRAM_API_KEY } = require('../../config')

const AUTHORIZED_CHAT_ID = 512142034

const KEYBOARDS = {
    dailyBudget: {
        keyboard: [
            ['My Daily budget'],
            ['spent money'],
            ['batch'],
        ],
        resize_keyboard: true
    },
    publicUser: {
        keyboard: [
            ['📊 Ver minha assinatura'],
            ['✉️ Alterar email'],
            ['ℹ️ Ajuda'],
        ],
        resize_keyboard: true
    }
}

const SUBSCRIPTION_PURCHASE_URL = 'https://market.arbitragem-crypto.cloud/'

module.exports = {
    TELEGRAM_API_KEY,
    AUTHORIZED_CHAT_ID,
    KEYBOARDS,
    SUBSCRIPTION_PURCHASE_URL
}

