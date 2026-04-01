/**
 * Guard de autorização — MIGRADO para User ID (imutável).
 *
 * Antes: verificava `message.author.username` hardcoded.
 * Agora: verifica `message.author.id` contra ADMIN_DISCORD_USER_IDS (env var).
 *
 * Como configurar:
 *   ADMIN_DISCORD_USER_IDS=123456789,987654321
 *
 * Para encontrar seu User ID no Discord:
 *   Configurações → Avançado → Modo de desenvolvedor → Clicar com botão direito no seu perfil → "Copiar ID"
 *
 * API mantida idêntica para compatibilidade com todos os handlers existentes:
 *   requireAdmin(message, handler)            → sem args
 *   requireAdmin(args, message, handler)      → com args
 */

const { requireAdminById } = require('../discord/guards/AdminGuard')

function requireAdmin(...args) {
  if (args.length === 3) {
    const [discordArgs, discordMessage, nextFunction] = args
    return requireAdminById(discordArgs, discordMessage, nextFunction)
  }

  const [discordMessage, nextFunction] = args
  return requireAdminById(discordMessage, nextFunction)
}

module.exports = {
  requireAdmin
}
