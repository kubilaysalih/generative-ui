// The provider catalog: which LLM services the user can pick, each with its own
// key, a curated list of popular models, and how to stream from it. Model lists
// were checked against current (mid-2026) availability; ids can also be typed by
// hand in the model picker since catalogs move fast.

import type { GenerateParams, StreamHandlers } from './types';
import { openAiCompatStream } from './openaiCompat';
import { anthropicStream } from './anthropic';

export type ProviderId = 'openrouter' | 'openai' | 'anthropic';

export interface ModelOption {
  id: string;
  label: string;
  /** Free tier on OpenRouter (rate-limited, may be unreliable). */
  free?: boolean;
}

export interface StreamConfig {
  apiKey: string;
  model: string;
}

export interface ProviderDef {
  id: ProviderId;
  label: string;
  keyPlaceholder: string;
  keyHint: string;
  keysUrl: string;
  models: ModelOption[];
  defaultModel: string;
  /** Whether this provider exposes free models. */
  hasFree?: boolean;
  stream: (
    p: GenerateParams,
    h: StreamHandlers,
    c: StreamConfig,
  ) => Promise<void>;
}

export const PROVIDER_IDS: ProviderId[] = ['openrouter', 'openai', 'anthropic'];

export const PROVIDERS: Record<ProviderId, ProviderDef> = {
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    keyPlaceholder: 'sk-or-...',
    keyHint: 'One key, every model. Free (:free) models work too — see below.',
    keysUrl: 'https://openrouter.ai/keys',
    defaultModel: 'anthropic/claude-haiku-4.5',
    hasFree: true,
    models: [
      { id: 'anthropic/claude-haiku-4.5', label: 'Claude Haiku 4.5' },
      { id: 'anthropic/claude-sonnet-4.6', label: 'Claude Sonnet 4.6' },
      { id: 'anthropic/claude-sonnet-5', label: 'Claude Sonnet 5' },
      { id: 'anthropic/claude-opus-4.8', label: 'Claude Opus 4.8' },
      { id: 'openai/gpt-5.5', label: 'GPT-5.5' },
      { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { id: 'deepseek/deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
      // Free tier — no cost, ~20 req/min, best-effort availability.
      { id: 'openrouter/free', label: 'Auto (free router)', free: true },
      { id: 'qwen/qwen3-coder:free', label: 'Qwen3 Coder', free: true },
      { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B', free: true },
      { id: 'openai/gpt-oss-120b:free', label: 'GPT-OSS 120B', free: true },
    ],
    stream: (p, h, c) =>
      openAiCompatStream(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          authorization: `Bearer ${c.apiKey}`,
          'HTTP-Referer': 'https://generative-ui.app',
          'X-Title': 'Generative UI',
        },
        // Disable model "reasoning" — the DSL is a formatting task, so skipping
        // it cuts latency a lot on reasoning models (no-op where unsupported).
        { max_tokens: 2048, reasoning: { enabled: false } },
        p,
        h,
        c.model,
      ),
  },

  openai: {
    id: 'openai',
    label: 'OpenAI',
    keyPlaceholder: 'sk-...',
    keyHint: 'Your OpenAI API key from platform.openai.com.',
    keysUrl: 'https://platform.openai.com/api-keys',
    defaultModel: 'gpt-5.4-mini',
    models: [
      { id: 'gpt-5.4-mini', label: 'GPT-5.4 mini' },
      { id: 'gpt-5.5', label: 'GPT-5.5' },
      { id: 'gpt-5.5-pro', label: 'GPT-5.5 Pro' },
      { id: 'gpt-5.4-nano', label: 'GPT-5.4 nano' },
      { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
    ],
    stream: (p, h, c) =>
      openAiCompatStream(
        'https://api.openai.com/v1/chat/completions',
        { authorization: `Bearer ${c.apiKey}` },
        // GPT-5 family uses max_completion_tokens, not max_tokens.
        { max_completion_tokens: 2048 },
        p,
        h,
        c.model,
      ),
  },

  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    keyPlaceholder: 'sk-ant-...',
    keyHint: 'Your Anthropic API key from console.anthropic.com.',
    keysUrl: 'https://console.anthropic.com/settings/keys',
    defaultModel: 'claude-haiku-4-5',
    models: [
      { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
      { id: 'claude-sonnet-5', label: 'Claude Sonnet 5' },
      { id: 'claude-opus-4-8', label: 'Claude Opus 4.8' },
      { id: 'claude-opus-4-7', label: 'Claude Opus 4.7' },
    ],
    stream: (p, h, c) => anthropicStream(c.apiKey, p, h, c.model),
  },
};

/** Resolve the model id for a provider, falling back to its default. */
export function resolveModel(provider: ProviderId, model: string): string {
  return model || PROVIDERS[provider].defaultModel;
}
