const AssistantV2 = require('ibm-watson/assistant/v2')
const { IamAuthenticator } = require('ibm-watson/auth')
const { ASSISTANT_IAM_APIKEY, ASSISTANT_ID } = require('../config')
const buildMessageElements = require('./watson-utils')

const assistant = new AssistantV2({
  version: '2019-02-28',
  authenticator: new IamAuthenticator({
    apikey: ASSISTANT_IAM_APIKEY,
  }),
  url: 'https://api.us-south.assistant.watson.cloud.ibm.com/instances/c50aa5e1-86af-4bfc-b101-4b2c661e73b4',
})

const state = {
  sessionId: undefined
}

const createSession = (callback = () => { }) => {
  console.warn('criando sessao no watson')
  assistant.createSession({ assistantId: ASSISTANT_ID }).then(response => {
    state.sessionId = response.result.session_id
    callback()
  }).catch(err => {
    return console.error('erro ao pegar sessao no watson', err)
  })
}

const sendMessage = message => {
  if (!state.sessionId) {
    return createSession(() => { sendMessage(message) })
  }

  const payload = {
    assistantId: ASSISTANT_ID,
    sessionId: state.sessionId,
    input: {
      message_type: 'text',
      text: message.content,
    },
  }

  assistant.message(payload)
    .then(response => {
      const data = buildMessageElements(response.result)
      console.log(data)
      if (!data.length) {
        message.reply('ainda nao sei lidar com isso')
        return
      }

      data.forEach(recognizer => {
        if (recognizer.type === 'suggestion') {
          message.reply('recebi uma sugestão de coisas, mas ainda não fui implementado para lidar com elas')
          return
        }

        message.channel.send(recognizer.text)
      })
    }).catch(err => {
      if (err) {
        state.sessionId = undefined
        return console.error('erro ao enviar mensagem', err)
      }

      console.log(data.result)
    })
}

module.exports = {
  handleMessageWithIa: sendMessage
}
