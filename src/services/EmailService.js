const { COMMUNICATION_SERVER_URL } = require('../config')
const captureException = require('../observability/Sentry')
const axios = require('axios')
const url = `${COMMUNICATION_SERVER_URL}/email`

function sendEmail(payload) {
    axios.default.post(url, payload)
        .then(({ data }) => console.log(data))
        .catch(captureException)
}

module.exports = sendEmail