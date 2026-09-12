export class ReadingTracker {
  constructor(readonly pages: number = 0) {}

  get pagesDebt(): number {
    return 0 - this.pages
  }

  get hasDebt(): boolean {
    return this.pages < 0
  }

  subtract(pages: number): ReadingTracker {
    if (pages <= 0) throw new Error('Quantidade de páginas da meta deve ser maior que zero')
    return new ReadingTracker(this.pages - pages)
  }

  add(pages: number): ReadingTracker {
    if (pages <= 0) throw new Error('Quantidade de páginas lidas deve ser maior que zero')
    return new ReadingTracker(this.pages + pages)
  }
}
