import { ChatSessionService } from '../../../../src/services/ai/ChatSessionService'

describe('ChatSessionService', () => {
  let svc: ChatSessionService

  beforeEach(() => {
    svc = new ChatSessionService({ maxMessages: 4, sessionTtlMs: 5000 })
  })

  describe('createSession', () => {
    it('cria uma sessão com a mensagem inicial', () => {
      const session = svc.createSession('thread1', 'Olá!')
      expect(session.threadId).toBe('thread1')
      expect(session.messages).toHaveLength(1)
      expect(session.messages[0]).toEqual({ role: 'user', content: 'Olá!' })
    })

    it('incrementa o contador de sessões ativas', () => {
      svc.createSession('t1', 'msg')
      svc.createSession('t2', 'msg')
      expect(svc.activeSessionCount).toBe(2)
    })
  })

  describe('getSession', () => {
    it('retorna a sessão existente', () => {
      svc.createSession('t1', 'olá')
      const session = svc.getSession('t1')
      expect(session).not.toBeNull()
      expect(session?.threadId).toBe('t1')
    })

    it('retorna null para thread inexistente', () => {
      expect(svc.getSession('inexistente')).toBeNull()
    })
  })

  describe('addMessage', () => {
    it('adiciona mensagens à sessão', () => {
      svc.createSession('t1', 'pergunta')
      svc.addMessage('t1', 'assistant', 'resposta')
      const session = svc.getSession('t1')
      expect(session?.messages).toHaveLength(2)
      expect(session?.messages[1]).toEqual({ role: 'assistant', content: 'resposta' })
    })

    it('limita o histórico ao maxMessages preservando a primeira', () => {
      svc.createSession('t1', 'msg-inicial')
      svc.addMessage('t1', 'assistant', 'r1')
      svc.addMessage('t1', 'user', 'p2')
      svc.addMessage('t1', 'assistant', 'r2')
      // maxMessages = 4, já temos 4 — a próxima deve remover mensagens antigas
      svc.addMessage('t1', 'user', 'p3')

      const session = svc.getSession('t1')
      expect(session?.messages).toHaveLength(4)
      // A primeira mensagem deve ser preservada
      expect(session?.messages[0]?.content).toBe('msg-inicial')
      // A última mensagem adicionada deve estar presente
      expect(session?.messages[session!.messages.length - 1]?.content).toBe('p3')
    })

    it('retorna null para thread inexistente', () => {
      const result = svc.addMessage('naoexiste', 'user', 'msg')
      expect(result).toBeNull()
    })

    it('mantém imutabilidade — a sessão anterior não é alterada', () => {
      svc.createSession('t1', 'msg')
      const before = svc.getSession('t1')
      const beforeLength = before?.messages.length

      svc.addMessage('t1', 'assistant', 'resposta')

      // O objeto original não foi mutado
      expect(before?.messages.length).toBe(beforeLength)
    })
  })

  describe('purgeExpired', () => {
    it('remove sessões expiradas', async () => {
      const shortTtl = new ChatSessionService({ maxMessages: 10, sessionTtlMs: 30 })
      shortTtl.createSession('t1', 'msg')
      shortTtl.createSession('t2', 'msg')
      expect(shortTtl.activeSessionCount).toBe(2)

      await new Promise(r => setTimeout(r, 40))
      const purged = shortTtl.purgeExpired()

      expect(purged).toBe(2)
      expect(shortTtl.activeSessionCount).toBe(0)
    })

    it('mantém sessões ainda válidas', () => {
      svc.createSession('t1', 'msg')
      const purged = svc.purgeExpired()
      expect(purged).toBe(0)
      expect(svc.activeSessionCount).toBe(1)
    })

    it('retorna 0 quando não há sessões', () => {
      expect(svc.purgeExpired()).toBe(0)
    })
  })
})
