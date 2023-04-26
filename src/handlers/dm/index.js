const axios = require('axios')

module.exports = (message, client) => {
  axios.post(process.env.TILL_URL, {
    "phone": [
      message.content
    ],
    "text": "Hello Heroku!"
  }).then(r => console.log(r))
  .catch(e => console.log(e))

  return
  
  const channel = client.channels.cache.find(channel => channel.name === '🧵-geral')
  if (channel && channel.send) {
    setTimeout(() => {
      channel.send(message.content)
    }, 2000)
  }
}
