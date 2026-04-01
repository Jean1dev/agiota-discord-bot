// Migrado para TypeScript — src/infrastructure/database/MongoRepository.ts
const { connect } = require('../infrastructure/database/MongoConnection')
const {
    getContextState: getDataFromMongo,
    saveContextState: save,
    saveYoutubeVideos,
    findYoutubeVideosWatchLater,
    deleteYoutubeVideosCollection,
    getGoogleOAuthToken,
    saveGoogleOAuthToken,
} = require('../infrastructure/database/MongoRepository')

module.exports = {
    connect,
    getDataFromMongo,
    save,
    saveYoutubeVideos,
    findYoutubeVideosWatchLater,
    deleteYoutubeVideosCollection,
    getGoogleOAuthToken,
    saveGoogleOAuthToken,
    DbInstance: () => require('../infrastructure/database/MongoConnection').MongoConnection.getDb(),
}
