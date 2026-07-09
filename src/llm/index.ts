// LLM entry point. Provider, credentials, and model all come from user settings
// (AsyncStorage). Mock mode streams the offline demo fixture; otherwise
// generation runs live via the selected provider (OpenRouter / OpenAI /
// Anthropic) with that provider's key and model.

import { mockStream } from './mock';
import { PROVIDERS, resolveModel } from './providers';
import { useSettingsStore } from '../state/settings';
import type { GenerateParams, StreamFn, StreamHandlers } from './types';

/** Unified streamer chosen at call time from the current settings. */
export const streamDsl: StreamFn = (params, handlers) => {
  const { useMock, provider, keys, models } = useSettingsStore.getState();
  if (useMock) return mockStream(params.userPrompt, handlers);

  const def = PROVIDERS[provider];
  return def.stream(params, handlers, {
    apiKey: keys[provider] ?? '',
    model: resolveModel(provider, models[provider] ?? ''),
  });
};

export type { GenerateParams, StreamHandlers };
export { assembleSystemPrompt } from './prompt';
