import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { StructuredOutputParser } from 'langchain/output_parsers'
import { z } from 'zod'
import { env } from '../../config/env'

const SYSTEM_PROMPT = [
  'Você é um especialista em categorização de transações financeiras.',
  'Analise a descrição da transação e categorize-a com base nas categorias disponíveis fornecidas.',
  'Considere o contexto da descrição, palavras-chave e padrões comuns de gastos.',
  'Se a descrição não se encaixar perfeitamente em nenhuma categoria, escolha a mais próxima ou apropriada.',
  'Retorne sua resposta como JSON que siga o schema abaixo:',
  '```json\n{schema}\n```.',
  'Certifique-se de envolver a resposta em tags ```json e ``` e seguir o schema exatamente.',
].join('\n')

const categorizationSchema = z.object({
  categoria: z.string().describe('Categoria escolhida para a transação.'),
  descricao: z.string().describe('Descrição original da transação.'),
})

export type CategorizationResult = z.infer<typeof categorizationSchema>

export async function categorizarTransacao(
  categoriasDisponiveis: string[],
  descricaoTransacao: string,
): Promise<CategorizationResult> {
  const model = new ChatOpenAI({ modelName: 'gpt-3.5-turbo', temperature: 0.3, apiKey: env.KEY_OPEN_AI })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const outputParser = StructuredOutputParser.fromZodSchema(categorizationSchema as any)
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', SYSTEM_PROMPT],
    ['human', `Categorize a seguinte transação usando uma das categorias disponíveis:\n\nCategorias disponíveis: ${categoriasDisponiveis.join(', ')}\n\nDescrição da transação: ${descricaoTransacao}`],
  ])

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain = (prompt as any).pipe(model).pipe(outputParser)
    const result = await chain.invoke({ schema: outputParser.getFormatInstructions() })
    return result as CategorizationResult
  } catch (err) {
    throw new Error(`Falha na categorização automática da transação: ${(err as Error).message}`)
  }
}
