const { ChatOpenAI } = require('@langchain/openai')
const { StructuredOutputParser } = require('langchain/output_parsers')
const { ChatPromptTemplate } = require('@langchain/core/prompts')
const { z } = require('zod')
const { KEY_OPEN_AI } = require('../../config')

const AddressSchema = z.object({
  cep: z.string().optional().describe('CEP quando mencionado'),
  logradouro: z.string().optional().describe('Rua, avenida, etc.'),
  numero: z.string().optional().describe('Número do endereço'),
  complemento: z.string().optional().describe('Apartamento, bloco, etc.'),
  bairro: z.string().optional().describe('Bairro'),
  cidade: z.string().optional().describe('Cidade'),
  estado: z.string().optional().describe('Estado (UF)'),
  referencia: z.string().optional().describe('Ponto de referência se houver')
})

function createModel() {
  return new ChatOpenAI({
    modelName: 'gpt-3.5-turbo',
    temperature: 0.2,
    apiKey: KEY_OPEN_AI
  })
}

const SYSTEM_PROMPT = [
  'Você extrai dados de endereço a partir de texto livre em português do Brasil.',
  'Retorne apenas os campos que forem identificados no texto.',
  'CEP pode ter ou não hífen (ex: 88040-100 ou 88040100).',
  'Retorne sua resposta em JSON que siga exatamente o schema: {schema}'
].join(' ')

async function extractAddressFromText(text) {
  if (!text || !String(text).trim()) return null
  const outputParser = StructuredOutputParser.fromZodSchema(AddressSchema)
  const model = createModel()
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', SYSTEM_PROMPT],
    ['human', 'Extraia o endereço do texto abaixo:\n\n{text}']
  ])
  const chain = prompt.pipe(model).pipe(outputParser)
  try {
    const result = await chain.invoke({
      schema: outputParser.getFormatInstructions(),
      text: String(text).trim()
    })
    return result
  } catch (e) {
    console.error('addressExtractionService error', e)
    return null
  }
}

module.exports = {
  extractAddressFromText,
  AddressSchema
}
