const { MessageEmbed, MessageButton, MessageActionRow } = require("discord.js")
const { textCompletion } = require("../ia/open-ai-api")
const { CHAT_GERAL } = require("../discord-constants")
const context = require('../context').contextInstance

const ROOT_PROMPT = `
    Estou criando um quiz iterativo sobre tecnologia e linguagens de programacao.
    Crie uma pergunta cujo a resposta seja de multiplas alternativas sendo que no maximo 3 e separadas por virgula,
    a pergunta tem que ser sobre os assunstos relacionados as linguagens de programacao Java, JavaScript e TypeScript,
    provedores de cloud como Google Cloud, AWS e Azure, ferramentas de infraestrutura como Docker e Kubernetes e Framworkds como ReactJS e SpringBoot.

    Apos gerar a pergunta separe a linha por ------------------- e joga a resposta separadas por virgula e depois outro separador de linha ----------
    e a reposta correta.

    Exemplo:
    Qual linguagem de programacao tem a instrucao console.log()?
    -------------------
    a) Java, b) JavaScript, c) TypeScript
    ----------
    b
`

const state = {
    currentQuiz: {
        question: '',
        alternatives: '',
        answer: ''
    },
    rawMessage: null
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

function processResponseQuiz(message) {
    const [question, rest] = message.split('-------------------');
    const [alternatives, answer] = rest.split('----------');
    const formattedQuestion = question.trim();
    const formattedAlternatives = alternatives.trim();
    const formattedAnswer = answer.trim();

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

function questionIsCorrect(interaction) {
    // 0 -> a
    // 1 -> b
    // 2 -> c
    const number = Number(interaction.split('-')[1])
    switch (number) {
        case 0:
            if (state.currentQuiz.answer === "a") {
                return true
            }
        case 1:
            if (state.currentQuiz.answer === "b") {
                return true
            }

        case 2:
            if (state.currentQuiz.answer === "c") {
                return true
            }

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

    textCompletion(messageToGpt)
        .then(completition => {
            const message = completition.choices[0].message.content.trim()
            channel.send(message)
        })
}

function publishAndListening({ embed, actionRow }) {
    const channel = context().client.channels.cache.find(channel => channel.name === CHAT_GERAL)
    channel.send({ embeds: [embed], components: [actionRow] })
        .then(message => {
            const collector = message.createMessageComponentCollector({ time: 120000 })

            collector.on('collect', interaction => {
                const yes = questionIsCorrect(interaction.customId)
                if (yes) {
                    interaction.reply('Resposta correta')
                } else {
                    interaction.reply('Resposta errada')
                    explainQuestion(channel)
                }

                collector.stop()
            })

            collector.on('end', collected => {
                console.log(`Collected ${collected.size} items`)
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