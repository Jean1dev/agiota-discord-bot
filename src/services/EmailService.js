const captureException = require('../observability/Sentry')
const axios = require('axios')
const url = "https://communication-service-4f4f57e0a956.herokuapp.com/email"

function sendEmail(payload) {
    axios.default.post(url, payload)
        .then(({ data }) => console.log(data))
        .catch(captureException)
}

module.exports = sendEmail