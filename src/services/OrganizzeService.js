const axios = require('axios')
const captureException = require('../observability/Sentry')

const apiCall = axios.create({
    baseURL: 'https://organizze-service-50474ce67034.herokuapp.com',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
        'client-info': 'discord-bot'
    }
})

function handleAxiosException(e) {
    if (e.isAxiosError) {
        console.error('Erro na API do Organizze:', e.response?.data || e.message)
        return
    }
    captureException(e)
}

async function getCategories() {
    try {
        const response = await apiCall.get('/categories')
        return response.data
    } catch (error) {
        handleAxiosException(error)
        throw error
    }
}

async function getCategory(id) {
    try {
        const response = await apiCall.get(`/categories/${id}`)
        return response.data
    } catch (error) {
        handleAxiosException(error)
        throw error
    }
}

async function createTransaction(transactionData) {
    const {
        description,
        notes,
        category_id,
        amount_cents
    } = transactionData
    try {
        const response = await apiCall.post('/transactions', {
            description,
            notes,
            category_id,
            amount_cents
        })
        return response.data
    } catch (error) {
        handleAxiosException(error)
        throw error
    }
}

async function getExpensesCategories() {
    const categories = await getCategories()
    return categories.filter(category => category.kind === 'expenses')
}

module.exports = {
    getCategories,
    getCategory,
    createTransaction,
    getExpensesCategories
}
