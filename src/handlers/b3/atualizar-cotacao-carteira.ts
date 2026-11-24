import axios from 'axios'
import type { Message } from 'discord.js'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('AtualizarCotacaoCarteira')

const baseUrl = 'https://carteira-14bc707a7fab.herokuapp.com/admin'
const brapiIconsUrl = 'https://icons.brapi.dev/icons'

const browserHeaders = {
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
}

export async function getLogoFromBrapi(papel: string): Promise<string | null> {
  const ticker = (papel || '').toUpperCase().trim()
  if (!ticker) return null

  const candidatos = [...new Set([ticker, ticker.replace(/\d+$/, '')])].filter(Boolean)
  for (const candidato of candidatos) {
    const url = `${brapiIconsUrl}/${candidato}.svg`
    try {
      const { status } = await axios.head(url, { timeout: 8000, validateStatus: () => true })
      if (status === 200) {
        log.debug({ papel, url }, 'Logo encontrada na brapi')
        return url
      }
    } catch (err) {
      log.warn({ err, papel, candidato }, 'Erro ao consultar icone na brapi')
    }
  }

  log.debug({ papel }, 'Sem logo na brapi')
  return null
}

export async function imgScrapeBing(query: string): Promise<string | null> {
  const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(`${query} ação logo`)}&first=1`
  try {
    log.debug({ query }, 'Bing: buscando imagens')
    const { data } = await axios.get<string>(searchUrl, { timeout: 15000, headers: browserHeaders })
    const matches = String(data).matchAll(/murl&quot;:&quot;(https?:\/\/[^&]+)/g)
    for (const match of matches) {
      const url = match[1]
      if (url && /\.(png|jpe?g|webp|svg)/i.test(url)) {
        log.debug({ query, url }, 'Bing: imagem encontrada')
        return url
      }
    }
    log.debug({ query }, 'Bing: nenhuma imagem utilizavel')
    return null
  } catch (err) {
    log.warn({ err, query }, 'Bing: erro ao buscar imagens')
    return null
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
      let imageUrl = await getLogoFromBrapi(papel)
      if (!imageUrl) {
        imageUrl = await imgScrapeBing(papel)
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
