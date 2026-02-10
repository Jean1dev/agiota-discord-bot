const QRCode = require('qrcode')
const { readDoc, writeDoc, hasStoredAuth, clearSession } = require('./whatsapp/mongoAuthStore')
const { MessageAttachment } = require('discord.js')

let sock = null
let pairingResolver = null

async function useMongoDBAuthState(baileys) {
  const { BufferJSON, initAuthCreds, proto } = baileys
  const doc = await readDoc()
  const creds = doc?.creds ? JSON.parse(JSON.stringify(doc.creds), BufferJSON.reviver) : initAuthCreds()
  const keysStore = doc?.keys ? JSON.parse(JSON.stringify(doc.keys), BufferJSON.reviver) : {}

  const keys = {
    get: async (type, ids) => {
      const data = {}
      const category = keysStore[type] || {}
      for (const id of ids) {
        let value = category[id]
        if (type === 'app-state-sync-key' && value) {
          value = proto.Message.AppStateSyncKeyData.fromObject(value)
        }
        data[id] = value || undefined
      }
      return data
    },
    set: async (data) => {
      for (const category in data) {
        if (!keysStore[category]) keysStore[category] = {}
        for (const id in data[category]) {
          const value = data[category][id]
          keysStore[category][id] = value || undefined
          if (!value) delete keysStore[category][id]
        }
      }
      const keysSerialized = JSON.parse(JSON.stringify(keysStore, BufferJSON.replacer))
      await writeDoc({ keys: keysSerialized })
    }
  }

  const saveCreds = async () => {
    const credsJson = JSON.parse(JSON.stringify(creds, BufferJSON.replacer))
    await writeDoc({ creds: credsJson })
  }

  return { state: { creds, keys }, saveCreds }
}

async function startSocket(options = {}) {
  const baileys = await import('@whiskeysockets/baileys')
  const { makeWASocket, DisconnectReason } = baileys
  const { state, saveCreds } = await useMongoDBAuthState(baileys)

  const socketConfig = {
    auth: state,
    printQRInTerminal: true,
    fireInitQueries: false,
    ...options
  }

  sock = makeWASocket(socketConfig)

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    const { connection, qr } = update
    if (qr && pairingResolver) {
      try {
        const qrBuffer = await QRCode.toBuffer(qr, { type: 'png', margin: 2, width: 300 })
        pairingResolver({ type: 'qr', buffer: qrBuffer })
      } catch (e) {
        pairingResolver({ type: 'error', error: e })
      }
    }
    if (connection === 'open') {
      pairingResolver && pairingResolver({ type: 'connected' })
      pairingResolver = null
    }
    if (connection === 'close') {
      const statusCode = update.lastDisconnect?.error?.output?.statusCode
      const isLoggedOut = statusCode === DisconnectReason.loggedOut
      if (isLoggedOut) {
        sock = null
        clearSession().catch(e => console.error('WhatsApp clearSession', e))
      } else {
        startSocket(options)
      }
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const m of messages) {
      if (m.key.fromMe) continue
      const jid = m.key.remoteJid
      if (!jid) continue
      try {
        await sock.sendMessage(jid, { text: 'Hello World' })
      } catch (e) {
        console.error('WhatsApp send error', e)
      }
    }
  })

  return sock
}

async function startPairing(discordChannel) {
  if (sock) {
    await discordChannel.send('WhatsApp já está conectado.')
    return
  }
  pairingResolver = null
  const baileys = await import('@whiskeysockets/baileys')
  const doc = await readDoc()
  if (doc?.creds?.registered) {
    await discordChannel.send('Já existem credenciais salvas. Iniciando conexão...')
    return startSocket().then(() => {
      return discordChannel.send('Conexão WhatsApp restaurada.')
    })
  }
  await discordChannel.send('Gerando QR code para vincular o WhatsApp. Escaneie com o app.')
  const { state, saveCreds } = await useMongoDBAuthState(baileys)
  sock = baileys.makeWASocket({
    auth: state,
    printQRInTerminal: true,
    fireInitQueries: false
  })
  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', async (update) => {
    const { connection, qr } = update
    if (qr) {
      try {
        const qrBuffer = await QRCode.toBuffer(qr, { type: 'png', margin: 2, width: 300 })
        const attachment = new MessageAttachment(qrBuffer, 'whatsapp-qr.png')
        await discordChannel.send({ files: [attachment] })
      } catch (e) {
        await discordChannel.send('Erro ao gerar QR: ' + e.message).catch(() => {})
      }
    }
    if (connection === 'open') {
      await discordChannel.send('WhatsApp vinculado com sucesso. Conexão ativa.')
    }
    if (connection === 'close') {
      const statusCode = update.lastDisconnect?.error?.output?.statusCode
      const isLoggedOut = statusCode === baileys.DisconnectReason?.loggedOut
      if (isLoggedOut) {
        sock = null
        clearSession().catch(e => console.error('WhatsApp clearSession', e))
      } else {
        startSocket()
      }
    }
  })
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const m of messages) {
      if (m.key.fromMe) continue
      const jid = m.key.remoteJid
      if (!jid) continue
      try {
        await sock.sendMessage(jid, { text: 'Hello World' })
      } catch (e) {
        console.error('WhatsApp send error', e)
      }
    }
  })
}

async function init() {
  const hasAuth = await hasStoredAuth()
  if (hasAuth) {
    try {
      await startSocket()
      console.log('WhatsApp socket iniciado com credenciais salvas')
    } catch (e) {
      console.error('Erro ao iniciar WhatsApp com credenciais salvas', e)
    }
  }
}

async function clearAndDisconnect() {
  sock = null
  return clearSession()
}

module.exports = {
  startPairing,
  init,
  hasStoredAuth,
  clearAndDisconnect
}
