/// <reference lib="dom" />
import axios from 'axios'
import type { Message } from 'discord.js'
import fs from 'fs'
import puppeteer, { type Browser, type Page } from 'puppeteer'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('AtualizarCotacaoCarteira')

const baseUrl = 'https://carteira-14bc707a7fab.herokuapp.com/admin'
const yahooQuoteUrl = 'https://query1.finance.yahoo.com/v7/finance/quote'

const chromiumPaths = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean) as string[]

function getLaunchOptions(): Parameters<typeof puppeteer.launch>[0] {
  const executablePath = chromiumPaths.find(p => p && fs.existsSync(p))
  return executablePath ? { headless: true, executablePath } : { headless: true }
}

function toYahooSymbol(papel: string): string {
  const p = (papel || '').toUpperCase().trim()
  if (!p) return p
  if (p.endsWith('.SA') || p.endsWith('.SA.SA')) return p.replace(/\.SA\.SA$/, '.SA')
  return `${p}.SA`
}

const yahooHeaders = {
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://finance.yahoo.com/',
}

async function getLogoFromYahoo(papel: string): Promise<string | null> {
  const symbol = toYahooSymbol(papel)
  try {
    const { data } = await axios.get(yahooQuoteUrl, {
      params: { symbols: symbol, fields: 'companyLogoUrl,shortName' },
      timeout: 8000,
      headers: yahooHeaders,
    })
    const result = (data as { quoteResponse?: { result?: Array<{ companyLogoUrl?: string }> } })
      ?.quoteResponse?.result?.[0]
    const url = result?.companyLogoUrl
    if (url && url.startsWith('http')) {
      log.debug({ papel, url }, 'Logo encontrada via Yahoo')
      return url
    }
    log.debug({ papel }, 'Sem logo no Yahoo')
    return null
  } catch (err) {
    log.warn({ err, papel }, 'Erro ao buscar logo no Yahoo')
    return null
  }
}

async function getLogoFromYahooWithBrowser(page: Page, papel: string): Promise<string | null> {
  const symbol = toYahooSymbol(papel)
  try {
    const url = `https://finance.yahoo.com/quote/${symbol}`
    log.debug({ url }, 'Yahoo+Puppeteer: abrindo página')
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await new Promise(r => setTimeout(r, 2000))
    const logoUrl = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img')
      for (let i = 0; i < imgs.length; i++) {
        const img = imgs.item(i)
        if (!img) continue
        const s = (img.src || '').toLowerCase()
        if (
          s &&
          (s.includes('logo') || s.includes('yimg.com') || s.includes('media') || s.includes('brand')) &&
          !s.includes('favicon')
        ) {
          return img.src
        }
      }
      const firstDataImg = document.querySelector('img[data-src]') as HTMLImageElement | null
      if (firstDataImg?.dataset.src) return firstDataImg.dataset.src
      return null
    })
    if (logoUrl) {
      log.debug({ papel }, 'Yahoo+Puppeteer: logo encontrada')
      return logoUrl
    }
    return null
  } catch (err) {
    log.warn({ err, papel }, 'Yahoo+Puppeteer: erro')
    return null
  }
}

async function imgScrapeBing(page: Page, query: string): Promise<string[] | null> {
  try {
    const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(`${query} ação logo`)}&first=1`
    log.debug({ query }, 'Bing: buscando imagens')
    await page.goto(searchUrl, { waitUntil: 'networkidle0', timeout: 20000 })
    await page.waitForSelector('.iusc', { timeout: 10000 }).catch(() => null)
    await new Promise(r => setTimeout(r, 1500))

    const urls = await page.evaluate(() => {
      const out: string[] = []
      document.querySelectorAll('.iusc').forEach((el: Element) => {
        try {
          const m = el.getAttribute('m')
          if (m) {
            const obj = JSON.parse(m) as { murl?: string }
            if (obj.murl && obj.murl.startsWith('http')) out.push(obj.murl)
          }
        } catch {}
      })
      return out.slice(0, 5)
    })
    log.debug({ count: urls.length, query }, 'Bing: imagens encontradas')
    return urls.length ? urls : null
  } catch (err) {
    log.warn({ err, query }, 'Bing: erro ao buscar imagens')
    return null
  }
}

async function imgScrapeGoogle(page: Page, query: string): Promise<string[] | null> {
  try {
    log.debug({ query }, 'Google: buscando imagens')
    await page.goto(
      `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${query} ação`)}`,
      { waitUntil: 'networkidle2', timeout: 25000 },
    )
    await page.waitForSelector('img', { timeout: 10000 }).catch(() => null)
    await new Promise(r => setTimeout(r, 1500))

    const fromPage = await page.evaluate(() => {
      const urls: string[] = []
      document.querySelectorAll('img').forEach((img: HTMLImageElement) => {
        const url = (img.src || img.dataset.src || img.getAttribute('data-src') || '').trim()
        if (!url || !url.startsWith('http')) return
        urls.push(url)
      })
      return urls
    })

    const external = fromPage.filter((u: string) => !u.includes('gstatic.com') && !u.includes('google.com'))
    const thumbnails = fromPage.filter(
      (u: string) => u.includes('tbn0.gstatic.com') || u.includes('gstatic.com/images'),
    )
    const images = external.length ? external : thumbnails
    const result = images.slice(0, 3)
    log.debug({ count: result.length, query }, 'Google: imagens encontradas')
    return result.length ? result : null
  } catch (err) {
    log.warn({ err, query }, 'Google: erro ao buscar imagens')
    return null
  }
}

async function fetchImageWithBrowser(papel: string): Promise<string | null> {
  let browser: Browser | undefined
  let page: Page | undefined
  try {
    log.debug('Browser: iniciando Puppeteer')
    browser = await puppeteer.launch(getLaunchOptions())
    page = await browser.newPage()
    await page.setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    )
    await page.setViewport({ width: 1280, height: 800 })

    let url = await getLogoFromYahooWithBrowser(page, papel)
    if (url) return url

    const bingResults = await imgScrapeBing(page, papel)
    if (bingResults?.[0]) return bingResults[0]

    const googleResults = await imgScrapeGoogle(page, papel)
    if (googleResults?.[0]) return googleResults[0]

    return null
  } catch (err) {
    log.error({ err }, 'Browser: erro ao buscar imagem')
    return null
  } finally {
    if (page) {
      await page.close().catch(() => undefined)
    }
    if (browser) {
      await browser.close()
      log.debug('Browser: fechado')
    }
  }
}

function deleteMessageAfterTime(m: Message): void {
  setTimeout(() => {
    m.delete().catch(() => undefined)
  }, 10000)
}

export default async function atualizarCotacaoCarteira(message: Message): Promise<void> {
  log.info('Comando atualizar-carteira iniciado')
  void message.reply('momentinho vou verificar').then(m => deleteMessageAfterTime(m))

  log.debug({ baseUrl }, 'Disparando POST')
  await axios.post(baseUrl)

  const { data: listaAtivos } = await axios.get<string[]>(`${baseUrl}/ativos-sem-image`)
  log.info({ count: listaAtivos.length, ativos: listaAtivos }, 'Ativos sem imagem')
  if (listaAtivos.length === 0) {
    void message.reply('nenhum ativo para monitorar').then(m => deleteMessageAfterTime(m))
    return
  }

  const channel = message.channel
  if (!channel.isSendable()) return

  const ativoComImagem: Array<{ papel: string; imagem: string }> = []
  for (const papel of listaAtivos) {
    try {
      log.info({ papel }, 'Processando papel')
      let imageUrl = await getLogoFromYahoo(papel)
      if (!imageUrl) {
        imageUrl = await fetchImageWithBrowser(papel)
      }
      if (!imageUrl) {
        log.warn({ papel }, 'Sem imagem encontrada para o papel')
        void channel.send(`Nao consegui adicionar esse papel ${papel}`).then(m => deleteMessageAfterTime(m))
        continue
      }
      ativoComImagem.push({ papel, imagem: imageUrl })
      log.info({ papel }, 'Imagem obtida com sucesso')
    } catch (e) {
      log.error({ err: e, papel }, 'Erro ao processar papel')
      void channel.send(`Nao consegui adicionar esse papel ${papel}`).then(m => deleteMessageAfterTime(m))
    }
  }

  log.info({ count: ativoComImagem.length }, 'Atualizando ativos na API')
  for (const obj of ativoComImagem) {
    await axios.put(`${baseUrl}/atualizar-ativo`, {
      nome: obj.papel,
      imageUrl: obj.imagem,
    })
    log.info({ papel: obj.papel }, 'API atualizada')
    void channel.send(`Atualizado ${obj.papel}`).then(m => deleteMessageAfterTime(m))
  }
  log.info('atualizar-carteira concluído')
}
