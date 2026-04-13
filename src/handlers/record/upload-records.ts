import { contextInstance } from '../../context'
import { googleOAuthState } from '../../adapters/google-Oauth'
import { google } from 'googleapis'
import fs from 'fs'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('UploadRecords')

const TOKEN_PATH = 'token.json'

const uploadRecordsHandler = (message: any): void => {
  if (!contextInstance().gravacoes.length) return

  function askForToken(callback: (auth: any) => void): void {
    const authUrl = googleOAuthState.getAuthUrl
      ? googleOAuthState.getAuthUrl()
      : googleOAuthState.authUrl
    message.reply('Estou sem o token. Abra o link, autorize e cole aqui a URL inteira da barra de endereços.')
    message.reply(authUrl, { fetchReply: true }).then(() => {
      message.channel.awaitMessages({ max: 1, time: 120000, errors: ['time'] })
        .then((collected: any) => {
          const raw = collected.first().content
          googleOAuthState.setAuthToken(raw).then(callback)
        })
        .catch(() => {
          message.author.send('Request Denied because you did not responded with a registered email ID.')
        })
    })
  }

  function upload(auth: any): void {
    const drive = google.drive({ version: 'v3', auth })
    const fileMetadata = {
      name: `${new Date().toLocaleDateString('pt-BR')}-gravaocao-AgiotaBot`,
      mimeType: 'application/vnd.google-apps.folder',
    }

    drive.files.create({ requestBody: fileMetadata, fields: 'id' } as any, (err: any, file: any) => {
      if (err) {
        log.error({ err }, 'nao consegui criar o folder no drive')
        message.reply('nao consegui criar o folder no drive')
        fs.rm(TOKEN_PATH, () => { })
        return
      }

      log.info({ folderId: file.data.id }, 'Folder criado no Drive')
      for (const item of contextInstance().gravacoes) {
        drive.files.create(
          {
            requestBody: { name: `${Date.now()}-gravacao.ogg`, parents: [file.data.id] },
            media: { mimeType: 'audio/ogg', body: fs.createReadStream(item) },
            fields: 'id',
          } as any,
          (err2: any) => {
            if (err2) { log.error({ err: err2 }, 'Erro ao fazer upload do arquivo'); fs.rm(TOKEN_PATH, () => { }) }
            else { log.info({ item }, 'Arquivo enviado com sucesso'); message.reply('subi pai') }
          }
        )
      }
      contextInstance().gravacoes = []
    })
  }

  if (!googleOAuthState.authorized) return askForToken(upload)
  upload(googleOAuthState.client)
}

export default uploadRecordsHandler
