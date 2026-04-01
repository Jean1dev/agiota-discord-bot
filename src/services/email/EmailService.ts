import axios from 'axios'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('EmailService')

const COMMUNICATION_SERVER_URL = 'https://communication-service-4f4f57e0a956.herokuapp.com'
const EMAIL_URL = `${COMMUNICATION_SERVER_URL}/email`

export interface EmailPayload {
  to: string
  subject: string
  body: string
  [key: string]: unknown
}

export function sendEmail(payload: EmailPayload): void {
  axios.post(EMAIL_URL, payload)
    .then(({ data }) => log.info({ data }, 'email sent'))
    .catch(err => log.error({ err }, 'failed to send email'))
}
