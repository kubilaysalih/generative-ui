// Streaming for OpenAI-compatible Chat Completions endpoints (OpenAI itself and
// OpenRouter). Same request/SSE shape — only the base URL, auth header, and the
// output-token field differ, so both providers share this one implementation.

import { fetch as expoFetch } from 'expo/fetch';
import { consumeSse } from './sse';
import type { GenerateParams, StreamHandlers } from './types';

/** Pull the text delta from an OpenAI-style streaming chunk. */
function extractDelta(json: unknown): string | undefined {
  const content = (json as any)?.choices?.[0]?.delta?.content;
  return typeof content === 'string' ? content : undefined;
}

export async function openAiCompatStream(
  url: string,
  headers: Record<string, string>,
  extraBody: Record<string, unknown>,
  { userPrompt, systemPrompt }: GenerateParams,
  { onChunk, signal }: StreamHandlers,
  model: string,
): Promise<void> {
  const res = await expoFetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({
      model,
      stream: true,
      ...extraBody,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status}: ${text}`);
  }

  await consumeSse(res as any, extractDelta, onChunk, signal);
}
