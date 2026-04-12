import { ChatOpenAI } from '@langchain/openai'
import { StructuredOutputParser } from 'langchain/output_parsers'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { z } from 'zod'
import { env } from '../../config/env'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('AddressExtractionService')

export const AddressSchema = z.object({
  cep: z.string().optional().describe('CEP quando mencionado'),
  logradouro: z.string().optional().describe('Rua, avenida, etc.'),
  numero: z.string().optional().describe('Número do endereço'),
  complemento: z.string().optional().describe('Apartamento, bloco, etc.'),
  bairro: z.string().optional().describe('Bairro'),
  cidade: z.string().optional().describe('Cidade'),
  estado: z.string().optional().describe('Estado (UF)'),
  referencia: z.string().optional().describe('Ponto de referência se houver'),
})

export type Address = z.infer<typeof AddressSchema>

const SYSTEM_PROMPT = [
  'Você extrai dados de endereço a partir de texto livre em português do Brasil.',
  'Retorne apenas os campos que forem identificados no texto.',
  'CEP pode ter ou não hífen (ex: 88040-100 ou 88040100).',
  'Retorne sua resposta em JSON que siga exatamente o schema: {schema}',
].join(' ')

export async function extractAddressFromText(text: string): Promise<Address | null> {
  if (!text?.trim()) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const outputParser = StructuredOutputParser.fromZodSchema(AddressSchema as any)
  const model = new ChatOpenAI({ modelName: 'gpt-3.5-turbo', temperature: 0.2, apiKey: env.KEY_OPEN_AI })
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', SYSTEM_PROMPT],
    ['human', 'Extraia o endereço do texto abaixo:\n\n{text}'],
  ])

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (prompt as any).pipe(model).pipe(outputParser).invoke({
      schema: outputParser.getFormatInstructions(),
      text: text.trim(),
    })
    return result as Address
  } catch (e) {
    log.error({ err: e }, 'addressExtractionService error')
    return null
  }
}
