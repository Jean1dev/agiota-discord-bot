import axios from 'axios'
import FormData from 'form-data'
import fs from 'fs'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('UploadService')

const STORAGE_SERVICE_URL = 'https://storage-manager-svc.herokuapp.com/v1/s3'
const BUCKET_STORAGE = 'binnoroteirizacao'

export async function upload(filePath: string): Promise<unknown> {
  const form = new FormData()
  form.append('file', fs.createReadStream(filePath))

  try {
    const response = await axios.request({
      method: 'POST',
      url: STORAGE_SERVICE_URL,
      maxBodyLength: Infinity,
      params: { bucket: BUCKET_STORAGE },
      headers: form.getHeaders(),
      data: form,
      timeout: 100_000,
    })
    return response.data
  } catch (err) {
    log.error({ err }, 'upload failed')
    return null
  }
}
