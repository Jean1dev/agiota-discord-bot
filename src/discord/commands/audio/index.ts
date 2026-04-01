import { MusicPlayerCommand } from './MusicPlayerCommand'
import { RecordAudioCommand } from './RecordAudioCommand'
import { UploadRecordsCommand } from './UploadRecordsCommand'
import { RealTimeConversaCommand } from './RealTimeConversaCommand'

const musicPlayerCommand = new MusicPlayerCommand()
const recordAudioCommand = new RecordAudioCommand()
const uploadRecordsCommand = new UploadRecordsCommand()
const realTimeConversaCommand = new RealTimeConversaCommand()

export const musicPlayerHandler = musicPlayerCommand.asNoArgsHandler()
export const recordHandler = recordAudioCommand.asHandler()
export const uploadRecordsHandler = uploadRecordsCommand.asNoArgsHandler()
export const realTimeConversaHandler = realTimeConversaCommand.asNoArgsHandler()
