import { Markup } from 'telegraf'
import type { Context } from 'telegraf'
import { enviarMensagemParaMim, enviarMensagemParaUsuario } from '../TelegramUtils'
import { getSubscriptionByEmailAllTenants } from '../../services/subscription/SubscriptionValidator'
import { MongoConnection } from '../../infrastructure/database/MongoConnection'
import { KEYBOARDS, SUBSCRIPTION_PURCHASE_URL } from '../TelegramConfig'

// ── Tipos ─────────────────────────────────────────────────────────────────

interface TelegramUser {
  userId: number
  userName: string
  username: string
  firstInteraction: Date
  email: string | null
  vigenteAte: string | null
  isActive: boolean
  lastUpdate?: Date
}

const STATES = { INITIAL: 'initial', WAITING_EMAIL: 'waiting_email', COMPLETED: 'completed' } as const
const MS_PER_DAY = 1000 * 60 * 60 * 24
const DAYS_WARNING = 7

const usersCache = new Map<number, TelegramUser>()
const userStates = new Map<number, string>()

function getUserFromCache(userId: number): TelegramUser | undefined { return usersCache.get(userId) }
function getUserState(userId: number): string { return userStates.get(userId) ?? STATES.INITIAL }
function setUserState(userId: number, state: string): void { userStates.set(userId, state) }

function getCollection() {
  const db = MongoConnection.getDb()
  if (!db) { console.error('MongoDB não conectado'); return null }
  return db.collection<TelegramUser>('telegram-users')
}

// ── DB helpers ────────────────────────────────────────────────────────────

async function findUserInDatabase(userId: number): Promise<TelegramUser | null> {
  return getCollection()?.findOne({ userId } as never) ?? null
}

async function saveUserToDatabase(userId: number, userName: string, username: string): Promise<TelegramUser> {
  if (usersCache.has(userId)) return usersCache.get(userId)!
  const existing = await findUserInDatabase(userId)
  if (existing) { usersCache.set(userId, existing); return existing }
  const newUser: TelegramUser = { userId, userName, username, firstInteraction: new Date(), email: null, vigenteAte: null, isActive: false }
  await getCollection()?.insertOne(newUser as never)
  usersCache.set(userId, newUser)
  return newUser
}

async function updateUserSubscription(userId: number, email: string, vigenteAte: string, isActive: boolean): Promise<void> {
  await getCollection()?.updateOne({ userId } as never, { $set: { email, vigenteAte, isActive, lastUpdate: new Date() } })
  const cached = usersCache.get(userId)
  if (cached) Object.assign(cached, { email, vigenteAte, isActive, lastUpdate: new Date() })
}

async function clearUserEmail(userId: number): Promise<void> {
  await getCollection()?.updateOne({ userId } as never, { $set: { email: null, vigenteAte: null, isActive: false, lastUpdate: new Date() } })
  const cached = usersCache.get(userId)
  if (cached) Object.assign(cached, { email: null, vigenteAte: null, isActive: false })
}

// ── Helpers de assinatura ─────────────────────────────────────────────────

function calcDaysRemaining(date: Date): number { return Math.ceil((date.getTime() - Date.now()) / MS_PER_DAY) }
function isExpired(date: Date): boolean { return date < new Date() }

function subscriptionStatusMsg(vigDate: Date): string {
  if (isExpired(vigDate)) return '❌ Assinatura expirada'
  const days = calcDaysRemaining(vigDate)
  return days <= DAYS_WARNING ? `⚠️ Assinatura expira em ${days} dias` : `✅ Assinatura ativa (${days} dias restantes)`
}

async function checkAndUpdateExpired(user: TelegramUser) {
  if (!user.email || !user.vigenteAte) return { updated: false, hasError: false }
  if (!isExpired(new Date(user.vigenteAte))) return { updated: false, hasError: false }
  const sub = await getSubscriptionByEmailAllTenants(user.email)
  if (sub.error) return { updated: false, hasError: true }
  if (sub.found && sub.vigenteAte && new Date(sub.vigenteAte) > new Date(user.vigenteAte)) {
    await updateUserSubscription(user.userId, sub.email!, sub.vigenteAte, sub.isActive ?? false)
    return { updated: true, hasError: false }
  }
  return { updated: false, hasError: false }
}

// ── Formatadores ──────────────────────────────────────────────────────────

function fmtUserInfo(user: TelegramUser, userName: string, userId: number): string {
  const d = new Date(user.vigenteAte!)
  return [`Olá ${userName}!\n`, `📧 Email: ${user.email}`, `📅 Vigência: ${d.toLocaleDateString('pt-BR')}`, `${subscriptionStatusMsg(d)}\n`, `Chat ID: ${userId}`].join('\n')
}

// ── Handlers de estado ────────────────────────────────────────────────────

type UserData = { userName: string; userId: number; username: string; messageText: string }

function extractUserData(ctx: Context): UserData {
  const msg = (ctx.update as never as { message: { from: { first_name: string; id: number; username?: string }; text?: string } }).message
  return { userName: msg.from.first_name, userId: msg.from.id, username: msg.from.username ?? 'sem username', messageText: msg.text ?? '[Mensagem não textual]' }
}

async function handleCompletedState(ctx: Context, user: TelegramUser, ud: UserData): Promise<void> {
  const check = await checkAndUpdateExpired(user)
  if (check.hasError) { await ctx.reply('⚠️ Não foi possível verificar o status da sua assinatura.'); return }
  if (check.updated) {
    const updated = await findUserInDatabase(ud.userId)
    await ctx.reply(fmtUserInfo(updated!, ud.userName, ud.userId), Markup.keyboard(KEYBOARDS.publicUser.keyboard).resize()); return
  }
  if (isExpired(new Date(user.vigenteAte!))) {
    await ctx.reply(`❌ Sua assinatura está expirada.\n\nPara renovar, acesse:\n${SUBSCRIPTION_PURCHASE_URL}`); return
  }
  await ctx.reply(fmtUserInfo(user, ud.userName, ud.userId), Markup.keyboard(KEYBOARDS.publicUser.keyboard).resize())
}

async function handleInitialState(ctx: Context, ud: UserData): Promise<void> {
  enviarMensagemParaMim(`Novo usuário acessou:\nNome: ${ud.userName}\nUsername: @${ud.username}\nChat ID: ${ud.userId}\nMensagem: ${ud.messageText}`)
  setUserState(ud.userId, STATES.WAITING_EMAIL)
  await ctx.reply([`Olá ${ud.userName}! 👋\n`, 'Para continuar, preciso do seu email de cadastro.\n', 'Por favor, envie seu email:'].join('\n'))
}

async function handleWaitingEmailState(ctx: Context, ud: UserData): Promise<void> {
  const email = ud.messageText.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { await ctx.reply('❌ Email inválido. Por favor, envie um email válido:'); return }
  await ctx.reply('🔍 Buscando sua assinatura...')
  const sub = await getSubscriptionByEmailAllTenants(email)
  if (sub.found) {
    await updateUserSubscription(ud.userId, sub.email!, sub.vigenteAte!, sub.isActive ?? false)
    const days = calcDaysRemaining(new Date(sub.vigenteAte!))
    await ctx.reply([`${sub.isActive ? '✅' : '❌'} Assinatura encontrada!\n`, `📧 Email: ${sub.email}`, `📅 Vigência até: ${new Date(sub.vigenteAte!).toLocaleDateString('pt-BR')}`, `${sub.isActive ? `Assinatura ativa (${days} dias restantes)` : 'Assinatura expirada'}\n`, `Seu Chat ID: ${ud.userId}`].join('\n'))
    enviarMensagemParaMim(`Usuário vinculou assinatura:\nNome: ${ud.userName}\nEmail: ${sub.email}\nChat ID: ${ud.userId}`)
    setUserState(ud.userId, STATES.COMPLETED)
  } else {
    await ctx.reply(`❌ Não encontramos uma assinatura com o email: ${email}\n\nVerifique se o email está correto.`)
    enviarMensagemParaMim(`Usuário tentou vincular email não encontrado:\nNome: ${ud.userName}\nEmail tentado: ${email}\nChat ID: ${ud.userId}`)
  }
}

async function handleUserMessage(ctx: Context): Promise<void> {
  const ud = extractUserData(ctx)
  const user = await saveUserToDatabase(ud.userId, ud.userName, ud.username)
  if (user.email && user.vigenteAte) { await handleCompletedState(ctx, user, ud); return }
  if (getUserState(ud.userId) === STATES.INITIAL) { await handleInitialState(ctx, ud); return }
  if (getUserState(ud.userId) === STATES.WAITING_EMAIL) { await handleWaitingEmailState(ctx, ud); return }
}

// ── Busca por email (alertas) ─────────────────────────────────────────────

async function findUserByEmail(email: string): Promise<TelegramUser | null> {
  const norm = email.toLowerCase()
  for (const user of usersCache.values()) {
    if (user.email?.toLowerCase() === norm) return user
  }
  const user = await getCollection()?.findOne({ email: norm } as never) ?? null
  if (user) usersCache.set(user.userId, user)
  return user
}

export async function enviarAlertaParaUsuario(content: { email: string; message: string }): Promise<{ success: boolean; userId?: number } | void> {
  const { email, message } = content
  if (!email || !message) { console.error('[Telegram] Email ou mensagem não fornecidos'); return }
  const user = await findUserByEmail(email)
  if (!user) { console.log(`[Telegram] Usuário com email ${email} não encontrado`); return }
  if (!user.isActive) { console.log(`[Telegram] Usuário ${email} sem assinatura ativa`); return }
  await enviarMensagemParaUsuario(user.userId, message)
  return { success: true, userId: user.userId }
}

// ── Registro de handlers ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerPublicHandlers(bot: any): void {
  bot.start(async (ctx: Context) => { await ctx.reply('Olá! Bem-vindo ao bot.\n\nPor favor, envie qualquer mensagem para começar.') })
  bot.help(async (ctx: Context) => { await ctx.reply('Para começar, envie uma mensagem e informe seu email de cadastro.') })

  bot.hears('📊 Ver minha assinatura', async (ctx: Context) => {
    const userId = ctx.from!.id
    const user = await findUserInDatabase(userId)
    if (!user?.email || !user.vigenteAte) { await ctx.reply('Você ainda não possui uma assinatura cadastrada.'); return }
    const check = await checkAndUpdateExpired(user)
    if (check.hasError) { await ctx.reply('⚠️ Não foi possível verificar o status da sua assinatura.'); return }
    const target = check.updated ? await findUserInDatabase(userId) : user
    const vigDate = new Date(target!.vigenteAte!)
    if (isExpired(vigDate)) { await ctx.reply(`❌ Sua assinatura está expirada.\n\nPara renovar, acesse:\n${SUBSCRIPTION_PURCHASE_URL}`); return }
    await ctx.reply(['📊 Status da Assinatura\n', `📧 Email: ${target!.email}`, `📅 Vigência: ${vigDate.toLocaleDateString('pt-BR')}`, subscriptionStatusMsg(vigDate)].join('\n'))
  })

  bot.hears('✉️ Alterar email', async (ctx: Context) => {
    const userId = ctx.from!.id
    await clearUserEmail(userId)
    setUserState(userId, STATES.INITIAL)
    await ctx.reply(`${ctx.from!.first_name}, seu email foi removido.\n\nVamos recadastrar! Envie qualquer mensagem para começar:`, Markup.removeKeyboard())
  })

  bot.hears('ℹ️ Ajuda', async (ctx: Context) => {
    await ctx.reply(['ℹ️ Ajuda do Bot\n', '📊 Ver minha assinatura - Exibe informações da sua assinatura', '✉️ Alterar email - Permite trocar o email cadastrado', 'ℹ️ Ajuda - Mostra esta mensagem', '', 'Para suporte, entre em contato com o administrador.'].join('\n'))
  })

  bot.on('message', handleUserMessage)
}

export { getUserFromCache }
