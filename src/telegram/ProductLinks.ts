import type { Context } from 'telegraf'

export async function sendProductLinks(ctx: Context): Promise<void> {
  await ctx.replyWithMarkdownV2(
    '*Informações*\n• [Documentação](https://docs.arbitragem-crypto.cloud/introduction)\n• [Site](https://market.arbitragem-crypto.cloud/)\n• [Plataforma](https://arbitragem-crypto.cloud/)\n• [Comunidade](https://comunidade.arbitragem-crypto.cloud/)',
  )
}
