import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage } from '@langchain/core/messages'
import { z } from 'zod'
import { env } from '../../config/env'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('BankNotificationImageService')

const transactionSchema = z.object({
  transactions: z.array(
    z.object({
      money: z.number().describe('Valor da transação em BRL como número decimal (ex: 45.86)'),
      description: z.string().describe('Nome do estabelecimento ou descrição da transação'),
    })
  ).describe('Lista de transações bancárias encontradas na imagem'),
  success: z.boolean().describe('true se ao menos uma transação foi identificada com sucesso'),
  reason: z.string().optional().describe('Motivo de falha quando success for false'),
})

export type BankNotificationResult = z.infer<typeof transactionSchema>

const PROMPT = `Você é um agente especialista em extrair dados de notificações bancárias brasileiras.
Analise a imagem e extraia TODAS as notificações de transações bancárias visíveis.

Para cada transação extraia:
- money: valor em BRL como número decimal (ex: 45.86 — sem R$, sem vírgula)
- description: nome do estabelecimento/loja

A imagem pode conter uma ou mais notificações. Exemplos de padrões comuns:
"Compra de R$ 45,86 APROVADA em SQ *BAREBOTTLE - SALES para o cartão com final 4545"
"Débito de R$ 120,00 em SUPERMERCADO XYZ"

Se a imagem não contiver nenhuma notificação bancária identificável, retorne success: false e descreva o motivo em reason.`

export async function extractTransactionsFromImage(imageUrl: string): Promise<BankNotificationResult> {
  if (!env.KEY_OPEN_AI) {
    return { transactions: [], success: false, reason: 'Chave da OpenAI não configurada' }
  }

  const model = new ChatOpenAI({
    modelName: 'gpt-4o',
    temperature: 0,
    apiKey: env.KEY_OPEN_AI,
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
