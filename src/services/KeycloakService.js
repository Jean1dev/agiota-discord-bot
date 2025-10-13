const {
    ADMIN_KC_CLIENT_ID,
    ADMIN_KC_USERNAME,
    ADMIN_KC_PASSWORD,
} = require('../config')
const axios = require('axios').default
const qs = require('querystring')
const captureException = require('../observability/Sentry')

async function getKeycloakToken() {
    const data = qs.stringify({
        grant_type: 'password',
        client_id: ADMIN_KC_CLIENT_ID,
        username: ADMIN_KC_USERNAME,
        password: ADMIN_KC_PASSWORD
    })

    const config = {
        method: 'post',
        url: 'https://lemur-5.cloud-iam.com/auth/realms/caixinha-auth-server/protocol/openid-connect/token',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: data
    }

    try {
        const response = await axios.request(config)
        return response.data.access_token
    } catch (error) {
        console.error('Erro ao obter token Keycloak:', error.message)
        captureException(error)
        throw error
    }
}

module.exports = {
    getKeycloakToken
}
