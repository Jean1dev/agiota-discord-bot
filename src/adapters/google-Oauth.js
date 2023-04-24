const {
    GOOGLE_CLIENT_ID: client_id,
    GOOGLE_CLIENT_SECRET: client_secret
} = require('../config')
const fs = require('fs')
const { google } = require('googleapis')

const redirect_uris = [
    "urn:ietf:wg:oauth:2.0:oob",
    "http://localhost"
]

const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])

const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly', 'https://www.googleapis.com/auth/drive.file']
const TOKEN_PATH = 'token.json'

function setAuthToken(token) {
    return new Promise((resolve, reject) => {
        oAuth2Client.getToken(token, (err, token) => {
            if (err) {
                reject(err)
            } else {
                oAuth2Client.setCredentials(token);

                fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                    if (err) {
                        reject(err)
                    } else {
                        googleOAuthState.authorized = true
                        console.log('Token stored to', TOKEN_PATH)
                    }
                })

                resolve(oAuth2Client)
            }
        })
    })
}


const googleOAuthState = {
    client: oAuth2Client,
    authorized: false,
    authUrl: null,
    setAuthToken
}

try {
    const token = fs.readFileSync(TOKEN_PATH)
    oAuth2Client.setCredentials(JSON.parse(token))
    googleOAuthState.authorized = true
} catch (error) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    })
    googleOAuthState.authUrl = authUrl
}

module.exports = googleOAuthState
