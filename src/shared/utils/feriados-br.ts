import axios from 'axios'

const BRASIL_API_FERIADOS = 'https://brasilapi.com.br/api/feriados/v1'

export function getTodayInSaoPaulo(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

export async function fetchFeriadosDoAno(year: string): Promise<Set<string>> {
  const { data } = await axios.get<{ date: string }[]>(
    `${BRASIL_API_FERIADOS}/${year}`,
    { timeout: 10000 }
  )
  if (!Array.isArray(data)) return new Set()
  return new Set(data.map(item => item.date).filter(Boolean))
}

export async function isFeriadoHoje(): Promise<boolean> {
  const today = getTodayInSaoPaulo()
  const year = today.slice(0, 4)
  return fetchFeriadosDoAno(year)
    .then(holidays => holidays.has(today))
    .catch(() => false)
}
