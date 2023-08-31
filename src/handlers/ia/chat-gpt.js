const axios = require('axios');
const context = require('../../context')
const { KEY_OPEN_AI } = require('../../config')
const MAX_LENGTH = 2000;

let threadId = 1

const openaiAxios = axios.create({
    baseURL: 'https://api.openai.com/v1',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KEY_OPEN_AI}`
    }
});

async function getCompletion(messages) {
    try {
        const response = await openaiAxios.post('/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages,
            temperature: 0.7
        });

        return response.data;
    } catch (error) {
        if (error.response) {
            console.error('Erro da API:', error.response.data);
        } else if (error.request) {
            console.error('Nenhuma resposta da API:', error.request);
        } else {
            console.error('Erro ao configurar a solicitação:', error.message);
        }
        throw error;
    }
}

function divideMessage(message, maxLength) {
    const chunks = [];
    while (message.length > maxLength) {
        chunks.push(message.substring(0, maxLength));
        message = message.substring(maxLength);
    }
    chunks.push(message);
    return chunks;
}

function gptResponseDisplay(thread, chatGPTResponse) {
    if (chatGPTResponse.length > MAX_LENGTH) {
        const chunks = divideMessage(chatGPTResponse, MAX_LENGTH);
        chunks.forEach(chunk => thread.send(chunk));
    } else {
        thread.send(chatGPTResponse);
    }
}

function continueConversation(conversationHistory, newMessage) {
    conversationHistory.messages.push({
        role: 'user',
        content: newMessage
    })

    getCompletion(conversationHistory.messages)
        .then((data) => {
            const chatGPTResponse = data.choices[0].message.content.trim();
            conversationHistory.messages.push({
                role: 'assistant',
                content: chatGPTResponse
            })
            gptResponseDisplay(conversationHistory.thread, chatGPTResponse)
        })
}

async function handleCommand(args, message) {
    if (context.isChatGPTEnabled) {
        let userMessage = args.join(" ")
        const thread = await message.startThread({
            name: 'chat-gtp' + threadId,
            autoArchiveDuration: 60,
            reason: 'Chat gpt call',
        });

        console.log(`Nova thread criada: ${thread.name}`);
        threadId++

        context.conversationHistory.push({
            messages: [{
                role: 'user',
                content: userMessage
            }],
            thread,
            threadRef: thread.id
        })

        const position = context.conversationHistory.length -1

        getCompletion(context.conversationHistory[position].messages)
            .then((data) => {
                const chatGPTResponse = data.choices[0].message.content.trim();
                context.conversationHistory[position].messages.push({
                    role: 'assistant',
                    content: chatGPTResponse
                })
                gptResponseDisplay(thread, chatGPTResponse)
            })
            .catch(error => {
                message.reply('Error ao buscar resposta 🥵')
                console.error('Erro ao obter conclusão:', error);
            });
    } else {
        message.reply('Chat Gpt desativado  👩‍💻 🥵')
    }
}

module.exports = {
    handleCommand,
    continueConversation
}