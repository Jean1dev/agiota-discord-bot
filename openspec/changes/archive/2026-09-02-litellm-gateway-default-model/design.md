## Context

See proposal.md for motivation. Today LLM usage is split across `src/ia/open-ai-api.ts` (OpenAI SDK: chat, whisper, TTS) and several `ChatOpenAI` call sites, all using `KEY_OPEN_AI` with no `baseURL`. App state already persists a subset of fields via `Context.save()` / Mongo (`getContextState` / `saveContextState`). Discord already uses `channel.awaitMessages` (e.g. `$yt-auth`) for multi-step UX. Target gateway: Railway LiteLLM with OpenAI-compatible `/v1` and a large `/v1/models` catalog including non-chat modes.

## Goals / Non-Goals

**Goals:**

- Single gateway client configuration (base URL + key) shared by SDK and LangChain paths.
- One persisted default chat model id used by all chat completions.
- `$modelo` selection UX with numbered list + `awaitMessages`, public to all users.
- Chat model picker filtered to chat-capable entries only.

**Non-Goals:**

- Separate selectable defaults for vision / STT / TTS (fixed gateway model ids for those until a later change).
- Admin-only gating for `$modelo`.
- Deploying or reconfiguring the LiteLLM service itself.
- Per-guild or per-user model preferences.
- Rewriting prompts or changing product behavior of quiz/finance beyond the model endpoint/id.

## Decisions

### 1. Environment: `LITELLM_BASE_URL` + `LITELLM_API_KEY`

- **Choice:** New required-when-used env vars. Prefer failing closed on model calls if missing rather than falling back to OpenAI direct.
- **Why:** Makes the gateway the only intended path; avoids silently using `KEY_OPEN_AI` against `api.openai.com`.
- **Alternatives:** Reuse `KEY_OPEN_AI` + `OPENAI_BASE_URL` (compatible with OpenAI SDK naming, but ambiguous). Rejected for clarity that traffic is LiteLLM-only.
- **Migration:** Keep `KEY_OPEN_AI` optional/unused during transition or remove from schema once call sites are migrated; document deploy secret swap.

### 2. Central LiteLLM client module

- **Choice:** One module (e.g. under `src/ia/` or `src/services/llm/`) that builds the OpenAI SDK client with `baseURL`/`apiKey`, exposes `listModels`, `chat`, STT, TTS, and a thin helper for LangChain `ChatOpenAI` (`configuration.baseURL` + key + `nativeFetch`).
- **Why:** Avoids sprinkling base URL in 5+ files; default model resolution lives in one place.
- **Alternatives:** Only patch each call site independently — faster but drifts.

### 3. Persist `defaultChatModel` on existing context Mongo document

- **Choice:** Add `defaultChatModel` to the context state loaded/saved with `fillState` / `save`, same pattern as `autoArbitragem`.
- **Why:** Minimal new infra; already used for bot-wide settings.
- **Alternatives:** Dedicated `llm_settings` collection — cleaner long-term, more files for one field. Acceptable follow-up if context doc grows further.

### 4. Fallback model id: `openai/gpt-4o`

- **Choice:** Built-in fallback when Mongo has no value. Gateway catalog uses `openai/...` ids and wildcards.
- **Why:** Multimodal-capable chat id present on the gateway; safer than `gpt-3.5-turbo` bare name if the proxy expects prefixed ids.
- **Alternatives:** `openai/gpt-3.5-turbo-1106` (cheaper) — can swap if cost matters more than capability.

### 5. Command: `$modelo` / `$modelo atual`

- **Choice:** Register `modelo`. No args → list + await number (120s, same author). Arg `atual` → print current default.
- **Why:** Matches explored UX; 120s mirrors `$yt-auth`.
- **Filter for list:** Include entries where `mode` is missing or equals `chat`; exclude ids containing `*`; exclude known non-chat modes (`image_generation`, `video_generation`, `realtime`, `audio_speech`, `audio_transcription`, `moderation`, `responses` if not usable as plain chat — prefer only `chat` when `mode` is present).
- **Auth:** No `AdminGuard`.

### 6. STT/TTS model ids

- **Choice:** Keep fixed ids routed through LiteLLM (`openai/tts-1` for speech; prefer a transcription id present on the gateway such as `openai/gpt-4o-transcribe` or keep `whisper-1` if the wildcard/`openai/*` accepts it — verify once at implement time against gateway).
- **Why:** Out of scope for the picker; still “só LiteLLM”.

### 7. Vision / structured LangChain paths

- **Choice:** Use the same default chat model for text LangChain features (quiz, categorization, address). For `BankNotificationImageService`, use the default chat model as well for this change (single default); if the selected model lacks vision, extraction may fail — acceptable trade-off until multi-default exists. Document in risks.
- **Alternatives:** Hardcode `openai/gpt-4o` for vision only — splits “one default” story; defer unless implementer hits immediate breakage.

## Risks / Trade-offs

- [Catalog noise / wrong mode] → Strict filter + exclude wildcards; empty list → clear error.
- [User picks non-vision model; bank image OCR fails] → Mitigate later with capability-specific defaults; optional warning in `$modelo` copy that vision features need a multimodal model.
- [Discord 2000 char limit] → Chunk list messages (existing pattern).
- [Concurrent `$modelo` in same channel] → Filter by author id; last writer wins on Mongo field (acceptable).
- [Key leaked in chat history during explore] → Rotate LiteLLM key in deploy; never commit secrets.
- [LangChain openai@4 + fetch] → Keep injecting `nativeFetch` on ChatOpenAI configuration.

## Migration Plan

1. Add env vars in deploy (Railway/etc.) pointing to LiteLLM; rotate key if exposed.
2. Deploy bot with LiteLLM client + persistence + `$modelo`.
3. Smoke: `$modelo atual`, `$modelo` select, `$gpt`, one LangChain path, optional STT/TTS.
4. Rollback: revert release and/or point env back only works if old code still used OpenAI direct — after this change, rollback is prior bot version + prior secrets.

## Open Questions

- Exact transcription model id if `whisper-1` is rejected by the gateway (resolve at implement/smoke time without changing specs).
