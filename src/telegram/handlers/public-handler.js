const { enviarMensagemParaMim } = require('../utils/telegram-utils')
const { DbInstance } = require('../../repository/mongodb')
const { getSubscriptionByEmail } = require('../../services/SubscriptionService')

const usersCache = new Map()
const userStates = new Map()

const STATES = {
    INITIAL: 'initial',
    WAITING_EMAIL: 'waiting_email',
    COMPLETED: 'completed'
}

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24
const DAYS_WARNING_THRESHOLD = 7

function getUserFromCache(userId) {
    return usersCache.get(userId)
}

function getUserState(userId) {
    return userStates.get(userId) || STATES.INITIAL
}

function setUserState(userId, state) {
    userStates.set(userId, state)
}

function getTelegramUsersCollection() {
    const db = DbInstance()
    if (!db) {
        console.error('MongoDB não conectado')
        return null
    }
    return db.collection('telegram-users')
}

function createNewUserDocument(userId, userName, username) {
    return {
        userId,
        userName,
        username,
        firstInteraction: new Date(),
        email: null,
        vigenteAte: null,
        isActive: false
    }
}

async function findUserInDatabase(userId) {
    const collection = getTelegramUsersCollection()
    if (!collection) return null
    
    return await collection.findOne({ userId })
}

async function insertUserInDatabase(user) {
    const collection = getTelegramUsersCollection()
    if (!collection) return
    
    await collection.insertOne(user)
}

async function saveUserToDatabase(userId, userName, username) {
    if (usersCache.has(userId)) {
        return usersCache.get(userId)
    }
    
    const existingUser = await findUserInDatabase(userId)
    
    if (existingUser) {
        usersCache.set(userId, existingUser)
        return existingUser
    }
    
    const newUser = createNewUserDocument(userId, userName, username)
    await insertUserInDatabase(newUser)
    usersCache.set(userId, newUser)
    
    return newUser
}

function updateCachedUser(userId, updates) {
    if (!usersCache.has(userId)) return
    
    const cachedUser = usersCache.get(userId)
    Object.assign(cachedUser, updates, { lastUpdate: new Date() })
    usersCache.set(userId, cachedUser)
}

async function updateUserSubscription(userId, email, vigenteAte, isActive) {
    const collection = getTelegramUsersCollection()
    if (!collection) return

    await collection.updateOne(
        { userId },
        { 
            $set: { 
                email,
                vigenteAte,
                isActive,
                lastUpdate: new Date()
            }
        }
    )

    updateCachedUser(userId, { email, vigenteAte, isActive })
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

function calculateDaysRemaining(futureDate) {
    const today = new Date()
    const diffTime = futureDate - today
    return Math.ceil(diffTime / MILLISECONDS_PER_DAY)
}

function isSubscriptionExpired(vigenciaDate) {
    return vigenciaDate < new Date()
}

function isSubscriptionExpiringSoon(daysRemaining) {
    return daysRemaining <= DAYS_WARNING_THRESHOLD
}

function getSubscriptionStatusMessage(vigenciaDate) {
    if (isSubscriptionExpired(vigenciaDate)) {
        return '❌ Assinatura expirada'
    }
    
    const daysRemaining = calculateDaysRemaining(vigenciaDate)
    
    if (isSubscriptionExpiringSoon(daysRemaining)) {
        return `⚠️ Assinatura expira em ${daysRemaining} dias`
    }
    
    return `✅ Assinatura ativa (${daysRemaining} dias restantes)`
}

function getSubscriptionStatusEmoji(isActive) {
    return isActive ? '✅' : '❌'
}

function getSubscriptionStatusText(isActive, daysRemaining) {
    return isActive 
        ? `Assinatura ativa (${daysRemaining} dias restantes)` 
        : 'Assinatura expirada'
}

function formatUserInfoMessage(user, userName, userId) {
    const vigenciaDate = new Date(user.vigenteAte)
    const statusMessage = getSubscriptionStatusMessage(vigenciaDate)
    
    return [
        `Olá ${userName}!\n`,
        `📧 Email: ${user.email}`,
        `📅 Vigência: ${vigenciaDate.toLocaleDateString('pt-BR')}`,
        `${statusMessage}\n`,
        `Chat ID: ${userId}`
    ].join('\n')
}

function formatWelcomeMessage(userName) {
    return [
        `Olá ${userName}! 👋\n`,
        `Para continuar, preciso do seu email de cadastro.\n`,
        `Por favor, envie seu email:`
    ].join('\n')
}

function formatSubscriptionFoundMessage(subscription, userId) {
    const vigenciaDate = new Date(subscription.vigenteAte)
    const daysRemaining = calculateDaysRemaining(vigenciaDate)
    const statusEmoji = getSubscriptionStatusEmoji(subscription.isActive)
    const statusText = getSubscriptionStatusText(subscription.isActive, daysRemaining)
    
    return [
        `${statusEmoji} Assinatura encontrada!\n`,
        `📧 Email: ${subscription.email}`,
        `📅 Vigência até: ${vigenciaDate.toLocaleDateString('pt-BR')}`,
        `${statusText}\n`,
        `Seu Chat ID: ${userId}`
    ].join('\n')
}

function formatSubscriptionNotFoundMessage(email) {
    return [
        `❌ Não encontramos uma assinatura com o email: ${email}\n`,
        `Verifique se o email está correto e tente novamente, ou entre em contato com o suporte.`
    ].join('\n')
}

function formatNewUserNotification(userName, username, userId, messageText) {
    return [
        `Novo usuário acessou:`,
        `Nome: ${userName}`,
        `Username: @${username}`,
        `Chat ID: ${userId}`,
        `Mensagem: ${messageText}`
    ].join('\n')
}

function formatSubscriptionLinkedNotification(userName, email, userId, statusText) {
    return [
        `Usuário vinculou assinatura:`,
        `Nome: ${userName}`,
        `Email: ${email}`,
        `Chat ID: ${userId}`,
        `Status: ${statusText}`
    ].join('\n')
}

function formatEmailNotFoundNotification(userName, email, userId) {
    return [
        `Usuário tentou vincular email não encontrado:`,
        `Nome: ${userName}`,
        `Email tentado: ${email}`,
        `Chat ID: ${userId}`
    ].join('\n')
}

function extractUserDataFromContext(ctx) {
    return {
        userName: ctx.update.message.from.first_name,
        userId: ctx.update.message.from.id,
        username: ctx.update.message.from.username || 'sem username',
        messageText: ctx.update.message.text || '[Mensagem não textual]'
    }
}

function userHasSubscription(user) {
    return user.email && user.vigenteAte
}

async function handleCompletedState(ctx, user, userData) {
    const message = formatUserInfoMessage(user, userData.userName, userData.userId)
    await ctx.reply(message)
}

async function handleInitialState(ctx, userData) {
    const notification = formatNewUserNotification(
        userData.userName,
        userData.username,
        userData.userId,
        userData.messageText
    )
    enviarMensagemParaMim(notification)

    setUserState(userData.userId, STATES.WAITING_EMAIL)
    
    const welcomeMessage = formatWelcomeMessage(userData.userName)
    await ctx.reply(welcomeMessage)
}

async function processValidEmail(ctx, email, userData) {
    await ctx.reply('🔍 Buscando sua assinatura...')

    const subscription = await getSubscriptionByEmail(email)

    if (subscription.found) {
        await handleSubscriptionFound(ctx, subscription, userData)
    } else {
        await handleSubscriptionNotFound(ctx, email, userData)
    }
}

async function handleSubscriptionFound(ctx, subscription, userData) {
    await updateUserSubscription(
        userData.userId,
        subscription.email,
        subscription.vigenteAte,
        subscription.isActive
    )

    const vigenciaDate = new Date(subscription.vigenteAte)
    const daysRemaining = calculateDaysRemaining(vigenciaDate)
    const statusText = getSubscriptionStatusText(subscription.isActive, daysRemaining)

    const userMessage = formatSubscriptionFoundMessage(subscription, userData.userId)
    await ctx.reply(userMessage)

    const adminNotification = formatSubscriptionLinkedNotification(
        userData.userName,
        subscription.email,
        userData.userId,
        statusText
    )
    enviarMensagemParaMim(adminNotification)

    setUserState(userData.userId, STATES.COMPLETED)
}

async function handleSubscriptionNotFound(ctx, email, userData) {
    const userMessage = formatSubscriptionNotFoundMessage(email)
    await ctx.reply(userMessage)

    const adminNotification = formatEmailNotFoundNotification(
        userData.userName,
        email,
        userData.userId
    )
    enviarMensagemParaMim(adminNotification)
}

async function handleWaitingEmailState(ctx, userData) {
    const email = userData.messageText.trim()

    if (!isValidEmail(email)) {
        await ctx.reply('❌ Email inválido. Por favor, envie um email válido:')
        return
    }

    await processValidEmail(ctx, email, userData)
}

async function handleUserMessage(ctx) {
    const userData = extractUserDataFromContext(ctx)
    const user = await saveUserToDatabase(userData.userId, userData.userName, userData.username)
    const userState = getUserState(userData.userId)

    if (userHasSubscription(user)) {
        await handleCompletedState(ctx, user, userData)
        return
    }

    if (userState === STATES.INITIAL) {
        await handleInitialState(ctx, userData)
        return
    }

    if (userState === STATES.WAITING_EMAIL) {
        await handleWaitingEmailState(ctx, userData)
        return
    }
}

function registerPublicHandlers(bot) {
    bot.start(async ctx => {
        await ctx.reply('Olá! Bem-vindo ao bot de arbitragem.\n\nPor favor, envie qualquer mensagem para começar.')
    })

    bot.help(async ctx => {
        await ctx.reply('Para começar, envie uma mensagem e informe seu email de cadastro.')
    })

    bot.on('message', handleUserMessage)
}

module.exports = {
    registerPublicHandlers,
    getUserFromCache
}
