import { MongoReadingRepository } from '../../../infrastructure/database/MongoReadingRepository'
import { RegisterPagesReadUseCase } from '../../../application/reading/RegisterPagesReadUseCase'
import { GetReadingStatusUseCase } from '../../../application/reading/GetReadingStatusUseCase'
import { RegisterPagesReadCommand } from './RegisterPagesReadCommand'
import { ReadingStatusCommand } from './ReadingStatusCommand'

const repo = new MongoReadingRepository()

const registerPagesReadCommand = new RegisterPagesReadCommand(new RegisterPagesReadUseCase(repo))
const readingStatusCommand = new ReadingStatusCommand(new GetReadingStatusUseCase(repo))

export const registrarLeituraHandler = registerPagesReadCommand.asHandler()
export const statusLeituraHandler = readingStatusCommand.asNoArgsHandler()
