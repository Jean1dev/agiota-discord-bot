const context = require("../../context").contextInstance;
const { textCompletion } = require("../../ia/open-ai-api");

let threadId = 1
const MAX_LENGTH = 2000;

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

    textCompletion(conversationHistory.messages)
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
    if (context().isChatGPTEnabled) {
        let userMessage = args.join(" ")
        const thread = await message.startThread({
            name: 'chat-gtp' + threadId,
            autoArchiveDuration: 60,
            reason: 'Chat gpt call',
        });

        console.log(`Nova thread criada: ${thread.name}`);
        threadId++

        context().conversationHistory.push({
            messages: [{
                role: 'user',
                content: userMessage
            }],
            thread,
            threadRef: thread.id
        })

        const position = context().conversationHistory.length - 1

        textCompletion(context().conversationHistory[position].messages)
            .then((data) => {
                const chatGPTResponse = data.choices[0].message.content.trim();
                context().conversationHistory[position].messages.push({
                    role: 'assistant',
                    content: chatGPTResponse
                })
                gptResponseDisplay(thread, chatGPTResponse)
            })
            .catch(() => {
                message.reply('Error ao buscar resposta 🥵')
            });
    } else {
        message.reply('Chat Gpt desativado  👩‍💻 🥵')
    }
}

module.exports = {
    handleCommand,
    continueConversation
}