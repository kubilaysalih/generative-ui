// Runtime context handed to generated components.
//
// The model produces *intent* (action descriptors); the client owns *behavior*.
// That behavior — the real dispatcher, wired to navigation + store + the LLM —
// is injected here so leaf components stay pure and never import the app graph
// (which would create an import cycle with the renderer).

import React, { createContext, useContext } from 'react';
import type { ActionStep, Node } from '../dsl/types';

export interface RenderApi {
  /** Run a sequential list of action steps owned by `node`. */
  dispatch: (steps: ActionStep[], node?: Node) => void;
}

const noop: RenderApi = { dispatch: () => {} };

const RenderContext = createContext<RenderApi>(noop);

export function RenderProvider({
  api,
  children,
}: {
  api: RenderApi;
  children: React.ReactNode;
}) {
  return <RenderContext.Provider value={api}>{children}</RenderContext.Provider>;
}

export function useRenderApi(): RenderApi {
  return useContext(RenderContext);
}
