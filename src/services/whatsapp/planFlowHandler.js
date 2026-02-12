const { getOrCreateSession, getSession, setStep, updateSession, STEPS } = require('./planSessionStore')
const { extractAddressFromText } = require('./addressExtractionService')
const MeConecteiService = require('../MeConecteiService')

let enviarMensagemParaMim = null
try {
  const telegramUtils = require('../../telegram/utils/telegram-utils')
  enviarMensagemParaMim = telegramUtils.enviarMensagemParaMim
} catch (e) {
  console.warn('Telegram utils not available for plan flow', e.message)
}

function getMessageText(m) {
  const msg = m.message
  if (!msg) return ''
  if (msg.conversation) return msg.conversation
  if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text
  return ''
}

function getMessageLocation(m) {
  const msg = m.message
  if (!msg?.locationMessage) return null
  const loc = msg.locationMessage
  const lat = loc.degreesLatitude
  const lng = loc.degreesLongitude
  if (lat == null || lng == null) return null
  return { latitude: Number(lat), longitude: Number(lng) }
}

const WELCOME_TEXT = [
  'Olá! 👋',
  'Vou te ajudar a encontrar o plano de internet ideal para você.',
  'Por favor, me envie seu *endereço* de instalação:',
  '• Você pode *enviar a localização* pelo WhatsApp (ícone de anexo → Localização), ou',
  '• Escrever por texto: CEP, rua, número, bairro, cidade ou o endereço completo.'
].join('\n')

const ADDRESS_AGAIN_TEXT = 'Por favor, envie novamente seu endereço (localização ou texto com CEP/rua/cidade).'

function formatPlanLine(index, plan) {
  const price = typeof plan.price === 'number' ? `R$ ${plan.price / 100}` : plan.price / 100
  return `${index} - ${plan.planName} (${plan.velocity} Mbps) - ${price}/mês`
}

function formatPlansMessage(plans) {
  const lines = ['Encontrei estes planos disponíveis para sua região:\n', ...plans.map((p, i) => formatPlanLine(i + 1, p)), '', 'Responda com *1*, *2* ou *3* para escolher.', 'Ou *digite o endereço novamente* para buscar em outro local.']
  return lines.join('\n')
}

async function notifyTelegramNewContact(jid, pushName, firstMessageText) {
  if (!enviarMensagemParaMim) return
  const phone = jid.replace('@s.whatsapp.net', '')
  const lines = [
    '📱 *Novo contato - Plano de Internet*',
    '',
    `Número: ${phone}`,
    `Nome: ${pushName || '(não informado)'}`,
    `Primeira mensagem: ${firstMessageText || '(vazio)'}`
  ]
  try {
    await enviarMensagemParaMim(lines.join('\n'))
  } catch (e) {
    console.error('Telegram notify error', e)
  }
}

async function handle(sock, m) {
  const jid = m.key.remoteJid

  const pushName = m.pushName || ''
  const text = getMessageText(m)
  const location = getMessageLocation(m)
  if (!location && !text) return

  let session = getSession(jid)
  const isFirstMessage = !session

  if (isFirstMessage) {
    session = getOrCreateSession(jid, { pushName, phone: jid, firstMessageText: text })
    await notifyTelegramNewContact(jid, pushName, text)
    await sock.sendMessage(jid, { text: WELCOME_TEXT })
    setStep(jid, STEPS.AWAITING_ADDRESS)
    return
  }

  if (session.step === STEPS.AWAITING_EMAIL) {
    const email = text.trim()
    if (!email || !email.includes('@')) {
      await sock.sendMessage(jid, { text: 'Email inválido. Por favor, envie um email válido.' })
      return
    }
    const selectedPlan = session.selectedPlan
    if (!selectedPlan?.idPlan) {
      await sock.sendMessage(jid, { text: 'Sua sessão expirou. Por favor, inicie novamente enviando uma mensagem.' })
      setStep(jid, STEPS.AWAITING_ADDRESS)
      return
    }
    const phone = jid.replace('@s.whatsapp.net', '')
    try {
      await MeConecteiService.postPessoasInteressadas({
        idPlan: selectedPlan.idPlan,
        email,
        phone
      })
      await sock.sendMessage(jid, { text: '✅ *Interesse registrado com sucesso!*\n\nEm breve nossa equipe entrará em contato para finalizar sua contratação.' })
    } catch (e) {
      console.error('postPessoasInteressadas error', e)
      await sock.sendMessage(jid, { text: 'Ocorreu um erro ao registrar. Tente novamente em instantes ou entre em contato conosco.' })
    }
    return
  }

  if (session.step === STEPS.AWAITING_PLAN_CHOICE) {
    if (location) {
      await fetchAndShowPlans(sock, jid, location.latitude, location.longitude, {
        latitude: location.latitude,
        longitude: location.longitude,
        address: null,
        plans: null,
        selectedPlan: null
      })
      return
    }
    const choice = text.trim()
    if (choice === '1' || choice === '2' || choice === '3') {
      const idx = parseInt(choice, 10) - 1
      const plans = session.plans || []
      const selected = plans[idx]
      if (selected) {
        updateSession(jid, { selectedPlan: selected })
        await sock.sendMessage(jid, { text: `Ótima escolha! Você selecionou: *${selected.planName}*.\n\nPor favor, informe seu *email* para finalizarmos seu interesse.` })
        setStep(jid, STEPS.AWAITING_EMAIL)
      } else {
        await sock.sendMessage(jid, { text: 'Opção inválida. Responda com 1, 2 ou 3, ou digite o endereço novamente.' })
      }
      return
    }
    if (text && text.trim()) {
      const query = text.trim()
      const geocode = await MeConecteiService.getCompanyProxy(query)
      if (geocode?.success && geocode?.data?.results?.length) {
        const first = geocode.data.results[0]
        const lat = first.geometry?.location?.lat
        const lng = first.geometry?.location?.lng
        if (lat != null && lng != null) {
          await fetchAndShowPlans(sock, jid, lat, lng, {
            address: null,
            latitude: lat,
            longitude: lng,
            plans: null,
            selectedPlan: null
          })
          return
        }
      }
    }
    updateSession(jid, { address: null, latitude: null, longitude: null, plans: null, selectedPlan: null })
    setStep(jid, STEPS.AWAITING_ADDRESS)
    await sock.sendMessage(jid, { text: ADDRESS_AGAIN_TEXT })
    return
  }

  if (session.step !== STEPS.AWAITING_ADDRESS) {
    return
  }

  if (location) {
    await fetchAndShowPlans(sock, jid, location.latitude, location.longitude, {
      latitude: location.latitude,
      longitude: location.longitude,
      address: null
    })
    return
  }

  if (text && text.trim()) {
    const address = await extractAddressFromText(text.trim())
    updateSession(jid, { address: address || {}, latitude: null, longitude: null })
    const geocode = await MeConecteiService.getCompanyProxy(text.trim())
    if (!geocode?.success || !geocode?.data?.results?.length) {
      await sock.sendMessage(jid, { text: 'Não consegui localizar esse endereço. Tente outro texto ou envie a localização pelo WhatsApp.' })
      return
    }
    const first = geocode.data.results[0]
    const lat = first.geometry?.location?.lat
    const lng = first.geometry?.location?.lng
    if (lat == null || lng == null) {
      await sock.sendMessage(jid, { text: 'Não foi possível obter as coordenadas do endereço. Tente enviar a localização ou outro endereço.' })
      return
    }
    updateSession(jid, { latitude: lat, longitude: lng })
    await fetchAndShowPlans(sock, jid, lat, lng, null)
    return
  }

  await sock.sendMessage(jid, {
    text: 'Preciso do endereço para continuar. Envie a localização ou escreva o endereço (CEP, rua, número, bairro, cidade).'
  })
}

async function fetchAndShowPlans(sock, jid, latitude, longitude, addressUpdate) {
  if (addressUpdate) updateSession(jid, addressUpdate)
  try {
    const result = await MeConecteiService.getClientSearch(latitude, longitude)
    const plans = result?.success && Array.isArray(result?.data) ? result.data.slice(0, 3) : []
    updateSession(jid, { plans })
    if (plans.length === 0) {
      await sock.sendMessage(jid, { text: 'Nenhum plano encontrado para essa localização. Você pode digitar outro endereço para tentar novamente.' })
      setStep(jid, STEPS.AWAITING_ADDRESS)
      return
    }
    setStep(jid, STEPS.AWAITING_PLAN_CHOICE)
    await sock.sendMessage(jid, { text: formatPlansMessage(plans) })
  } catch (e) {
    console.error('getClientSearch error', e)
    await sock.sendMessage(jid, { text: 'Erro ao buscar planos. Tente novamente em instantes ou digite outro endereço.' })
  }
}

module.exports = {
  handle
}
