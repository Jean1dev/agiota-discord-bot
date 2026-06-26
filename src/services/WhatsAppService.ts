import { AttachmentBuilder } from 'discord.js'
import QRCode from 'qrcode'
import { readDoc, writeDoc, hasStoredAuth, clearSession } from './whatsapp/MongoAuthStore'
import { handle as handlePlanFlow } from './whatsapp/PlanFlowHandler'
import { createLogger } from '../shared/logger/Logger'
import { enviarMensagemParaMim } from '../telegram/TelegramUtils'

const log = createLogger('WhatsAppService')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sock: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pairingResolver: ((v: any) => void) | null = null

// ── Auth state via MongoDB ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function useMongoDBAuthState(baileys: any) {
  const { BufferJSON, initAuthCreds, proto } = baileys
  const doc = await readDoc()
  const creds = doc?.creds
    ? JSON.parse(JSON.stringify(doc.creds), BufferJSON.reviver)
    : initAuthCreds()
  const keysStore: Record<string, Record<string, unknown>> = doc?.keys
    ? JSON.parse(JSON.stringify(doc.keys), BufferJSON.reviver)
    : {}

  const keys = {
    get: async (type: string, ids: string[]) => {
      const data: Record<string, unknown> = {}
      const category = keysStore[type] ?? {}
      for (const id of ids) {
        let value = category[id]
        if (type === 'app-state-sync-key' && value) {
          value = proto.Message.AppStateSyncKeyData.fromObject(value)
        }
        data[id] = value ?? undefined
      }
      return data
    },
    set: async (data: Record<string, Record<string, unknown>>) => {
      for (const category in data) {
        if (!keysStore[category]) keysStore[category] = {}
        for (const id in data[category]) {
          const value = data[category][id]
          keysStore[category]![id] = value ?? undefined
          if (!value) delete keysStore[category]![id]
        }
      }
      await writeDoc({ keys: JSON.parse(JSON.stringify(keysStore, BufferJSON.replacer)) })
    },
  }

  const saveCreds = async () => {
    await writeDoc({ creds: JSON.parse(JSON.stringify(creds, BufferJSON.replacer)) })
  }

  return { state: { creds, keys }, saveCreds }
}

// ── Socket events ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function registerSocketEvents(s: any, baileys: any, { saveCreds, onQr, onOpen, socketOptions = {} }: any) {
  const { DisconnectReason } = baileys
  s.ev.on('creds.update', saveCreds)
  s.ev.on('connection.update', async (update: Record<string, unknown>) => {
    const { connection, qr } = update
    if (qr && onQr) { try { await onQr(qr) } catch (e) { log.error({ err: e }, 'onQr error') } }
    if (connection === 'open') { onOpen && await onOpen() }
    if (connection === 'close') {
      const lastDisconnect = update['lastDisconnect'] as Record<string, unknown> | undefined
      const errOutput = (lastDisconnect?.error as Record<string, unknown> | undefined)?.['output'] as Record<string, unknown> | undefined
      const statusCode = errOutput?.['statusCode']
      const isLoggedOut = statusCode === DisconnectReason?.loggedOut
      const errMsg = (lastDisconnect?.error as Error | undefined)?.message
      log.warn({ statusCode, isLoggedOut, error: errMsg }, 'WhatsApp disconnect')
      const msg = ['⚠️ WhatsApp desconectado', `statusCode: ${statusCode ?? '?'}`, isLoggedOut ? 'Sessão encerrada.' : 'Reconectando...', errMsg ? `Erro: ${String(errMsg).slice(0, 200)}` : ''].filter(Boolean).join('\n')
      enviarMensagemParaMim(msg)
      if (isLoggedOut) { sock = null; clearSession().catch(e => log.error({ err: e }, 'clearSession')) }
      else { startSocket(socketOptions) }
    }
  })
  s.ev.on('messages.upsert', async ({ messages }: { messages: unknown[] }) => {
    for (const m of messages) {
      if (!(m as Record<string, unknown>)['pushName']) continue
      try { await handlePlanFlow(s, m as never) } catch (e) { log.error({ err: e }, 'planFlow error') }
    }
  })
}

// ── Public API ────────────────────────────────────────────────────────────

async function startSocket(options: Record<string, unknown> = {}) {
  const baileys = await import('@whiskeysockets/baileys')
  const { makeWASocket } = baileys
  const { state, saveCreds } = await useMongoDBAuthState(baileys)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sock = makeWASocket({ auth: state as any, printQRInTerminal: false, fireInitQueries: false, ...options })
  const onQr = options['onQr'] ?? (async (qr: string) => {
    if (!pairingResolver) return
    try {
      const buf = await QRCode.toBuffer(qr, { type: 'png', margin: 2, width: 300 })
      pairingResolver({ type: 'qr', buffer: buf })
    } catch (e) { pairingResolver({ type: 'error', error: e }) }
  })
  const onOpen = options['onOpen'] ?? (async () => { pairingResolver?.({ type: 'connected' }); pairingResolver = null })
  registerSocketEvents(sock, baileys, { saveCreds, onQr, onOpen, socketOptions: options })
  return sock
}

export async function startPairing(discordChannel: { send(content: unknown): Promise<unknown> }): Promise<void> {
  if (sock) { await discordChannel.send('WhatsApp já está conectado.'); return }
  pairingResolver = null
  const baileys = await import('@whiskeysockets/baileys')
  const doc = await readDoc()
  if (doc?.creds?.['registered']) {
    await discordChannel.send('Já existem credenciais salvas. Iniciando conexão...')
    await startSocket()
    await discordChannel.send('Conexão WhatsApp restaurada.')
    return
  }
  await discordChannel.send('Gerando QR code para vincular o WhatsApp. Escaneie com o app.')
  const { makeWASocket } = baileys
  const { state, saveCreds } = await useMongoDBAuthState(baileys)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sock = makeWASocket({ auth: state as any, printQRInTerminal: true, fireInitQueries: false })
  const onQr = async (qr: string) => {
    try {
      const buf = await QRCode.toBuffer(qr, { type: 'png', margin: 2, width: 300 })
      await discordChannel.send({ files: [new AttachmentBuilder(buf, { name: 'whatsapp-qr.png' })] })
    } catch (e) { await discordChannel.send('Erro ao gerar QR: ' + (e as Error).message).catch(() => {}) }
  }
  const onOpen = async () => { await discordChannel.send('WhatsApp vinculado com sucesso.') }
  registerSocketEvents(sock, baileys, { saveCreds, onQr, onOpen, socketOptions: {} })
}

export async function init(): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (!await hasStoredAuth()) return
      await startSocket()
      log.info('WhatsApp socket iniciado com credenciais salvas')
      return
    } catch (e) {
      if ((e as Error)?.message === 'MongoDB not connected' && attempt === 0) {
        await new Promise(r => setTimeout(r, 2000)); continue
      }
      log.error({ err: e }, 'Erro ao iniciar WhatsApp')
      return
    }
  }
}

export async function clearAndDisconnect(): Promise<boolean> {
  sock = null
  return clearSession()
}

export { hasStoredAuth }

const TEST_PHONE_JID = '554888685343@s.whatsapp.net'

export async function sendTestMessage(): Promise<{ ok: boolean; error?: string }> {
  if (!sock) return { ok: false, error: 'WhatsApp não está conectado.' }
  try {
    await sock.sendMessage(TEST_PHONE_JID, { text: 'Teste de conexão WhatsApp - bot OK.' })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message || String(e) }
  }
}
