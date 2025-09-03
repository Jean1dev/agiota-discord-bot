const { ChatOpenAI } = require("@langchain/openai");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { StructuredOutputParser } = require("langchain/output_parsers");
const { z } = require("zod");
const { KEY_OPEN_AI } = require('../config');

const SYSTEM_PROMPT_TEMPLATE = [
    "Você é um especialista em categorização de transações financeiras.",
    "Analise a descrição da transação e categorize-a com base nas categorias disponíveis fornecidas.",
    "Considere o contexto da descrição, palavras-chave e padrões comuns de gastos.",
    "Se a descrição não se encaixar perfeitamente em nenhuma categoria, escolha a mais próxima ou apropriada.",
    "Retorne sua resposta como JSON que siga o schema abaixo:",
    "```json\n{schema}\n```.",
    "Certifique-se de envolver a resposta em tags ```json e ``` e seguir o schema exatamente."
].join("\n");

function createCategorizationSchema() {
    return z.object({
        categoria: z.string().describe('Categoria escolhida para a transação.'),
        descricao: z.string().describe('Descrição original da transação.')
    });
}

function createModel() {
    return new ChatOpenAI({
        modelName: "gpt-3.5-turbo",
        temperature: 0.3,
        apiKey: KEY_OPEN_AI
    });
}

async function categorizarTransacao(categoriasDisponiveis, descricaoTransacao) {
    const categoriasString = categoriasDisponiveis.join(', ');
    
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", SYSTEM_PROMPT_TEMPLATE],
        ["human", `Categorize a seguinte transação usando uma das categorias disponíveis:\n\nCategorias disponíveis: ${categoriasString}\n\nDescrição da transação: ${descricaoTransacao}`]
    ]);

    const schema = createCategorizationSchema();
    const outputParser = StructuredOutputParser.fromZodSchema(schema);
    const model = createModel();

    const chain = prompt
        .pipe(model)
        .pipe(outputParser);

    try {
        const result = await chain.invoke({
            schema: outputParser.getFormatInstructions(),
        });
        return result;
    } catch (error) {
        console.error('Erro ao categorizar transação:', error);
        throw new Error('Falha na categorização automática da transação');
    }
}

module.exports = {
    categorizarTransacao
}
