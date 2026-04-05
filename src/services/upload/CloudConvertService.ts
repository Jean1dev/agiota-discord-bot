import axios from 'axios'
import fs from 'fs'
import { env } from '../../config/env'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const CloudConvert = require('cloudconvert')

async function downloadMP3(url: string, filePath: string): Promise<string> {
  const response = await axios({ method: 'get', url, responseType: 'stream' })
  const writer = fs.createWriteStream(filePath)
  response.data.pipe(writer)
  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(filePath))
    writer.on('error', reject)
  })
}

export async function convertOggToMp3(oggFile: string): Promise<string> {
  const cloudConvert = new CloudConvert(env.CLOUD_CONVERT_API)

  let job = await cloudConvert.jobs.create({
    tasks: {
      'upload-my-file': { operation: 'import/upload' },
      'convert-my-file': { operation: 'convert', input: 'upload-my-file', output_format: 'mp3' },
      'export-my-file': { operation: 'export/url', input: 'convert-my-file' },
    },
  })

  const uploadTask = job.tasks.find((t: { name: string }) => t.name === 'upload-my-file')
  await cloudConvert.tasks.upload(uploadTask, fs.createReadStream(oggFile), 'result.mp3')

  job = await cloudConvert.jobs.wait(job.id)
  const file = cloudConvert.jobs.getExportUrls(job)[0]
  return downloadMP3(file.url, 'result.mp3')
}
