## Why

O bot chama a OpenAI diretamente, com modelos hardcoded e sem um ponto único de configuração. Já existe um LiteLLM gateway em produção; precisamos passar a usá-lo exclusivamente e permitir que qualquer usuário escolha o modelo de chat padrão via Discord, com persistência no Mongo.

## What Changes

- Rotear **todas** as chamadas LLM do bot pelo LiteLLM gateway (sem API OpenAI direta em runtime).
- Introduzir configuração via env (`LITELLM_BASE_URL`, `LITELLM_API_KEY`) e um **modelo de chat padrão** único.
- Persistir o modelo padrão no Mongo (sobrevive a restart).
- Novo comando Discord público (`$modelo`) que lista modelos de chat disponíveis no gateway (numerados), aguarda a resposta com um número e atualiza o default.
- Remover dependência de runtime de `KEY_OPEN_AI` / `api.openai.com` para chat, STT e TTS (tudo via LiteLLM quando suportado pelo gateway).
- Filtrar o picker para modelos adequados a chat (excluir wildcards, image, video, realtime, etc.).

## Capabilities

### New Capabilities

- `llm-gateway`: Cliente e configuração do LiteLLM; todas as chamadas de modelo passam pelo gateway.
- `default-chat-model`: Modelo de chat padrão persistido no Mongo e selecionável via comando Discord.

### Modified Capabilities

- (nenhuma — não há specs principais existentes sob `openspec/specs/`)

## Impact

- `src/ia/open-ai-api.ts` e todos os `ChatOpenAI` (quiz, finanças, WhatsApp, imagem bancária).
- `src/config/env.ts` (novas vars; deprecar/remover uso de `KEY_OPEN_AI` no caminho LiteLLM).
- `src/context.ts` e persistência Mongo do estado do contexto (ou doc dedicado de settings LLM).
- Comandos em `src/discord/commands/ai/` e registro em `lista-comandos`.
- Deploy: secrets do LiteLLM no ambiente (Railway/Heroku/.env); não versionar a key.
