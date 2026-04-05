import { z } from 'zod'

const DEFAULT_COMMUNICATION_SERVER_URL =
  'https://communication-service-4f4f57e0a956.herokuapp.com'

/**
 * Schema de validação de todas as variáveis de ambiente.
 * O processo falha imediatamente no startup se algo estiver ausente
 * ou inválido — fail fast, evitando erros silenciosos em runtime.
 */
const envSchema = z.object({
  // ── Core ───────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(['dev', 'prod', 'test', 'production']).default('dev'),

  // ── Discord ────────────────────────────────────────────────────────────
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN é obrigatório'),

  /**
   * Discord User IDs (numéricos, imutáveis) dos admins, separados por vírgula.
   * Substitui a verificação por username hardcoded.
   * Exemplo: ADMIN_DISCORD_USER_IDS=123456789,987654321
   */
  ADMIN_DISCORD_USER_IDS: z
    .string()
    .optional()
    .transform(v => new Set((v ?? '').split(',').map(s => s.trim()).filter(Boolean))),

  // ── Banco de dados ─────────────────────────────────────────────────────
  MONGO_URL: z.string().min(1, 'MONGO_URL é obrigatório'),

  // ── OpenAI ─────────────────────────────────────────────────────────────
  KEY_OPEN_AI: z.string().optional(),

  // ── IBM Watson ─────────────────────────────────────────────────────────
  ASSISTANT_ID: z.string().optional(),
  ASSISTANT_IAM_APIKEY: z.string().optional(),

  // ── Google ─────────────────────────────────────────────────────────────
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().default('http://localhost:3131'),
  YOUTUBE_WATCH_LATER_PLAYLIST_ID: z.string().optional(),
  YOUTUBE_MAX_CHANNELS: z
    .string()
    .optional()
    .transform(v => (v ? parseInt(v, 10) : 0)),

  // ── Finanças ───────────────────────────────────────────────────────────
  FINANCE_API_AUTH: z.string().optional(),
  CAIXINHA_KEY: z.string().optional(),
  CAIXINHA_SERVER_URL: z.string().optional(),

  // ── Comunicação ────────────────────────────────────────────────────────
  TELEGRAM_API_KEY: z.string().optional(),
  AMQP_CONNECTION: z.string().optional(),
  COMMUNICATION_SERVER_URL: z.preprocess(
    val => {
      if (val === undefined || val === null) return DEFAULT_COMMUNICATION_SERVER_URL
      const s = String(val).trim()
      return s === '' ? DEFAULT_COMMUNICATION_SERVER_URL : s
    },
    z.string().url('COMMUNICATION_SERVER_URL deve ser uma URL http(s) válida'),
  ),

  // ── Keycloak ───────────────────────────────────────────────────────────
  ADMIN_KEYCLOACK_USERNAME: z.string().optional(),
  ADMIN_KEYCLOACK_PASSWORD: z.string().optional(),
  ADMIN_KEYCLOACK_CLIENT_ID: z.string().optional(),

  // ── Outros serviços ────────────────────────────────────────────────────
  SENTRY_DNS: z.string().optional(),
  GITHUB_API_TOKEN: z.string().optional(),
  CLOUD_CONVERT_API: z.string().optional(),
  CRYPTO_SERVICE_DB: z.string().optional(),
  ME_CONECTEI_API_URL: z.string().optional(),
  FERIADOS_BR: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    console.error('❌ Configuração de ambiente inválida:')
    for (const issue of result.error.issues) {
      console.error(`   ${issue.path.join('.')}: ${issue.message}`)
    }
    process.exit(1)
  }

  return result.data
}

export const env = loadEnv()
