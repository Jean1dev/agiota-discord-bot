const { getKeycloakToken } = require('./KeycloakService')
const axios = require('axios').default
const captureException = require('../observability/Sentry')

async function getSubscriptionByEmail(email) {
    try {
        const token = await getKeycloakToken()
        const config = {
            method: 'get',
            url: 'https://o-auth-managment-server-6d5834301f7a.herokuapp.com/plano',
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

module.exports = {
    getSubscriptionByEmail
}
