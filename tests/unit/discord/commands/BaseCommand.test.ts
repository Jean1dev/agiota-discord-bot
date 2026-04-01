import { BaseCommand, CommandContext, DiscordMessage } from '../../../../src/discord/commands/BaseCommand'
import { z } from 'zod'

// ── Helpers ───────────────────────────────────────────────────────────────

function makeMessage(userId = 'user1'): DiscordMessage & { replies: string[] } {
  const replies: string[] = []
  return {
    author: { id: userId, username: 'tester', send: async () => undefined },
    channel: { send: async () => undefined },
    reply: async (text: string) => { replies.push(text) },
    replies,
  }
}

const argsSchema = z.tuple([z.string().min(1)]).rest(z.string())

class StubCommand extends BaseCommand<typeof argsSchema> {
  readonly name = 'stub'
  readonly description = 'Stub'
  protected readonly schema = argsSchema
  executed = false
  shouldThrow = false

  protected async handle(): Promise<void> {
    if (this.shouldThrow) throw new Error('boom')
    this.executed = true
  }

  protected getUsage() { return '`$stub <arg>`' }
}

// ── Testes ────────────────────────────────────────────────────────────────

describe('BaseCommand', () => {
  let command: StubCommand
  const ctx = (userId: string, args: string[]): CommandContext => ({
    message: makeMessage(userId),
    args,
  })

  beforeEach(() => {
    command = new StubCommand()
  })

  // ── Execução normal ───────────────────────────────────────────────────

  it('executa handle quando schema válido', async () => {
    await command.execute(ctx('new-user-ok', ['hello']))
    expect(command.executed).toBe(true)
  })

  // ── Validação de schema ───────────────────────────────────────────────

  it('responde com mensagem de uso quando args inválidos', async () => {
    const message = makeMessage('schema-user')
    await command.execute({ message, args: [] }) // tuple requer pelo menos 1 elemento

    expect(command.executed).toBe(false)
    expect(message.replies[0]).toMatch('Uso incorreto')
    expect(message.replies[0]).toMatch('`$stub <arg>`')
  })

  // ── Rate limiting ─────────────────────────────────────────────────────

  it('bloqueia requisições após atingir o limite global', async () => {
    const userId = `rate-test-${Date.now()}`
    const message = makeMessage(userId)

    // O limitador global permite 5 req/60s — esgota o bucket
    for (let i = 0; i < 5; i++) {
      await command.execute({ message, args: ['x'] })
    }

    // A 6ª requisição deve ser bloqueada
    const blockedMessage = makeMessage(userId)
    await command.execute({ message: blockedMessage, args: ['x'] })

    expect(blockedMessage.replies[0]).toMatch('Muitas requisições')
    expect(blockedMessage.replies[0]).toMatch('s.')
  })

  // ── Tratamento de erro ────────────────────────────────────────────────

  it('responde com mensagem genérica quando handle lança erro', async () => {
    command.shouldThrow = true
    const message = makeMessage('error-user')

    await command.execute({ message, args: ['x'] })

    expect(message.replies[0]).toMatch('erro inesperado')
  })

  // ── Adaptadores legados ───────────────────────────────────────────────

  it('asHandler retorna função que chama execute com args e message', async () => {
    const handler = command.asHandler()
    const message = makeMessage('handler-user')

    await handler(['hello'], message)

    expect(command.executed).toBe(true)
  })

  it('asNoArgsHandler retorna função que chama execute sem args', async () => {
    const noArgsCommand = new StubCommand()
    // Troca schema para aceitar array vazio
    Object.assign(noArgsCommand, { schema: z.tuple([]).rest(z.string()) })

    const handler = noArgsCommand.asNoArgsHandler()
    const message = makeMessage('no-args-user')

    await handler(message)

    expect(noArgsCommand.executed).toBe(true)
  })
})
