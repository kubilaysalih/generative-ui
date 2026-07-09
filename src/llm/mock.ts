// Mock-first LLM: streams a fixture program line-by-line with artificial delay.
// This drives the whole engine (parser → symbol table → renderer → skeleton →
// actions → state) with zero latency or cost. Chosen by the Mock mode setting.

import { fixtureFor } from './fixtures';
import type { StreamHandlers } from './types';

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      resolve();
    });
  });
}

/** Break a line into small chunks so buffering + partial lines are exercised. */
function chunkLine(line: string): string[] {
  const parts = line.split(/(\s+)/).filter((p) => p.length > 0);
  return parts.length ? parts : [line];
}

export async function mockStream(
  userPrompt: string,
  { onChunk, signal }: StreamHandlers,
): Promise<void> {
  // Pick the baked screen for this prompt (each default suggestion has its own;
  // everything else gets a generic detail). Real, varied content is authored
  // once in fixtures.ts — the mock never invents content, it replays it.
  const lines = fixtureFor(userPrompt).split('\n');

  for (const line of lines) {
    if (signal?.aborted) return;
    for (const chunk of chunkLine(line)) {
      if (signal?.aborted) return;
      onChunk(chunk);
      await delay(10, signal);
    }
    onChunk('\n');
    // Pause between lines: this is what produces the top-down fill feel.
    await delay(40, signal);
  }
}
