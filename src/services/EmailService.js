const captureException = require('../observability/Sentry')
const axios = require('axios')
const url = "https://communication-service-4f4f57e0a956.herokuapp.com/email"

function sendEmail(data) {
    const {
        to,
        subject,
        message
    } = data

    axios.default.post(url, {
        to,
        subject,
        message
    })
        .then(({ data }) => console.log(data))
        .catch(captureException)
}

module.exports = sendEmail