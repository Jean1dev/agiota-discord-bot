require('dotenv').config()
console.log('dotenv loaded')

require('./dist/config-ffmpeg')
console.log('config-ffmpeg loaded')

require('./dist/bot')
console.log('bot loaded')

require('./dist/global-exception-handler')
console.log('global-exception-handler loaded')

require('./dist/app-events')
console.log('app-events loaded')

require('./dist/telegram/index.js')
console.log('telegram loaded')
