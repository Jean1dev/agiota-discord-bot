import { AdminGuard, requireAdminById } from '../../../../src/discord/guards/AdminGuard'
import { ConfigAuthorizationService } from '../../../../src/discord/guards/AuthorizationService'
import { BaseCommand, CommandContext, DiscordMessage } from '../../../../src/discord/commands/BaseCommand'
import { z } from 'zod'

// ── Helpers ───────────────────────────────────────────────────────────────

function makeMessage(userId: string): DiscordMessage & { replies: string[] } {
  const replies: string[] = []
  return {
    author: { id: userId, username: 'testuser', send: async () => undefined },
    channel: { send: async () => undefined },
    reply: async (text: string) => { replies.push(text) },
    replies,
  }
}

const noArgsSchema = z.tuple([]).rest(z.string())

class StubCommand extends BaseCommand<typeof noArgsSchema> {
  readonly name = 'stub'
  readonly description = 'Stub command for tests'
  protected readonly schema = noArgsSchema
  executed = false

  protected async handle(): Promise<void> {
    this.executed = true
  }

  protected getUsage() { return '`$stub`' }
}

// ── Testes ────────────────────────────────────────────────────────────────

describe('AdminGuard', () => {
  const ADMIN_ID = 'admin123'
  const USER_ID = 'regular456'

  let guard: AdminGuard
  let command: StubCommand

  beforeEach(() => {
    const auth = new ConfigAuthorizationService(ADMIN_ID)
    guard = new AdminGuard(auth)
    command = new StubCommand()
  })

  it('permite execução para usuário admin', async () => {
    const protected_ = guard.protect(command)
    const message = makeMessage(ADMIN_ID)
    const ctx: CommandContext = { message, args: [] }

    await protected_.execute(ctx)

    expect(command.executed).toBe(true)
    expect(message.replies).toHaveLength(0)
  })

  it('bloqueia execução para usuário não-admin', async () => {
    const protected_ = guard.protect(command)
    const message = makeMessage(USER_ID)
    const ctx: CommandContext = { message, args: [] }

    await protected_.execute(ctx)

    expect(command.executed).toBe(false)
    expect(message.replies[0]).toMatch('não tem permissão')
  })

  it('retorna o mesmo command object', () => {
    const protected_ = guard.protect(command)
    expect(protected_).toBe(command)
  })

  it('bloqueia com admin set vazio', async () => {
    const auth = new ConfigAuthorizationService('')
    const emptyGuard = new AdminGuard(auth)
    const protected_ = emptyGuard.protect(command)
    const message = makeMessage(ADMIN_ID)

    await protected_.execute({ message, args: [] })

    expect(command.executed).toBe(false)
  })

  it('suporta múltiplos admins', async () => {
    const auth = new ConfigAuthorizationService('admin1,admin2,admin3')
    const multiGuard = new AdminGuard(auth)

    for (const adminId of ['admin1', 'admin2', 'admin3']) {
      const cmd = new StubCommand()
      const protected_ = multiGuard.protect(cmd)
      await protected_.execute({ message: makeMessage(adminId), args: [] })
      expect(cmd.executed).toBe(true)
    }
  })
})

// ── requireAdminById ──────────────────────────────────────────────────────

describe('requireAdminById', () => {
  const ADMIN_ID = 'admin-standalone'

  beforeEach(() => {
    process.env['ADMIN_DISCORD_USER_IDS'] = ADMIN_ID
  })

  afterEach(() => {
    delete process.env['ADMIN_DISCORD_USER_IDS']
  })

  it('chama next(message) quando admin — overload sem args', async () => {
    const message = makeMessage(ADMIN_ID)
    let called = false
    const next = async (_msg: DiscordMessage) => { called = true }

    await requireAdminById(message, next)

    expect(called).toBe(true)
    expect(message.replies).toHaveLength(0)
  })

  it('bloqueia e responde quando não-admin — overload sem args', async () => {
    const message = makeMessage('outsider')
    let called = false
    await requireAdminById(message, async () => { called = true })

    expect(called).toBe(false)
    expect(message.replies[0]).toMatch('não tem permissão')
  })

  it('chama next(args, message) quando admin — overload com args', async () => {
    const message = makeMessage(ADMIN_ID)
    let receivedArgs: string[] | undefined
    const next = async (args: string[], _msg: DiscordMessage) => { receivedArgs = args }

    await requireAdminById(['foo', 'bar'], message, next)

    expect(receivedArgs).toEqual(['foo', 'bar'])
    expect(message.replies).toHaveLength(0)
  })

  it('bloqueia e responde quando não-admin — overload com args', async () => {
    const message = makeMessage('outsider')
    let called = false
    await requireAdminById(['foo'], message, async () => { called = true })

    expect(called).toBe(false)
    expect(message.replies[0]).toMatch('não tem permissão')
  })

  it('bloqueia quando ADMIN_DISCORD_USER_IDS não está definido', async () => {
    delete process.env['ADMIN_DISCORD_USER_IDS']
    const message = makeMessage(ADMIN_ID)
    let called = false
    await requireAdminById(message, async () => { called = true })

    expect(called).toBe(false)
  })
})
