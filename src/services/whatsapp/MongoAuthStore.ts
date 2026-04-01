import { MongoConnection } from '../../infrastructure/database/MongoConnection'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('MongoAuthStore')

const COLLECTION = 'whatsapp_auth'
const DOC_ID = 'session'

interface AuthDoc {
  _id: string
  creds?: Record<string, unknown>
  keys?: Record<string, unknown>
}

function getCollection() {
  return MongoConnection.getCollection<AuthDoc>(COLLECTION)
}

export async function readDoc(): Promise<AuthDoc | null> {
  return getCollection().findOne({ _id: DOC_ID } as never)
}

export async function writeDoc(update: Partial<AuthDoc>): Promise<void> {
  await getCollection().updateOne(
    { _id: DOC_ID } as never,
    { $set: update },
    { upsert: true }
  )
}

export async function hasStoredAuth(): Promise<boolean> {
  const doc = await readDoc()
  if (!doc?.creds) return false
  return (doc.creds['registered'] === true) || !!(doc.creds['me'])
}

export async function clearSession(): Promise<boolean> {
  const result = await getCollection().deleteOne({ _id: DOC_ID } as never)
  log.info({ deleted: result.deletedCount }, 'WhatsApp session cleared')
  return result.deletedCount > 0
}
