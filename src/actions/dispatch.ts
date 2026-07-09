// Sequential action dispatcher. An Action holds an ordered list of primitive
// steps; they run in order, no conditionals (kept simple on purpose). Every
// step is validated against the closed pool — an unknown primitive is a no-op
// plus a warning, so the model can never trigger arbitrary behavior.

import type { ActionStep, Node } from '../dsl/types';
import { primitives, type ActionContext } from './primitives';

export async function dispatch(
  steps: ActionStep[],
  node: Node | undefined,
  ctx: ActionContext,
): Promise<void> {
  for (const step of steps) {
    const prim = primitives[step.type];
    if (!prim) {
      if (__DEV__) console.warn(`[actions] unknown primitive: ${step.type}`);
      continue;
    }
    try {
      await prim(step.args, node, ctx);
    } catch (err) {
      if (__DEV__) console.warn(`[actions] step '${step.type}' failed:`, err);
    }
  }
}

export type { ActionContext } from './primitives';
