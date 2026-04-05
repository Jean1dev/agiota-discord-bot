// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string = require('@ffmpeg-installer/ffmpeg').path
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpeg = require('fluent-ffmpeg')
ffmpeg.setFfmpegPath(ffmpegPath)
