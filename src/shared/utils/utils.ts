export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function nowInSaoPaulo(): Date {
  const date = new Date()
  const utcOffset = -3
  return new Date(date.getTime() + utcOffset * 60 * 60 * 1000)
}
