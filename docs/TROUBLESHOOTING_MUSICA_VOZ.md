# Troubleshooting — Player de Música / Conexão de Voz

Guia passo a passo para diagnosticar o player de música quando ele **não conecta no canal de voz** ou **conecta mas não toca**. Baseado em casos reais já resolvidos.

Arquivos relevantes:
- `src/handlers/music/index.ts` — fluxo do comando `/play`, criação da conexão de voz (`joinVoiceChannel`) e `entersState(Ready)`.
- `src/handlers/music/subcription.ts` — `MusicSubscription`, máquina de estados da conexão, fila e reconexão.
- `src/handlers/music/track.ts` — extração do áudio do YouTube via `youtube-dl-exec` (yt-dlp).
- `src/audio/audio-player.ts` — `AudioPlayer` (singleton) do `@discordjs/voice`.

---

## Mapa rápido de sintomas → causa provável

| Sintoma nos logs | Onde trava | Causa mais provável | Seção |
|---|---|---|---|
| `Failed to join voice channel within 20 seconds` (AbortError) | nunca chega em `ready` | conexão de voz não estabiliza | A |
| `stateChange ... to: "ready"` mas **sem áudio** | conexão OK, áudio não flui | extração do YouTube (yt-dlp) | B |
| `Cannot read properties of null (reading 'client')` no boot | startup | contexto ainda não inicializado | C |

> **Regra de ouro:** primeiro descubra **em qual fase** trava. Não chute "é a rede" ou "é a lib" sem os logs de estado. As fases da conexão de voz são: `signalling → connecting → ready`.

---

## A. Conexão de voz não chega em `ready` (AbortError, timeout de 20s)

### A.1 — Ligue o diagnóstico de estado

Em `src/handlers/music/index.ts`, logo após criar a `MusicSubscription`, adicione **temporariamente**:

```ts
joinVoiceChannel({
  channelId: channel.id,
  guildId: channel.guild.id,
  adapterCreator: channel.guild.voiceAdapterCreator,
  debug: true, // <-- temporário
})
// ...
subscription.voiceConnection.on('stateChange', (oldS, newS) =>
  log.info({ from: oldS.status, to: newS.status }, 'Voice connection state change'))
subscription.voiceConnection.on('debug', (msg) =>
  log.info({ debug: msg }, 'Voice connection debug')) // <-- temporário
```

Rode `npm run build` e reinicie. Dispare `/play` e observe a sequência de `stateChange`.

### A.2 — Interprete onde travou

- **Trava em `signalling`** → o bot nunca recebeu o `VOICE_SERVER_UPDATE` da gateway.
  - Verifique a intent `GUILD_VOICE_STATES` em `src/bot.ts` (e habilitada no Developer Portal).
  - Verifique se o bot tem permissão **Connect** no canal.
- **Trava em `connecting`** (ou `connecting → signalling` em ~1s) → o WebSocket de voz conectou mas o Discord **fechou a conexão**. Pegue o **close code** (passo A.3).
- **`connecting` parado por ~20s** (sem voltar) → provável **UDP de saída bloqueado** (firewall/VPN/NAT). O *IP discovery* via UDP não recebe resposta.

### A.3 — Capture o WebSocket close code (decisivo)

O `@discordjs/voice` **não loga o close code** quando ele é diferente de `4014` (vai direto pra `signalling`). Para capturá-lo, faça um patch **temporário** no `node_modules` (descartável — some no próximo `npm install`):

```bash
node -e "
const f='node_modules/@discordjs/voice/dist/index.js';
const fs=require('fs');
let s=fs.readFileSync(f,'utf8');
s=s.replace('onWsClose({ code }) {',
  'onWsClose({ code }) {\n  console.error(\"[WS_CLOSE]\", code, arguments[0]?.reason);');
fs.writeFileSync(f,s);
console.log('patched');
"
```

Reinicie (editar `node_modules` **não** dispara o nodemon — reinicie na mão), rode `/play` e leia o `[WS_CLOSE] <code> <reason>`.

### A.4 — Tabela de close codes de voz

| Code | Significado | Ação |
|---|---|---|
| **4004** | Authentication failed | token de voz inválido / sessão da gateway com problema |
| **4006** | Session no longer valid | `session_id` dessincronizado — comum em discord.js muito antigo |
| **4009** | Session timeout | reconectar |
| **4011** | Server not found | região/servidor de voz indisponível |
| **4014** | Disconnected | bot foi movido/kickado ou canal deletado |
| **4016** | Unknown encryption mode | lib de criptografia incompatível (ver A.5) |
| **4017** | **E2EE/DAVE protocol required** | **a lib precisa suportar DAVE — ver A.6** |
| `< 4000` / `1006` | fechamento anormal de rede | aí sim é rede/UDP/TLS |

### A.5 — Criptografia (close 4016 ou "no compatible encryption modes")

O Discord **removeu os modos antigos `xsalsa20_poly1305` em 18/nov/2024**. Versões antigas do `@discordjs/voice` (ex.: 0.16.x) só falam esses modos e quebram.

```bash
# Veja a versão REALMENTE instalada vs. a do lockfile (podem divergir!)
node -e "console.log(require('@discordjs/voice/package.json').version)" 2>/dev/null || \
  cat node_modules/@discordjs/voice/package.json | grep version
grep -A2 'node_modules/@discordjs/voice' package-lock.json | grep version

# Relatório de dependências (cripto/opus/ffmpeg/DAVE)
node -e "console.log(require('@discordjs/voice').generateDependencyReport())"
```

Se houver divergência entre `node_modules` e o lockfile, **reinstale** para alinhar:

```bash
npm install @discordjs/voice@<versao-do-lockfile>
```

> ⚠️ **Pegadinha:** trocar a versão no disco **não** afeta um processo Node já rodando — ele mantém a versão carregada em memória. **Sempre reinicie o processo** (`pm2 restart`, ou parar/subir o `node`/nodemon).

### A.6 — DAVE / E2EE obrigatório (close **4017**) — caso real

Sintoma exato nos logs de debug:
```
[WS] << {"op":8,"d":{"v":4,"heartbeat_interval":...}}   # gateway v4
state change: code 1 → code 6                            # fechou após o IDENTIFY
[WS_CLOSE] 4017 E2EE/DAVE protocol required
```

**Causa:** o Discord passou a **exigir o protocolo DAVE** (criptografia ponta-a-ponta de voz), negociado no **voice gateway v8**. Versões `@discordjs/voice ≤ 0.18.x` conectam em `v4` e **não implementam DAVE** → o servidor de voz derruba com 4017. Isso aparece "do nada", sem mudar nada na rede, conforme o Discord vai ativando a exigência por servidor/região.

**Correção:** subir para `@discordjs/voice ≥ 0.19.x`, que conecta em `v8` e traz o `@snazzah/davey` (bindings nativas do DAVE):

```bash
npm install @discordjs/voice@latest
```

Validação (esperado após o fix):
```bash
# gateway deve ser v8
grep -oE '\?v=[0-9]+' node_modules/@discordjs/voice/dist/index.js   # -> ?v=8
# davey carregável
node -e "require('@snazzah/davey'); console.log('davey OK')"
# relatório deve listar "DAVE Libraries - @snazzah/davey"
node -e "console.log(require('@discordjs/voice').generateDependencyReport())"
```

Requisito: `@discordjs/voice` 0.19.x exige **Node >= 22.12**. Confirme `node -v`.

Nos logs, sucesso se aparecer:
```
[DAVE] Session initialized for protocol version 1
[DAVE] MLS commit processed (transition id: 0)
stateChange ... to: "ready"
```

---

## B. Conecta (`ready`) mas não toca áudio

A conexão chegou em `ready` mas nenhum som sai. O problema está na **extração do YouTube** (`src/handlers/music/track.ts` via `youtube-dl-exec`/yt-dlp).

### B.1 — Os metadados vêm mas o áudio não? (HTTP 403)

```bash
# 1) Info funciona? (equivale ao Track.from)
./node_modules/youtube-dl-exec/bin/yt-dlp "<URL>" --dump-single-json --no-warnings 2>/dev/null \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).title))"

# 2) O stream de áudio realmente baixa bytes?
./node_modules/youtube-dl-exec/bin/yt-dlp "<URL>" -f bestaudio -o - 2>/tmp/yterr.txt | head -c 300000 | wc -c
tail -5 /tmp/yterr.txt
```

Se o passo 2 mostra `ERROR: unable to download video data: HTTP Error 403: Forbidden`, é o YouTube bloqueando — quase sempre porque o **yt-dlp está desatualizado** (o YouTube muda assinatura/`nsig` e SABR com frequência).

### B.2 — Atualize o yt-dlp (causa nº 1 de "não toca")

```bash
./node_modules/youtube-dl-exec/bin/yt-dlp --version          # veja a data
./node_modules/youtube-dl-exec/bin/yt-dlp -U                 # auto-update do binário
```

Depois repita o teste B.1 passo 2 — deve baixar centenas de KB sem 403 (um `Broken pipe` por causa do `head` é normal).

> ⚠️ **Pegadinha de deploy:** o binário atualizado fica em `node_modules`. Um `npm install` limpo (CI/servidor) **reverte para a versão empacotada e o 403 volta**. Para blindar: um `postinstall` rodando `yt-dlp -U`, um cron de atualização, ou apontar para um yt-dlp do sistema mantido atualizado.

### B.3 — Formato de extração correto

Para bot de música use **áudio-only**. `best`/`best[ext=opus]` baixam o **vídeo completo muxado** (lento, pesado, pode travar). O correto em `track.ts`:

```ts
format: 'bestaudio[ext=webm]/bestaudio/best',
```

Liste os formatos disponíveis para conferir o que o YouTube está oferecendo (procure linhas `audio only`, ex.: `251 webm ... opus`):

```bash
./node_modules/youtube-dl-exec/bin/yt-dlp "<URL>" -F
```

Avisos de `SABR streaming` / `No supported JavaScript runtime` são comuns; enquanto existir um formato `audio only` com URL utilizável (clients android/ios), o stream funciona. Instalar `deno` como runtime JS ajuda em casos difíceis.

### B.4 — Se ainda não tocar (raro)

- Confirme o ffmpeg: `node -e "console.log(require('@discordjs/voice').generateDependencyReport())"` deve mostrar `FFmpeg` e `libopus: yes`.
- Adicione logs temporários em `subcription.ts` (`audioPlayer.on('stateChange')` e dentro de `processQueue`) para ver se o resource chega a `Playing` ou cai em `Idle`/erro.

---

## C. Crash no boot: `Cannot read properties of null (reading 'client')`

Stack aponta para `BroadcastService.getClient` chamado por um evento (ex.: erro de conexão do **RabbitMQ/amqplib**) **antes do contexto ser criado**. `contextInstance()` retorna `null` no startup e o acesso a `.client` estoura, derrubando o processo.

**Correção (já aplicada):** tornar `getClient()` null-safe em `src/services/discord/BroadcastService.ts`:

```ts
function getClient(): Client | undefined {
  return contextInstance()?.client
}
```

Assim, se o contexto/cliente ainda não existe, o broadcast é silenciosamente ignorado em vez de crashar. A falha de conexão do RabbitMQ em si é um problema de ambiente à parte (serviço não disponível).

---

## Checklist rápido (copiar/colar)

```bash
# 1. Versão da lib de voz: node_modules vs lockfile (alinhadas?)
node -e "console.log('voice', require('@discordjs/voice/package.json').version)"
# 2. Relatório de dependências (cripto + DAVE + ffmpeg)
node -e "console.log(require('@discordjs/voice').generateDependencyReport())"
# 3. Gateway deve ser v8 (suporte a DAVE)
grep -oE '\?v=[0-9]+' node_modules/@discordjs/voice/dist/index.js
# 4. yt-dlp atualizado?
./node_modules/youtube-dl-exec/bin/yt-dlp --version
# 5. Áudio baixa sem 403?
./node_modules/youtube-dl-exec/bin/yt-dlp "<URL>" -f bestaudio -o - 2>/dev/null | head -c 200000 | wc -c
```

**Sempre reinicie o processo após mexer em `node_modules` ou na versão de qualquer pacote** — o Node não recarrega módulos de um processo em execução.

---

## Histórico de causas já encontradas

1. **`@discordjs/voice` 0.16.1 no `node_modules` divergindo do lockfile (0.18.0)** → modos `xsalsa20_poly1305` removidos pelo Discord → timeout. Fix: reinstalar para alinhar.
2. **Close 4017 / DAVE obrigatório** → 0.18.0 (v4, sem DAVE). Fix: subir para 0.19.2 (v8 + `@snazzah/davey`).
3. **HTTP 403 na extração** → yt-dlp desatualizado (~6 meses). Fix: `yt-dlp -U`.
4. **Formato `best[ext=opus]/best`** baixando vídeo completo → trocar para `bestaudio[ext=webm]/bestaudio/best`.
5. **Crash no boot** por `getClient()` em contexto `null` durante erro do RabbitMQ → null-safety.
