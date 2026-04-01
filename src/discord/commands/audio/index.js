const { MusicPlayerCommand } = require('./MusicPlayerCommand')
const { RecordAudioCommand } = require('./RecordAudioCommand')
const { UploadRecordsCommand } = require('./UploadRecordsCommand')
const { RealTimeConversaCommand } = require('./RealTimeConversaCommand')

const musicPlayerCommand = new MusicPlayerCommand()
const recordAudioCommand = new RecordAudioCommand()
const uploadRecordsCommand = new UploadRecordsCommand()
const realTimeConversaCommand = new RealTimeConversaCommand()

module.exports = {
  musicPlayerHandler: musicPlayerCommand.asNoArgsHandler(),
  recordHandler: recordAudioCommand.asHandler(),
  uploadRecordsHandler: uploadRecordsCommand.asNoArgsHandler(),
  realTimeConversaHandler: realTimeConversaCommand.asNoArgsHandler(),
}
