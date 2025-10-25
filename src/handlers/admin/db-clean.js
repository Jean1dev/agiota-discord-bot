const { requireAdmin } = require('../guard-handler')
const { getKeycloakToken } = require('../../services/KeycloakService')
const { migrateCollections } = require('../../services/SubscriptionService')
const { CRYPTO_SERVICE_DB } = require('../../config')
const { MongoClient } = require('mongodb')
const captureException = require('../../observability/Sentry')

async function handle(message) {
    try {
        message.reply('🔄 Iniciando processo de limpeza do banco de dados...')
        
        const token = await getKeycloakToken()
        message.reply('✅ Token obtido com sucesso')
        
        const migrationResult = await migrateCollections(token)
        message.reply(`✅ Migração concluída: ${migrationResult.message} (${migrationResult.total} documentos migrados)`)
        
        const cryptoClient = new MongoClient(CRYPTO_SERVICE_DB, { 
            useNewUrlParser: true, 
            useUnifiedTopology: true 
        })
        
        await cryptoClient.connect()
        message.reply('✅ Conectado ao banco crypto2')
        
        const db = cryptoClient.db('crypto')
        const collections = await db.listCollections().toArray()
        message.reply(`📋 Encontradas ${collections.length} coleções no banco crypto2`)
        
        for (const collection of collections) {
            const collectionName = collection.name
            await db.collection(collectionName).drop()
        }
        
        message.reply('🗑️ Todas as coleções do banco crypto2 foram removidas com sucesso')
        
        await cryptoClient.close()
        message.reply('✅ Conexão encerrada')
        
        message.reply('🎉 Processo de limpeza do banco concluído com sucesso!')
        
    } catch (error) {
        console.error('Erro no comando db-clean:', error)
        captureException(error)
        message.reply(`❌ Erro durante o processo: ${error.message}`)
    }
}

module.exports = message => requireAdmin(message, handle)
