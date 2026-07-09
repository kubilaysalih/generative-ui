// Shared types for the LLM layer. Both the mock and the real Anthropic stream
// implement the same `StreamFn` contract, so switching between them is one flag.

export interface StreamHandlers {
  /** Called with each streamed text chunk (feed straight into the parser). */
  onChunk: (text: string) => void;
  /** Aborts the stream when the screen unmounts or a new turn starts. */
  signal?: AbortSignal;
}

export interface GenerateParams {
  /** The user's prompt (or a navigate seed / refine prompt). */
  userPrompt: string;
  /** The assembled system prompt (catalogs + DSL format + state + context). */
  systemPrompt: string;
}

export type StreamFn = (
  params: GenerateParams,
  handlers: StreamHandlers,
) => Promise<void>;
