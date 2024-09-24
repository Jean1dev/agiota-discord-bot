const connectUserChannel = require("../../audio/connect-user-channel")
const ListeningStream = require("../../audio/listening-audio-stream")
const { LIXO_CHANNEL } = require("../../discord-constants")
const context = require("../../context").contextInstance
const { speechToText, textCompletion, textToSpeech } = require("../../ia/open-ai-api")
const { convertOggToMp3 } = require("../../services/cloud-convert")
const { runMusicBuffer } = require("../music/play-resource-buffer")

const listeningUsersId = new Set()
let channelRef = null

function logMessageOnLixoChannel(message) {
    const chan = context().client.channels.cache.find(channel => channel.name === LIXO_CHANNEL)
    if (chan) {
        chan.send(message)
    }
}

async function respond(filename) {
    try {
        logMessageOnLixoChannel(`Convertendo para mp3`)
        const resultMp3 = await convertOggToMp3(filename)

        logMessageOnLixoChannel(`Executando servico de fala para voz`)
        const transcription = await speechToText(resultMp3)

        const messageToGpt = [{
            role: 'user',
            content: transcription
        }]

        logMessageOnLixoChannel(`Enviando buffer pro gpt`)
        const completition = await textCompletion(messageToGpt)
        const chatGPTResponse = completition.choices[0].message.content.trim();

        logMessageOnLixoChannel(`Enviado para o servido de texto para fala`)
        const audioBuffer = await textToSpeech(chatGPTResponse)

        logMessageOnLixoChannel(`Fechou vou tocar o som agora`)
        await runMusicBuffer(channelRef, audioBuffer)


    } catch (error) {
        logMessageOnLixoChannel(`deu pau :/ ${error.message}`)
        console.error(error)
    }
}

async function listening(connection) {
    const receiver = connection.receiver
    const client = context().client

    receiver.speaking.on('start', (userId) => {
        if (listeningUsersId.has(userId)) {
            return
        } 

        listeningUsersId.add(userId)
        ListeningStream(receiver, userId, client.users.cache.get(userId), respond)
    })
}

module.exports = message => {
    const channel = message.member?.voice.channel

    if (!channel) {
        message.reply('Join a voice channel then try again!')
        return
    }

    channelRef = channel
    connectUserChannel(channel)
        .then(listening)
        .catch(console.error)
}