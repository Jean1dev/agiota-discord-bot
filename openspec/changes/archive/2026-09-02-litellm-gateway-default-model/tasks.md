## 1. Environment and LiteLLM client

- [ ] 1.1 Add `LITELLM_BASE_URL` and `LITELLM_API_KEY` to `src/config/env.ts` (and adjust/remove `KEY_OPEN_AI` usage as designed); verify unit tests for env parsing still pass or update them accordingly
- [ ] 1.2 Create a central LiteLLM client module (OpenAI SDK with `baseURL` + key) exposing chat, listModels, STT, and TTS; verify a smoke call against the gateway or a mocked client test succeeds without using `api.openai.com`
- [ ] 1.3 Add a LangChain helper that builds `ChatOpenAI` with LiteLLM `baseURL`, key, `nativeFetch`, and the default chat model; verify existing call sites can import it

## 2. Persist default chat model

- [ ] 2.1 Extend `AppContext` / Mongo context state with `defaultChatModel` (load in `fillState`, save in `save`); verify restart simulation or unit test shows the value round-trips through the repository
- [ ] 2.2 Implement `getDefaultChatModel()` with fallback `openai/gpt-4o` when unset; verify fallback and persisted override behavior with a unit test

## 3. Migrate all LLM call sites

- [ ] 3.1 Refactor `src/ia/open-ai-api.ts` (or replace consumers) to use the LiteLLM client and default chat model for completions; verify `$gpt` / conversation history / IA fallback paths compile and use the gateway client
- [ ] 3.2 Migrate `QuizService`, `TransactionCategorizationService`, `AddressExtractionService`, and `BankNotificationImageService` to the LangChain LiteLLM helper + default model; verify no remaining `KEY_OPEN_AI` / direct OpenAI base usage in `src/`
- [ ] 3.3 Point STT/TTS at LiteLLM with fixed model ids (resolve whisper vs `gpt-4o-transcribe` at smoke time); verify audio helpers call the gateway client only

## 4. Discord `$modelo` command

- [ ] 4.1 Implement model catalog filter (chat-only, no wildcards / non-chat modes) and numbered list chunking under Discord’s 2000-char limit; verify unit tests for filter and numbering
- [ ] 4.2 Implement `$modelo` (list → `awaitMessages` 120s → validate index → persist + confirm) and `$modelo atual`; register in `lista-comandos` / ai commands index without AdminGuard; verify handler behavior with unit or integration-style tests for valid, invalid, and timeout paths

## 5. Verification

- [ ] 5.1 Run the project’s unit test suite and fix regressions introduced by this change
- [ ] 5.2 Document required deploy env vars (LiteLLM URL + key) for operators; confirm no secrets are committed in the repo
