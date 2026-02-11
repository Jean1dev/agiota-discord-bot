const axios = require('axios')
const config = require('../config')

const BASE_URL = config.ME_CONECTEI_API_URL || 'https://me-conectei-svc-temp-4f6577936f24.herokuapp.com'

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' }
})

function generatePassword(length = 12) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const allChars = uppercase + lowercase + numbers
  let password = ''
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

async function createAdminUser(email, password) {
  const { data } = await client.post('/admin/createAdminUser', { email, password })
  return data
}

async function getCompanyProxy(query) {
  const { data } = await client.get('/company/proxy', { params: { query } })
  return data
}

async function getClientSearch(latitude, longitude) {
  const { data } = await client.get('/client/search', {
    params: { lat: latitude, lng: longitude }
  })
  return data
}

async function postPessoasInteressadas(payload) {
  const { data } = await client.post('/client/pessoas-interessadas', payload)
  return data
}

module.exports = {
  generatePassword,
  createAdminUser,
  getCompanyProxy,
  getClientSearch,
  postPessoasInteressadas
}
