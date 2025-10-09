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
    }
}

module.exports = {
    TELEGRAM_API_KEY,
    AUTHORIZED_CHAT_ID,
    KEYBOARDS
}

