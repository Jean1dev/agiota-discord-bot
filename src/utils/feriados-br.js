'use strict'

const axios = require('axios')

const BRASIL_API_FERIADOS = 'https://brasilapi.com.br/api/feriados/v1'

function getTodayInSaoPaulo() {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Sao_Paulo'
  })
}

async function fetchFeriadosDoAno(year) {
  const { data } = await axios.get(`${BRASIL_API_FERIADOS}/${year}`, {
    timeout: 10000
  })
  if (!Array.isArray(data)) return new Set()
  return new Set(data.map((item) => item.date).filter(Boolean))
}

function isFeriadoHoje() {
  const today = getTodayInSaoPaulo()
  const year = today.slice(0, 4)
  return fetchFeriadosDoAno(year)
    .then((holidays) => holidays.has(today))
    .catch(() => false)
}

module.exports = {
  getTodayInSaoPaulo,
  isFeriadoHoje,
  fetchFeriadosDoAno
}
