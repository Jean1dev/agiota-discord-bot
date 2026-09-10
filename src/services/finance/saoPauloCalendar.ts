const SAO_PAULO = 'America/Sao_Paulo'

function saoPauloParts(now: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SAO_PAULO,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now)

  const year = Number(parts.find(p => p.type === 'year')?.value)
  const month = Number(parts.find(p => p.type === 'month')?.value)
  const day = Number(parts.find(p => p.type === 'day')?.value)
  return { year, month, day }
}

export function saoPauloYearMonth(now: Date = new Date()): { year: number; month: number } {
  const { year, month } = saoPauloParts(now)
  return { year, month }
}

export function saoPauloDateString(now: Date = new Date()): string {
  const { year, month, day } = saoPauloParts(now)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function saoPauloMonthRange(now: Date = new Date()): {
  year: number
  month: number
  startDate: string
  endDate: string
} {
  const { year, month } = saoPauloYearMonth(now)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const mm = String(month).padStart(2, '0')
  return {
    year,
    month,
    startDate: `${year}-${mm}-01`,
    endDate: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
  }
}

export function lastNSaoPauloMonths(
  n: number,
  now: Date = new Date(),
): Array<{ year: number; month: number }> {
  const { year, month } = saoPauloYearMonth(now)
  const months: Array<{ year: number; month: number }> = []
  let y = year
  let m = month
  for (let i = 0; i < n; i++) {
    months.push({ year: y, month: m })
    m -= 1
    if (m < 1) {
      m = 12
      y -= 1
    }
  }
  return months.reverse()
}

export function parseIsoDate(dateStr: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr)
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]) }
}
