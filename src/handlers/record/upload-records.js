const context = require('../../context')
const {
  GOOGLE_CLIENT_ID: client_id,
  GOOGLE_CLIENT_SECRET: client_secret
} = require('../../config')
const { google } = require('googleapis')
const fs = require('fs')

const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly', 'https://www.googleapis.com/auth/drive.file']
const TOKEN_PATH = 'token.json';

module.exports = message => {
  if (!context.gravacoes.length) {
    return
  }

  function getAccessToken(oAuth2Client, callback) {
    message.reply('Estou sem o token, autoriza lá e me manda aqui')

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    })

    message.reply(`Authorize this app by visiting this url: ${authUrl}`, { fetchReply: true })
      .then(() => {
        message.channel.awaitMessages({ max: 1, time: 60000, errors: ['time'] })
          .then(collected => {
            const code = collected.first().content
            oAuth2Client.getToken(code, (err, token) => {
              if (err) {
                return console.error('Error retrieving access token', err)
              }

              oAuth2Client.setCredentials(token)

              fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) {
                  return console.error(err)
                }

                console.log('Token stored to', TOKEN_PATH)
              })

              callback(oAuth2Client)
            })
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
      'name': `${new Date().toLocaleDateString('en-US')}-gravaocao-AgiotaBot`,
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

  const redirect_uris = [
    "urn:ietf:wg:oauth:2.0:oob",
    "http://localhost"
  ]
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])

  try {
    const token = fs.readFileSync(TOKEN_PATH)
    oAuth2Client.setCredentials(JSON.parse(token))

  } catch (error) {
    return getAccessToken(oAuth2Client, upload)
  }

  upload(oAuth2Client)
}
