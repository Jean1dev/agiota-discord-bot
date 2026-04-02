import type { Message } from 'discord.js'
import { MongoConnection } from '../../infrastructure/database/MongoConnection'

export default async function estatisticas(message: Message): Promise<void> {
  const coll = MongoConnection.getCollection('jogo_bixo_registros')
  const docs = await coll.find({} as never).sort({ _id: -1 }).limit(15).toArray()

  if (docs.length === 0) {
    await message.reply('Nenhum jogo registrado ainda.')
    return
  }

  const lines = docs.map((doc: Record<string, unknown>, i: number) => {
    const apostas = Array.isArray((doc as { apostas?: unknown[] }).apostas)
      ? (doc as { apostas: unknown[] }).apostas.length
      : 0
    const raw = (doc as { data?: Date }).data
    const data = raw ? new Date(raw).toISOString().slice(0, 10) : '?'
    const v = (doc as { vencedor?: { bichoVencedor?: { emoj?: string; nome?: string } } }).vencedor
    const bicho =
      v?.bichoVencedor != null
        ? `${v.bichoVencedor.emoj ?? ''} ${v.bichoVencedor.nome ?? ''}`.trim()
        : '—'
    return `${i + 1}. ${data} — ${apostas} aposta(s) — ${bicho}`
  })

  await message.reply(`Últimos jogos:\n${lines.join('\n')}`)
}
