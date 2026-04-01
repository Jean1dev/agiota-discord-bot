import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { StructuredOutputParser } from 'langchain/output_parsers'
import { z } from 'zod'
import { MessageEmbed, MessageButton, MessageActionRow } from 'discord.js'
import { CHAT_GERAL } from '../../discord/DiscordConstants'
import { rankingService } from '../ranking/RankingService'

function getContext() {
    return require('../../context').contextInstance()
}

function getConfig() {
    return require('../../config')
}

const SYSTEM_PROMPT_TEMPLATE = [
    'Você é um gerador de quiz técnico sobre tecnologia e desenvolvimento de software.',
    'Gere uma pergunta de múltipla escolha com até 3 alternativas, e a(s) resposta(s) correta(s).',
    'As perguntas devem variar entre níveis de dificuldade: fácil (conceitos básicos), intermediário (boas práticas, padrões), avançado (detalhes internos, otimização, casos de uso complexos).',
    'Exemplos de tópicos: Java (JVM, garbage collection, streams, Spring), JavaScript (event loop, closures, ES6+), TypeScript (tipos, generics), AWS (EC2, Lambda, S3), Google Cloud, Azure, Docker, Kubernetes, CI/CD, React, Node.js, Spring Boot, etc.',
    'Inclua perguntas de diferentes níveis de complexidade, alternando entre elas.',
    'Retorne sua resposta como JSON que siga o schema abaixo:',
    '```json\n{schema}\n```.',
    'Certifique-se de envolver a resposta em tags ```json e ``` e seguir o schema exatamente.'
].join('\n')

interface QuizResult {
    question: string
    alternatives: string[]
    correctAnswers: string[]
    explanation?: string
}

function createQuizSchema() {
    return z.object({
        question: z.string().describe('Pergunta do quiz.'),
        alternatives: z.array(z.string()).length(3).describe('Alternativas de resposta, sempre 3.'),
        correctAnswers: z.array(z.string()).min(1).max(3).describe('Letra(s) da(s) alternativa(s) correta(s), ex: ["a"] ou ["a","b"]'),
        explanation: z.string().optional().describe('Explicação da resposta correta.')
    })
}

function createModel() {
    return new ChatOpenAI({
        modelName: 'gpt-3.5-turbo',
        temperature: 0.7,
        apiKey: getConfig().KEY_OPEN_AI
    })
}

async function gerarQuiz(): Promise<QuizResult> {
    const prompt = ChatPromptTemplate.fromMessages([
        ['system', SYSTEM_PROMPT_TEMPLATE],
        ['human', 'Gere uma pergunta de quiz técnico sobre tecnologia e desenvolvimento de software.']
    ])

    const schema = createQuizSchema()
    const outputParser = StructuredOutputParser.fromZodSchema(schema as any)
    const model = createModel()

    const chain = (prompt as any).pipe(model).pipe(outputParser)

    const result = await chain.invoke({
        schema: outputParser.getFormatInstructions(),
    })
    return result as QuizResult
}

function gerarDiscordEmbed(quiz: QuizResult): { embed: MessageEmbed; actionRow: MessageActionRow } {
    const letras = ['a', 'b', 'c']
    const alternativasFormatadas = quiz.alternatives
        .map((alt, idx) => `**${letras[idx]})** ${alt}`)
        .join('\n\n')

    const embed = new MessageEmbed()
        .setTitle('🧠 Quiz')
        .setDescription(`**Pergunta:**\n${quiz.question}\n\n${alternativasFormatadas}`)
        .setThumbnail('https://media.istockphoto.com/id/1616906708/pt/vetorial/vector-speech-bubble-with-quiz-time-words-trendy-text-balloon-with-geometric-grapic-shape.jpg?s=612x612&w=0&k=20&c=nEw2MiBcD18arANGA6n5Q0UPPLjVLpAmDMmt7mE7D4I=')
        .setColor('RANDOM')

    const messagesButtons = letras.map((letra, index) => {
        return new MessageButton()
            .setCustomId(`alternative-${index}`)
            .setLabel(letra)
            .setStyle('PRIMARY')
    })

    const actionRow = new MessageActionRow().addComponents(messagesButtons)
    return { embed, actionRow }
}

function isCorrectAnswer(interaction: string, quiz: QuizResult): boolean {
    const number = Number(interaction.split('-')[1])
    const letra = String.fromCharCode(97 + number)
    return quiz.correctAnswers[0] === letra
}

function handleChampion(interaction: any): void {
    const { id } = interaction.member.user
    rankingService.criarOuAtualizarRanking({
        operacao: 'ADICIONAR',
        pontuacao: 10,
        userId: id,
    })
}

function publishAndListening(
    { embed, actionRow }: { embed: MessageEmbed; actionRow: MessageActionRow },
    quiz: QuizResult
): void {
    const channel = getContext().client.channels.cache.find(
        (ch: any) => ch.name === CHAT_GERAL
    )
    channel
        .send({ embeds: [embed], components: [actionRow] })
        .then((message: any) => {
            const collector = message.createMessageComponentCollector({ time: 360000 })

            collector.on('collect', (interaction: any) => {
                const yes = isCorrectAnswer(interaction.customId, quiz)
                if (yes) {
                    interaction.reply('Resposta correta')
                    handleChampion(interaction)
                } else {
                    interaction.reply('Resposta errada')
                    if (quiz.explanation) {
                        channel.send(`Explicação: ${quiz.explanation}`)
                    }
                }
                collector.stop()
            })

            collector.on('end', () => {
                message.delete()
            })
        })
}

export async function runQuizTask(): Promise<void> {
    const quiz = await gerarQuiz()
    const { embed, actionRow } = gerarDiscordEmbed(quiz)
    publishAndListening({ embed, actionRow }, quiz)
}
