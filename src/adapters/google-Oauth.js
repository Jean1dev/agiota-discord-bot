const {
    GOOGLE_CLIENT_ID: client_id,
    GOOGLE_CLIENT_SECRET: client_secret,
    GOOGLE_OAUTH_REDIRECT_URI: redirect_uri
} = require('../config')
const fs = require('fs')
const { google } = require('googleapis')

const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri)

const SCOPES = [
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube'
]
const TOKEN_PATH = 'token.json'

function getAuthUrl() {
    return oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        redirect_uri
    })
}

function extractCodeFromInput(input) {
    const trimmed = String(input).trim()
    if (trimmed.includes('code=')) {
        try {
            const urlStr = trimmed.startsWith('http') ? trimmed : `http://${trimmed.replace(/^\?/, '')}`
            const url = new URL(urlStr)
            return url.searchParams.get('code')
        } catch (_) {
            const match = trimmed.match(/[?&]code=([^&\s]+)/)
            return match ? match[1] : null
        }
    }
    return trimmed || null
}

function setAuthToken(tokenOrUrl) {
    const code = extractCodeFromInput(tokenOrUrl) || tokenOrUrl
    return new Promise((resolve, reject) => {
        oAuth2Client.getToken(code, (err, token) => {
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
    setAuthToken,
    getAuthUrl
}

try {
    const token = fs.readFileSync(TOKEN_PATH)
    oAuth2Client.setCredentials(JSON.parse(token))
    googleOAuthState.authorized = true
} catch (error) {
    googleOAuthState.authUrl = getAuthUrl()
}

module.exports = googleOAuthState
