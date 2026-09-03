import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { createLogger } from '../../../shared/logger/Logger'
import { getDefaultChatModel, setDefaultChatModel } from '../../../services/llm/defaultChatModel'
import { MODELO_SELECTION_TIMEOUT_MS } from '../../../services/llm/constants'
import { listModels, isLiteLlmConfigured } from '../../../services/llm/LiteLlmClient'
import {
  filterChatModels,
  formatNumberedModelList,
  parseModelSelection,
} from '../../../services/llm/modelCatalog'

const log = createLogger('ModeloCommand')

const schema = z.tuple([]).rest(z.string())

interface DiscordMessageWithChannel extends DiscordMessage {
  channel: {
    send(text: string): Promise<unknown>
    awaitMessages(options: {
      filter: (m: any) => boolean
      max: number
      time: number
      errors: string[]
    }): Promise<{ first(): { content: string } }>
  }
}

export class ModeloCommand extends BaseCommand<typeof schema> {
  readonly name = 'modelo'
  readonly description = 'Lista modelos LiteLLM e define o modelo de chat padrão :: $modelo | $modelo atual'
  protected readonly schema = schema

  protected async handle(message: DiscordMessage, args: z.infer<typeof schema>): Promise<void> {
    const sub = args[0]?.trim().toLowerCase()
    if (sub === 'atual') {
      await message.reply(`Modelo de chat padrão: \`${getDefaultChatModel()}\``)
      return
    }

    if (!isLiteLlmConfigured()) {
      await message.reply('LiteLLM não configurado. Defina LITELLM_BASE_URL e LITELLM_API_KEY.')
      return
    }

    let models
    try {
      models = filterChatModels(await listModels())
    } catch (err) {
      log.error({ err }, 'Falha ao listar modelos LiteLLM')
      await message.reply('Não foi possível listar os modelos do LiteLLM.')
      return
    }

    if (!models.length) {
      await message.reply('Nenhum modelo de chat disponível no gateway.')
      return
    }

    const chunks = formatNumberedModelList(models)
    const channelMsg = message as DiscordMessageWithChannel
    await channelMsg.channel.send(
      `Modelos de chat disponíveis (${models.length}). Digite o **número** do modelo em até 120s.\n` +
        'Obs.: features de visão precisam de um modelo multimodal.',
    )
    for (const chunk of chunks) {
      await channelMsg.channel.send(chunk)
    }

    const filter = (m: any) => m.author.id === message.author.id
    try {
      const collected = await channelMsg.channel.awaitMessages({
        filter,
        max: 1,
        time: MODELO_SELECTION_TIMEOUT_MS,
        errors: ['time'],
      })
      const raw = collected.first().content
      const index = parseModelSelection(raw, models.length)
      if (index === null) {
        await message.reply('Seleção inválida. O modelo padrão não foi alterado.')
        return
      }
      const selected = models[index - 1]
      if (!selected) {
        await message.reply('Seleção inválida. O modelo padrão não foi alterado.')
        return
      }
      setDefaultChatModel(selected.id)
      await message.reply(`Modelo padrão atualizado para \`${selected.id}\`.`)
    } catch (err) {
      log.warn({ err }, 'Timeout ou cancelamento na seleção de modelo')
      await message.reply('Tempo esgotado. O modelo padrão não foi alterado.')
    }
  }

  protected getUsage() {
    return '`$modelo` ou `$modelo atual`'
  }
}
