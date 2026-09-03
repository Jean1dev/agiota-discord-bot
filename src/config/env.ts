import { z } from 'zod'
import { createLogger } from '../shared/logger/Logger'

const log = createLogger('env')

const DEFAULT_COMMUNICATION_SERVER_URL =
  'https://communication-service-4f4f57e0a956.herokuapp.com'
const DEFAULT_CRYPTO_DB_STORAGE_LIMIT_BYTES = 512 * 1024 * 1024

/**
 * Schema de validação de todas as variáveis de ambiente.
 * O processo falha imediatamente no startup se algo estiver ausente
 * ou inválido — fail fast, evitando erros silenciosos em runtime.
 */
const envSchema = z.object({
  // ── Core ───────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(['dev', 'test', 'production']).default('dev'),

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

  // ── LiteLLM gateway ────────────────────────────────────────────────────
  LITELLM_BASE_URL: z
    .string()
    .optional()
    .transform(v => {
      if (!v?.trim()) return undefined
      const trimmed = v.trim().replace(/\/+$/, '')
      return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`
    }),
  LITELLM_API_KEY: z.string().optional(),

  // ── IBM Watson ─────────────────────────────────────────────────────────
  ASSISTANT_ID: z.string().optional(),
  ASSISTANT_IAM_APIKEY: z.string().optional(),

  // ── Google ─────────────────────────────────────────────────────────────
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().default('http://localhost'),
  YOUTUBE_WATCH_LATER_PLAYLIST_ID: z.string().optional(),
  YOUTUBE_MAX_CHANNELS: z
    .string()
    .optional()
    .transform(v => (v ? parseInt(v, 10) : 0)),

  // ── Finanças ───────────────────────────────────────────────────────────
  FINANCE_API_AUTH: z.string().optional(),
  CAIXINHA_KEY: z.string().optional(),
  CAIXINHA_SERVER_URL: z.string().optional(),

  /**
   * URL base do serviço de compras de mercado (merchant-receipt-analysis),
   * que expõe o endpoint GET /reports/:month. Opcional — há default no código.
   */
  COMPRAS_MERCADO_API_URL: z.string().optional(),

  /**
   * URL de callback enviada ao serviço merchant-receipt-analysis (POST /receipts)
   * para que ele notifique o andamento do job de análise do cupom.
   */
  RECEIPT_WEBHOOK_URL: z.string().optional(),

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
  CRYPTO_DB_STORAGE_LIMIT_BYTES: z
    .string()
    .optional()
    .transform(value => {
      const normalized = value?.trim()
      if (!normalized) return DEFAULT_CRYPTO_DB_STORAGE_LIMIT_BYTES

      const parsed = Number(normalized)
      return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_CRYPTO_DB_STORAGE_LIMIT_BYTES
    }),
  ME_CONECTEI_API_URL: z.string().optional(),
  FERIADOS_BR: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    log.error({ issues: result.error.issues }, '❌ Configuração de ambiente inválida')
    process.exit(1)
  }

  const data = result.data
  log.info({
    NODE_ENV: data.NODE_ENV,
    GOOGLE_CLIENT_ID: data.GOOGLE_CLIENT_ID ? '✓ configurado' : '✗ ausente',
    GOOGLE_CLIENT_SECRET: data.GOOGLE_CLIENT_SECRET ? '✓ configurado' : '✗ ausente',
    YOUTUBE_WATCH_LATER_PLAYLIST_ID: data.YOUTUBE_WATCH_LATER_PLAYLIST_ID ? '✓ configurado' : '✗ ausente',
  }, 'Variáveis de ambiente carregadas')
  return data
}

export const env = loadEnv()
