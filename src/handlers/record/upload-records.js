const context = require('../../context')
const googleOAuthState = require('../../adapters/google-Oauth')
const { google } = require('googleapis')
const fs = require('fs')


module.exports = message => {
  if (!context.gravacoes.length) {
    return
  }

  function askForToken(callback) {
    message.reply('Estou sem o token, autoriza lá e me manda aqui')

    message.reply(`Authorize this app by visiting this url: ${googleOAuthState.authUrl}`, { fetchReply: true })
      .then(() => {
        message.channel.awaitMessages({ max: 1, time: 60000, errors: ['time'] })
          .then(collected => {
            const code = collected.first().content
            googleOAuthState.setAuthToken(code).then(callback)

          })
          .catch(() => {
            message.author.send("Request Denied because you did not responded with a registerd email ID. You can request again!");
          })
      })

    return

  }

  function upload(auth) {
    const drive = google.drive({ version: 'v3', auth })

    const fileMetadata = {
      'name': `${new Date().toLocaleDateString('pt-BR')}-gravaocao-AgiotaBot`,
      'mimeType': 'application/vnd.google-apps.folder'
    }

    drive.files.create({
      resource: fileMetadata,
      fields: 'id'
    }, function (err, file) {
      if (err) {
        console.error(err);
        message.reply('nao consegui criar o folder no drive')
        fs.rm(TOKEN_PATH, () => { })
      } else {
        console.log('Folder Id: ', file.data.id);
        context.gravacoes
          .map(item => item)
          .forEach(item => {
            var fileMetadata = {
              name: `${Date.now()}-gravacao.ogg`,
              parents: [file.data.id]
            };
            var media = {
              mimeType: 'audio/ogg',
              body: fs.createReadStream(item)
            };

            drive.files.create({
              resource: fileMetadata,
              media: media,
              fields: 'id'
            }, function (err, _file) {
              if (err) {
                console.error(err)
                fs.rm(TOKEN_PATH, () => { })
              } else {
                console.log('up')
                message.reply('subi pai')
              }
            })
          })

        context.gravacoes = []
      }
    })
  }

  
  if (!googleOAuthState.authorized) {
    return askForToken(upload)
  }

  upload(googleOAuthState.client)
}
