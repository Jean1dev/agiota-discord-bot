const { DbInstance } = require('../../repository/mongodb')

const COLLECTION = 'whatsapp_auth'
const DOC_ID = 'session'

function getCollection() {
  const db = DbInstance()
  if (!db) throw new Error('MongoDB not connected')
  return db.collection(COLLECTION)
}

async function readDoc() {
  const col = getCollection()
  const doc = await col.findOne({ _id: DOC_ID })
  return doc
}

async function writeDoc(update) {
  const col = getCollection()
  await col.updateOne(
    { _id: DOC_ID },
    { $set: update },
    { upsert: true }
  )
}

async function hasStoredAuth() {
  const doc = await readDoc()
  return !!(doc?.creds?.registered)
}

async function clearSession() {
  const col = getCollection()
  const result = await col.deleteOne({ _id: DOC_ID })
  return result.deletedCount > 0
}

module.exports = {
  readDoc,
  writeDoc,
  hasStoredAuth,
  clearSession
}
