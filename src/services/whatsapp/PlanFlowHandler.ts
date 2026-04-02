import { getOrCreateSession, getSession, setStep, updateSession, STEPS } from './PlanSessionStore'
import { extractAddressFromText } from './AddressExtractionService'
import * as MeConecteiService from '../meconectei/MeConecteiService'
import { createLogger } from '../../shared/logger/Logger'
import { enviarMensagemParaMim } from '../../telegram/TelegramUtils'

const log = createLogger('PlanFlowHandler')

// ── Tipos mínimos para Baileys ────────────────────────────────────────────

interface BaileysMessage {
  key: { remoteJid: string }
  pushName?: string
  message?: {
    conversation?: string
    extendedTextMessage?: { text?: string }
    locationMessage?: { degreesLatitude?: number; degreesLongitude?: number }
  }
}

interface BaileysSocket {
  sendMessage(jid: string, content: { text: string }): Promise<void>
}

// ── Helpers de mensagem ───────────────────────────────────────────────────

function getMessageText(m: BaileysMessage): string {
  const msg = m.message
  if (!msg) return ''
  if (msg.conversation) return msg.conversation
  if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text
  return ''
}

function getMessageLocation(m: BaileysMessage): { latitude: number; longitude: number } | null {
  const loc = m.message?.locationMessage
  if (!loc) return null
  const lat = loc.degreesLatitude
  const lng = loc.degreesLongitude
  if (lat == null || lng == null) return null
  return { latitude: Number(lat), longitude: Number(lng) }
}

// ── Textos ────────────────────────────────────────────────────────────────

const WELCOME_TEXT = [
  'Olá! 👋',
  'Vou te ajudar a encontrar o plano de internet ideal para você.',
  'Por favor, me envie seu *endereço* de instalação:',
  '• Você pode *enviar a localização* pelo WhatsApp (ícone de anexo → Localização), ou',
  '• Escrever por texto: CEP, rua, número, bairro, cidade ou o endereço completo.',
].join('\n')

const ADDRESS_AGAIN_TEXT = 'Por favor, envie novamente seu endereço (localização ou texto com CEP/rua/cidade).'

interface Plan {
  idPlan?: string
  planName?: string
  price?: number
  speed?: string
  [key: string]: unknown
}

function formatPlanLine(i: number, p: Plan): string {
  return `${i}. *${p.planName ?? ''}* — R$ ${p.price ?? '?'}/mês — ${p.speed ?? '?'}`
}

function formatPlansMessage(plans: Plan[]): string {
  return [
    'Encontrei estes planos disponíveis para sua região:\n',
    ...plans.map((p, i) => formatPlanLine(i + 1, p)),
    '',
    'Responda com *1*, *2* ou *3* para escolher.',
    'Ou *digite o endereço novamente* para buscar em outro local.',
  ].join('\n')
}

async function notifyTelegramNewContact(jid: string, pushName: string, firstMsg: string): Promise<void> {
  const phone = jid.replace('@s.whatsapp.net', '')
  const text = ['📱 *Novo contato - Plano de Internet*', '', `Número: ${phone}`, `Nome: ${pushName || '(não informado)'}`, `Primeira mensagem: ${firstMsg || '(vazio)'}`].join('\n')
  try { enviarMensagemParaMim(text) } catch (e) { log.error({ err: e }, 'Telegram notify error') }
}

async function fetchAndShowPlans(
  sock: BaileysSocket,
  jid: string,
  latitude: number,
  longitude: number,
  addressUpdate: Record<string, unknown> | null,
): Promise<void> {
  if (addressUpdate) updateSession(jid, addressUpdate as never)
  try {
    const result = await MeConecteiService.getClientSearch(latitude, longitude) as { success: boolean; data: Plan[] }
    const plans = result?.success && Array.isArray(result?.data) ? result.data.slice(0, 3) : []
    updateSession(jid, { plans })
    if (!plans.length) {
      await sock.sendMessage(jid, { text: 'Nenhum plano encontrado para essa localização. Digite outro endereço para tentar novamente.' })
      setStep(jid, STEPS.AWAITING_ADDRESS)
      return
    }
    setStep(jid, STEPS.AWAITING_PLAN_CHOICE)
    await sock.sendMessage(jid, { text: formatPlansMessage(plans) })
  } catch (e) {
    log.error({ err: e }, 'getClientSearch error')
    await sock.sendMessage(jid, { text: 'Erro ao buscar planos. Tente novamente em instantes ou digite outro endereço.' })
  }
}

// ── Handler principal ─────────────────────────────────────────────────────

export async function handle(sock: BaileysSocket, m: BaileysMessage): Promise<void> {
  const jid = m.key.remoteJid
  const pushName = m.pushName ?? ''
  const text = getMessageText(m)
  const location = getMessageLocation(m)
  if (!location && !text) return

  const session = getSession(jid)
  const isFirstMessage = !session

  if (isFirstMessage) {
    getOrCreateSession(jid, { pushName, phone: jid, firstMessageText: text })
    await notifyTelegramNewContact(jid, pushName, text)
    await sock.sendMessage(jid, { text: WELCOME_TEXT })
    setStep(jid, STEPS.AWAITING_ADDRESS)
    return
  }

  if (session!.step === STEPS.AWAITING_EMAIL) {
    const email = text.trim()
    if (!email?.includes('@')) {
      await sock.sendMessage(jid, { text: 'Email inválido. Por favor, envie um email válido.' })
      return
    }
    const selectedPlan = (session as unknown as { selectedPlan?: Plan }).selectedPlan
    if (!selectedPlan?.idPlan) {
      await sock.sendMessage(jid, { text: 'Sua sessão expirou. Por favor, inicie novamente.' })
      setStep(jid, STEPS.AWAITING_ADDRESS)
      return
    }
    const phone = jid.replace('@s.whatsapp.net', '')
    try {
      await MeConecteiService.postPessoasInteressadas({ idPlan: selectedPlan.idPlan, email, phone })
      await sock.sendMessage(jid, { text: '✅ *Interesse registrado com sucesso!*\n\nEm breve nossa equipe entrará em contato.' })
    } catch (e) {
      log.error({ err: e }, 'postPessoasInteressadas error')
      await sock.sendMessage(jid, { text: 'Ocorreu um erro ao registrar. Tente novamente em instantes.' })
    }
    return
  }

  if (session!.step === STEPS.AWAITING_PLAN_CHOICE) {
    if (location) { await fetchAndShowPlans(sock, jid, location.latitude, location.longitude, { latitude: location.latitude, longitude: location.longitude, address: null, plans: null }); return }
    const choice = text.trim()
    if (['1', '2', '3'].includes(choice)) {
      const plans = (session!.plans ?? []) as Plan[]
      const selected = plans[parseInt(choice, 10) - 1]
      if (selected) {
        updateSession(jid, { selectedPlan: selected } as never)
        await sock.sendMessage(jid, { text: `Ótima escolha! Você selecionou: *${selected.planName}*.\n\nPor favor, informe seu *email* para finalizarmos.` })
        setStep(jid, STEPS.AWAITING_EMAIL)
      } else {
        await sock.sendMessage(jid, { text: 'Opção inválida. Responda com 1, 2 ou 3, ou digite o endereço novamente.' })
      }
      return
    }
    if (text.trim()) {
      const geocode = await MeConecteiService.getCompanyProxy(text.trim()) as { success: boolean; data: { results: { geometry: { location: { lat: number; lng: number } } }[] } }
      if (geocode?.success && geocode?.data?.results?.length) {
        const { lat, lng } = geocode.data.results[0]!.geometry.location
        await fetchAndShowPlans(sock, jid, lat, lng, { address: null, latitude: lat, longitude: lng, plans: null }); return
      }
    }
    updateSession(jid, { address: null, latitude: null, longitude: null, plans: null } as never)
    setStep(jid, STEPS.AWAITING_ADDRESS)
    await sock.sendMessage(jid, { text: ADDRESS_AGAIN_TEXT })
    return
  }

  if (session!.step !== STEPS.AWAITING_ADDRESS) return

  if (location) { await fetchAndShowPlans(sock, jid, location.latitude, location.longitude, { latitude: location.latitude, longitude: location.longitude, address: null }); return }

  if (text.trim()) {
    const address = await extractAddressFromText(text.trim())
    updateSession(jid, { address: address ?? {}, latitude: null, longitude: null } as never)
    const geocode = await MeConecteiService.getCompanyProxy(text.trim()) as { success: boolean; data: { results: { geometry: { location: { lat: number; lng: number } } }[] } }
    if (!geocode?.success || !geocode?.data?.results?.length) {
      await sock.sendMessage(jid, { text: 'Não consegui localizar esse endereço. Tente outro texto ou envie a localização.' }); return
    }
    const { lat, lng } = geocode.data.results[0]!.geometry.location
    updateSession(jid, { latitude: lat, longitude: lng } as never)
    await fetchAndShowPlans(sock, jid, lat, lng, null)
    return
  }

  await sock.sendMessage(jid, { text: 'Preciso do endereço. Envie a localização ou escreva (CEP, rua, número, bairro, cidade).' })
}
