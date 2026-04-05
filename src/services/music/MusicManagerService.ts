import { MongoConnection } from '../../infrastructure/database/MongoConnection'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('MusicManagerService')

const MUSIC_COLLECTION = 'songs'

interface SongDoc { urlMusic: string }

export function addMusic(urlMusic: string): void {
  MongoConnection.getCollection<SongDoc>(MUSIC_COLLECTION)
    .insertOne({ urlMusic } as never)
    .then(() => log.info({ urlMusic }, 'music inserted'))
    .catch(err => log.error({ err }, 'addMusic failed'))
}

export async function ramdomMusic(): Promise<string> {
  const data = await MongoConnection.getCollection<SongDoc>(MUSIC_COLLECTION).find({}).toArray()
  if (!data.length) return ''
  const pick = data[Math.floor(Math.random() * data.length)]
  return pick?.urlMusic ?? ''
}
