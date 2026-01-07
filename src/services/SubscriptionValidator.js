const { getKeycloakToken } = require('./KeycloakService')
const axios = require('axios').default
const captureException = require('../observability/Sentry')
const { SUBSCRIPTION_SERVER_URL } = require('../config')

async function getSubscriptionByEmail(email) {
    try {
        const token = await getKeycloakToken()
        const config = {
            method: 'get',
            url: `${SUBSCRIPTION_SERVER_URL}/plano`,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }

        const response = await axios.request(config)
        const plans = response.data

        const userPlan = plans.find(plan => plan.email.toLowerCase() === email.toLowerCase())
        
        if (userPlan) {
            return {
                found: true,
                email: userPlan.email,
                vigenteAte: userPlan.vigenteAte,
                isActive: new Date(userPlan.vigenteAte) >= new Date()
            }
        }

        return { found: false }
    } catch (error) {
        console.error('Erro ao buscar subscrição:', error.message)
        captureException(error)
        return { found: false, error: error.message }
    }
}

async function getSubscriptionByEmailAllTenants(email) {
    try {
        const token = await getKeycloakToken()
        const config = {
            method: 'get',
            url: `${SUBSCRIPTION_SERVER_URL}/plano/buscar-todos-tenants?email=${encodeURIComponent(email)}`,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }

        const response = await axios.request(config)
        const tenantsData = response.data

        if (!tenantsData || tenantsData.length === 0) {
            return { found: false }
        }

        const planWithMaxVigence = tenantsData.reduce((max, current) => {
            const currentDate = new Date(current.plano.vigenteAte)
            const maxDate = new Date(max.plano.vigenteAte)
            return currentDate > maxDate ? current : max
        })

        return {
            found: true,
            email: planWithMaxVigence.plano.email,
            vigenteAte: planWithMaxVigence.plano.vigenteAte,
            tenant: planWithMaxVigence.tenant,
            isActive: new Date(planWithMaxVigence.plano.vigenteAte) >= new Date()
        }
    } catch (error) {
        console.error('Erro ao buscar subscrição em todos os tenants:', error.message)
        captureException(error)
        return { found: false, error: error.message }
    }
}

module.exports = {
    getSubscriptionByEmail,
    getSubscriptionByEmailAllTenants
}