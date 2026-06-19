import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage } from '@langchain/core/messages'
import { z } from 'zod'
import { nativeFetch } from '../../shared/http/native-fetch'
import { env } from '../../config/env'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('BankNotificationImageService')

const transactionSchema = z.object({
  transactions: z.array(
    z.object({
      money: z.number().describe('Valor numérico da transação sem símbolo de moeda (ex: 45.86)'),
      currency: z.enum(['BRL', 'USD']).describe('Moeda da transação: BRL para reais, USD para dólares'),
      description: z.string().describe('Nome do estabelecimento ou descrição da transação'),
    })
  ).describe('Lista de transações bancárias encontradas na imagem'),
  success: z.boolean().describe('true se ao menos uma transação foi identificada com sucesso'),
  reason: z.string().nullable().describe('Motivo de falha quando success for false, null caso contrário'),
})

export type BankNotificationResult = z.infer<typeof transactionSchema>
export type ExtractedTransaction = BankNotificationResult['transactions'][number]

const PROMPT = `Você é um agente especialista em extrair dados de notificações bancárias.
Analise a imagem e extraia TODAS as notificações de transações bancárias visíveis.

Para cada transação extraia:
- money: valor numérico sem símbolo de moeda (ex: 45.86 — use ponto decimal, sem R$ ou $)
- currency: "BRL" se for em reais, "USD" se for em dólares americanos
- description: nome do estabelecimento/loja

A imagem pode conter uma ou mais notificações. Exemplos:
"Compra de R$ 45,86 APROVADA em SQ *BAREBOTTLE - SALES" → money: 45.86, currency: "BRL"
"Purchase of USD 12.50 at AMAZON" → money: 12.50, currency: "USD"
"Débito de R$ 120,00 em SUPERMERCADO XYZ" → money: 120.00, currency: "BRL"

Se a imagem não contiver nenhuma notificação bancária identificável, retorne success: false e descreva o motivo em reason.`

export async function extractTransactionsFromImage(imageUrl: string): Promise<BankNotificationResult> {
  if (!env.KEY_OPEN_AI) {
    return { transactions: [], success: false, reason: 'Chave da OpenAI não configurada' }
  }

  const model = new ChatOpenAI({
    modelName: 'gpt-4o',
    temperature: 0,
    apiKey: env.KEY_OPEN_AI,
    configuration: { fetch: nativeFetch },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const structuredModel = (model as any).withStructuredOutput(transactionSchema)

  const message = new HumanMessage({
    content: [
      {
        type: 'image_url',
        image_url: { url: imageUrl },
      },
      {
        type: 'text',
        text: PROMPT,
      },
    ],
  })

  try {
    const result = await structuredModel.invoke([message])
    log.info({ result }, 'Transactions extracted from bank notification image')
    return result as BankNotificationResult
  } catch (err) {
    log.error({ err }, 'Error extracting transactions from bank notification image')
    return {
      transactions: [],
      success: false,
      reason: `Erro ao processar a imagem: ${(err as Error).message}`,
    }
  }
}
