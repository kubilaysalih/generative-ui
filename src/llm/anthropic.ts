// Streaming for the Anthropic Messages API. Different shape from OpenAI:
// `system` is a top-level field, and text arrives in `content_block_delta`
// events. `expo/fetch` streams the SSE on native.

import { fetch as expoFetch } from 'expo/fetch';
import { consumeSse } from './sse';
import type { GenerateParams, StreamHandlers } from './types';

const API_URL = 'https://api.anthropic.com/v1/messages';

/** Pull the text delta from an Anthropic `content_block_delta` event. */
function extractDelta(json: unknown): string | undefined {
  const j = json as any;
  if (j?.type === 'content_block_delta' && j?.delta?.type === 'text_delta') {
    return typeof j.delta.text === 'string' ? j.delta.text : undefined;
  }
  return undefined;
}

export async function anthropicStream(
  apiKey: string,
  { userPrompt, systemPrompt }: GenerateParams,
  { onChunk, signal }: StreamHandlers,
  model: string,
): Promise<void> {
  const res = await expoFetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      // Allow the raw call from a non-server client.
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      stream: true,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Anthropic ${res.status}: ${text}`);
  }

  await consumeSse(res as any, extractDelta, onChunk, signal);
}
