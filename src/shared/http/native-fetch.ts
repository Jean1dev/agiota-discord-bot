/**
 * `fetch` nativo do Node (undici, disponível a partir do Node 18).
 *
 * Serve para forçar bibliotecas que ainda arrastam o `node-fetch` a NÃO usá-lo:
 * o `node-fetch` quebra ao descomprimir respostas gzip no Node 23/24 com
 * `ERR_STREAM_PREMATURE_CLOSE` (mesma causa raiz da migração do discord.js p/ v14).
 *
 * Casos: `@langchain/openai` (que depende de um `openai@4` interno com node-fetch)
 * e `gaxios`/`googleapis`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const nativeFetch: any = globalThis.fetch
