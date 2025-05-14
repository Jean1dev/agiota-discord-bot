const { MessageEmbed, MessageButton, MessageActionRow } = require("discord.js")
const { textCompletion } = require("../ia/open-ai-api")
const { CHAT_GERAL } = require("../discord-constants")
const RankingService = require("./RankingService")
const context = require('../context').contextInstance

const ROOT_PROMPT = `
    Estou criando um quiz iterativo sobre tecnologia e desenvolvimento de software.
    
    Crie uma pergunta técnica cuja resposta seja de múltiplas alternativas (máximo 3) separadas por vírgula.
    
    As perguntas devem cobrir os seguintes tópicos:
    1. Linguagens de Programação:
       - Java: JVM, bytecode, garbage collection, streams, lambdas, Spring Framework
       - JavaScript: event loop, closures, promises, async/await, ES6+
       - TypeScript: tipos, interfaces, generics, decorators, type inference
    
    2. Cloud Computing:
       - AWS: EC2, Lambda, S3, DynamoDB, CloudFormation
       - Google Cloud: Compute Engine, Cloud Functions, BigQuery, Cloud Storage
       - Azure: Virtual Machines, Functions, Cosmos DB, Blob Storage
    
    3. Infraestrutura e DevOps:
       - Docker: containers, imagens, Dockerfile, Docker Compose
       - Kubernetes: pods, services, deployments, ingress, helm
       - CI/CD: Jenkins, GitHub Actions, GitLab CI
    
    4. Frameworks e Bibliotecas:
       - React: hooks, context, redux, virtual DOM
       - Spring Boot: dependency injection, AOP, security
       - Node.js: event-driven, non-blocking I/O, npm
    
    Inclua perguntas de diferentes níveis de complexidade:
    - Básico: conceitos fundamentais e sintaxe
    - Intermediário: padrões de projeto e boas práticas
    - Avançado: funcionamento interno, otimização e casos de uso específicos
    
    A resposta deve seguir o formato:
    Pergunta
    -------------------
    a) Alternativa 1, b) Alternativa 2, c) Alternativa 3
    ----------
    Resposta correta (pode ser uma ou mais letras separadas por vírgula)
`

const state = {
    currentQuiz: {
        question: '',
        alternatives: '',
        answer: '',
    },
    rawMessage: null,
    multipleChoise: false
}

async function getQuizResponse() {
    const messageToGpt = [{
        role: 'user',
        content: ROOT_PROMPT
    }]

    try {
        const completition = await textCompletion(messageToGpt)
        const message = completition.choices[0].message.content.trim()
        state.rawMessage = message
        return {
            message,
            sucess: true
        };
    } catch (error) {
        console.error(error)
        return {
            message: 'Erro ao gerar pergunta',
            sucess: false
        };
    }
}

function defineMultipleChoiseAnswer(answer) {
    const answers = answer.split(',')
    if (answers.length > 1) {
        state.multipleChoise = true
        return answers
    }

    state.multipleChoise = false
    return answer
}

function processResponseQuiz(message) {
    const [question, rest] = message.split('-------------------');
    const [alternatives, answer] = rest.split('----------');
    const formattedQuestion = question.trim();
    const formattedAlternatives = alternatives.trim();
    const formattedAnswer = defineMultipleChoiseAnswer(answer.trim());

    return {
        question: formattedQuestion,
        alternatives: formattedAlternatives,
        answer: formattedAnswer
    };
}

function generateDiscordMessage(question, alternatives) {
    const embed = new MessageEmbed()
        .setTitle('Quiz')
        .setDescription(question)
        .setThumbnail('https://media.istockphoto.com/id/1616906708/pt/vetorial/vector-speech-bubble-with-quiz-time-words-trendy-text-balloon-with-geometric-grapic-shape.jpg?s=612x612&w=0&k=20&c=nEw2MiBcD18arANGA6n5Q0UPPLjVLpAmDMmt7mE7D4I=')
        .setColor("RANDOM")

    const messagesButtons = alternatives.split(',').map((alternative, index) => {
        return new MessageButton()
            .setCustomId(`alternative-${index}`)
            .setLabel(alternative)
            .setStyle('PRIMARY')
    })

    const actionRow = new MessageActionRow().addComponents(messagesButtons)

    return { embed, actionRow }
}

function multipleChoiseQuestionIsCorrect(interaction) {
    const number = Number(interaction.split('-')[1])
    let charResponse
    switch (number) {
        case 0:
            charResponse = 'a'
            break
        case 1:
            charResponse = 'b'
            break
        case 2:
            charResponse = 'c'
            break
        default:
            return false
    }

    const findedAnswer = state.currentQuiz.answer.find(ans => ans.trim() === charResponse)
    if (findedAnswer)
        return true

    return false
}

function questionIsCorrect(interaction) {
    if (state.multipleChoise) {
        return multipleChoiseQuestionIsCorrect(interaction)
    }

    const number = Number(interaction.split('-')[1])
    switch (number) {
        case 0:
            return state.currentQuiz.answer === "a"
        case 1:
            return state.currentQuiz.answer === "b"
        case 2:
            return state.currentQuiz.answer === "c"
        default:
            return false
    }
}

function explainQuestion(channel) {
    const messageToGpt = [{
        role: 'user',
        content: ROOT_PROMPT
    }, {
        role: 'assistant',
        content: state.rawMessage
    }, {
        role: 'user',
        content: 'Me explique a resposta'
    }]

    channel.send(`A resposta correta era ${state.currentQuiz.answer}`)
    textCompletion(messageToGpt)
        .then(completition => {
            const message = completition.choices[0].message.content.trim()
            channel.send(message)
        })
}

function handleChampion(interaction) {
    const { id, username } = interaction.member.user
    console.log(username, 'acertou o quiz e ganhou 10 pontos')
    RankingService.criarOuAtualizarRanking({
        operacao: 'ADICIONAR',
        pontuacao: 10,
        userId: id,
        username
    })
}

function publishAndListening({ embed, actionRow }) {
    const channel = context().client.channels.cache.find(channel => channel.name === CHAT_GERAL)
    channel.send({ embeds: [embed], components: [actionRow] })
        .then(message => {
            const collector = message.createMessageComponentCollector({ time: 360000 })

            collector.on('collect', interaction => {
                const yes = questionIsCorrect(interaction.customId)
                if (yes) {
                    interaction.reply('Resposta correta')
                    handleChampion(interaction)
                } else {
                    interaction.reply('Resposta errada')
                    explainQuestion(channel)
                }

                collector.stop()
            })

            collector.on('end', () => {
                message.delete()
            })
        })
}

async function runQuizTask() {
    const response = await getQuizResponse()
    if (!response.sucess) {
        return;
    }

    const { question, alternatives, answer } = processResponseQuiz(response.message)
    state.currentQuiz = {
        question,
        alternatives,
        answer
    }

    const embed = generateDiscordMessage(question, alternatives)
    publishAndListening(embed)
}

module.exports = runQuizTask

async function test() {
    const m = `
    Qual dos seguintes provedores de cloud oferece suporte direto para executar aplicações em Node.js?
    -------------------
    a) Google Cloud, b) AWS, c) Azure
    ----------
    a, b, c
    `
    const { question, alternatives, answer } = processResponseQuiz(m)
    state.currentQuiz = {
        question,
        alternatives,
        answer
    }

    const embed = generateDiscordMessage(question, alternatives)
    publishAndListening(embed)
}

// setTimeout(test, 10000)