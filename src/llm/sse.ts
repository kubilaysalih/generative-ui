// Shared Server-Sent Events consumer for the streaming providers.
//
// React Native's global fetch can't stream a response body, so callers use
// `expo/fetch`, whose Response exposes a real ReadableStream on native. We read
// it incrementally, split on the blank line between SSE events, and hand each
// event's JSON to a provider-specific extractor. On platforms without a stream
// reader (some web engines) we fall back to a single text() read.

export type DeltaExtractor = (json: unknown) => string | undefined;

interface StreamResponse {
  ok: boolean;
  status: number;
  body: ReadableStream<Uint8Array> | null;
  text: () => Promise<string>;
}

export async function consumeSse(
  res: StreamResponse,
  extract: DeltaExtractor,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const handleEvent = (event: string) => {
    // Ignore SSE comment/keep-alive lines (they start with ':').
    const dataLine = event.split('\n').find((l) => l.startsWith('data:'));
    if (!dataLine) return;
    const payload = dataLine.slice(5).trim();
    if (!payload || payload === '[DONE]') return;
    try {
      const text = extract(JSON.parse(payload));
      if (text) onChunk(text);
    } catch {
      // Ignore malformed / partial fragments.
    }
  };

  const reader = res.body?.getReader?.();
  if (reader) {
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      if (signal?.aborted) {
        await reader.cancel().catch(() => {});
        return;
      }
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep: number;
      while ((sep = buffer.indexOf('\n\n')) >= 0) {
        handleEvent(buffer.slice(0, sep));
        buffer = buffer.slice(sep + 2);
      }
    }
    if (buffer.trim()) handleEvent(buffer);
    return;
  }

  // Fallback: no incremental reader — parse the whole payload at once.
  const full = await res.text();
  for (const event of full.split('\n\n')) handleEvent(event);
}
