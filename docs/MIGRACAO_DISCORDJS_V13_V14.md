# Migração discord.js v13 → v14

Documento de referência da migração do `discord.js` da versão **13** para a **14**, feita para resolver o erro de login em produção (`ERR_STREAM_PREMATURE_CLOSE`). Serve como **ponto de partida de investigação** caso surjam problemas relacionados ao Discord no futuro.

PR da mudança: [#148](https://github.com/Jean1dev/agiota-discord-bot/pull/148)

---

## 1. O problema que originou a migração

Em produção (Heroku, worker), o bot **falhava todas as tentativas de login** com:

```
FetchError: Invalid response body while trying to fetch
https://discord.com/api/v9/gateway/bot: Premature close
errno: ERR_STREAM_PREMATURE_CLOSE
    at Gunzip.<anonymous> (/app/node_modules/node-fetch/lib/index.js:400:12)
```

### Causa raiz

**Não era problema de rede nem do Discord.** Era incompatibilidade de versão:

- O `discord.js` **v13** usa internamente o **`node-fetch@2`** para chamar a REST API do Discord (ex.: `GET /api/v9/gateway/bot` no login).
- O `node-fetch@2` descomprime a resposta **gzip** do Discord através de um stream `Gunzip`.
- Rodando em **Node 23/24** (Dockerfile `FROM node:23`, `engines.node: 24.x`), esse stream fecha cedo demais e dispara `ERR_STREAM_PREMATURE_CLOSE`. É um bug conhecido da combinação `node-fetch@2` + Node novo.

### Por que o v14 resolve

O `discord.js` **v14** substituiu o `node-fetch` por **`undici`** (cliente HTTP nativo/moderno), compatível com Node 18+. Login passou a funcionar em Node 23/24.

> **Regra de ouro de diagnóstico:** se o erro de login mencionar `node-fetch`, `Gunzip` ou `ERR_STREAM_PREMATURE_CLOSE`, **não é rede** — é a stack HTTP antiga. Confirme a versão do `discord.js` antes de investigar firewall/DNS.

---

## 2. ⚠️ Configuração manual obrigatória (Developer Portal)

O bot lê `message.content` em todo o parsing de comandos (`$...`). A partir do v14, isso exige o **intent privilegiado Message Content**, que **precisa estar ligado no Discord Developer Portal**:

1. Acesse https://discord.com/developers/applications → app **agiota-bot** → aba **Bot**
2. Seção **"Intenções de gateway privilegiadas" / "Privileged Gateway Intents"**
3. Ligue **"Intenção de conteúdo da mensagem" / "Message Content Intent"**
4. Clique em **"Salvar alterações"**

> **Sintoma se esquecer:** o bot conecta e fica online normalmente, mas `message.content` chega **vazio** e os comandos `$` param de responder. Não dá erro no log — por isso é fácil de confundir.

`Message Content` é um **intent** (configuração do gateway), diferente das **permissões do bot** (o que ele pode fazer no servidor). Os dois são configurados em telas diferentes; mexer nas permissões não substitui ligar o intent.

---

## 3. Mapa das mudanças de API (v13 → v14)

| v13 | v14 | Arquivos afetados |
|-----|-----|-------------------|
| `Intents.FLAGS.GUILDS` etc. | `GatewayIntentBits.Guilds` etc. | `src/bot.ts` |
| *(content implícito)* | `GatewayIntentBits.MessageContent` **adicionado** | `src/bot.ts` |
| `partials: ['CHANNEL']` | `partials: [Partials.Channel]` | `src/bot.ts` |
| `channel.type === 'DM'` | `channel.type === ChannelType.DM` | `src/bot.ts` |
| `MessageEmbed` | `EmbedBuilder` | `QuizService`, `CaixinhaService`, `FinanceService`, `HelpCommand`, `music/index` |
| `MessageButton` | `ButtonBuilder` | `QuizService`, `CaixinhaService` |
| `.setStyle('PRIMARY' \| 'SUCCESS' \| 'DANGER')` | `ButtonStyle.Primary` / `.Success` / `.Danger` | `QuizService`, `CaixinhaService` |
| `MessageActionRow` | `ActionRowBuilder<ButtonBuilder>` | `QuizService`, `CaixinhaService` |
| `MessageAttachment(buf, 'nome')` | `AttachmentBuilder(buf, { name: 'nome' })` | `WhatsAppService` |
| `.setColor('RANDOM')` | `.setColor('Random')` (PascalCase!) | `QuizService`, `CaixinhaService`, `FinanceService`, `HelpCommand` |
| option `type: 'STRING'` | `ApplicationCommandOptionType.String` | `music/index` |
| `interaction.isCommand()` | `interaction.isChatInputCommand()` | `music/index` |
| `Constants.WSEvents.*` / `Constants.Events.*` / `Constants.Status.*` | **removido** — ver §4 | `adapters/discord-adapter.ts` (removido) |
| união de canais sem narrow | `channel.isSendable()` antes de `.send()` | `b3/atualizar-cotacao-carteira.ts` |

### Detalhes que quebram silenciosamente (atenção em PRs futuros)

- **Cores:** o v14 só aceita a string `'Random'` (PascalCase). `'RANDOM'` (v13) lança `Invalid color`. O mesmo vale para nomes de cor (`'RED'` → `'Red'`), via enum `Colors`.
- **Estilos de botão:** strings (`'PRIMARY'`) não existem mais; use o enum `ButtonStyle`.
- **`addComponents`:** no v14 recebe spread/rest. Use `.addComponents(...arrayDeBotoes)` (com spread) ou passe os botões avulsos.
- **Tipos de opção de slash command:** strings (`'STRING'`) não são mais aceitas; use `ApplicationCommandOptionType`.
- **União de tipos de canal:** o v14 inclui `PartialGroupDMChannel`, que **não tem `.send()`**. Use o type guard `channel.isSendable()` para estreitar o tipo antes de enviar.

---

## 4. Adapter de voz: `Constants` removido

O arquivo `src/adapters/discord-adapter.ts` (adapter de voz custom copiado do exemplo antigo do `@discordjs/voice`) dependia de `Constants.WSEvents`, `Constants.Events` e `Constants.Status`, que **foram removidos/movidos no v14**.

**Solução adotada:** o arquivo foi **removido** e `src/audio/connect-user-channel.ts` passou a usar o adapter **embutido** do discord.js:

```ts
adapterCreator: channel.guild.voiceAdapterCreator
```

Esse é o caminho recomendado no v14 e já era usado em `src/handlers/music/index.ts`. Se precisar de conexão de voz no futuro, **use `guild.voiceAdapterCreator`** — não recrie o adapter manual.

---

## 5. Como validar a migração localmente

```bash
npm install            # se der rate limit no postinstall do youtube-dl-exec:
npm install --ignore-scripts
npm run build          # tsc deve passar sem erros
npm test               # suíte jest deve passar (89 testes na época da migração)
```

Busca rápida por resíduos do v13 (deve retornar **vazio**):

```bash
grep -rEn "MessageEmbed|MessageButton|MessageActionRow|MessageAttachment|Intents\.|Constants\.|setColor\('RANDOM'\)|setStyle\('|type: 'STRING'" src
```

---

## 6. Checklist de deploy

- [ ] PR #148 mergeado
- [ ] **Message Content Intent** ligado e **salvo** no Developer Portal (§2)
- [ ] Deploy rodado com `discord.js@^14`
- [ ] Log de boot sem `ERR_STREAM_PREMATURE_CLOSE`
- [ ] Comando `$...` respondendo (confirma que o content intent está ativo)

---

## 7. Referências

- Guia oficial de migração: https://discordjs.guide/additional-info/changes-in-v14.html
- Message Content Intent: https://support-dev.discord.com/hc/articles/4404772028055
