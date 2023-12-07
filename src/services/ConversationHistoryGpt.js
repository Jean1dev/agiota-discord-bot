const { continueConversation } = require('../handlers/ia/chat-gpt')
const context = require('../context').contextInstance

module.exports = (message) => {
    const threadRef = context().conversationHistory.find(obj => obj.threadRef == message.channelId)
    if (threadRef) {
        continueConversation(threadRef, message.content)
    }
}