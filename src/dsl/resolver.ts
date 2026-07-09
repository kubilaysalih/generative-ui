// Reference resolution + node→value coercion.
//
// The render tree is described by reference: a RefNode points at another line.
// Resolving means following that name in the symbol table, chasing ref→ref
// chains, while guarding against cycles (visited set) and runaway depth.

import type { ActionStep, Node, SymbolTable } from './types';

/** Max nesting the resolver will follow before bailing to a fallback. */
export const MAX_DEPTH = 16;

export interface ResolveResult {
  /** The resolved concrete node, or null if missing / cyclic / too deep. */
  node: Node | null;
  /** Why resolution produced null (for skeleton vs fallback decisions). */
  reason?: 'missing' | 'cycle' | 'depth';
}

/**
 * Resolve a reference by name, following ref→ref chains. Returns the first
 * non-ref node reached. A missing name yields `{ node: null, reason:'missing' }`
 * so the caller can render a skeleton; a cycle yields `reason:'cycle'`.
 */
export function resolveRef(
  name: string,
  table: SymbolTable,
  visited: ReadonlySet<string> = new Set(),
  depth = 0,
): ResolveResult {
  if (depth > MAX_DEPTH) return { node: null, reason: 'depth' };
  if (visited.has(name)) return { node: null, reason: 'cycle' };

  const node = table.get(name);
  if (!node) return { node: null, reason: 'missing' };

  if (node.kind === 'ref') {
    const next = new Set(visited);
    next.add(name);
    return resolveRef(node.name, table, next, depth + 1);
  }
  return { node };
}

// ---------------------------------------------------------------------------
// Coercion: turn AST leaf nodes into plain JS values for props / validation.
// Child refs and nested constructors are intentionally *not* coerced here —
// the renderer handles those recursively.
// ---------------------------------------------------------------------------

/** Coerce a leaf node to a primitive JS value, or undefined if not a leaf. */
export function nodeToPrimitive(node: Node | undefined): string | number | boolean | undefined {
  if (!node) return undefined;
  switch (node.kind) {
    case 'string':
      return node.value;
    case 'number':
      return node.value;
    case 'bool':
      return node.value;
    default:
      return undefined;
  }
}

/** Coerce a node to a string (used for action args, labels, seeds). */
export function nodeToString(node: Node | undefined): string | undefined {
  const v = nodeToPrimitive(node);
  return v === undefined ? undefined : String(v);
}

/** Coerce a node to a number, or undefined if it isn't numeric. */
export function nodeToNumber(node: Node | undefined): number | undefined {
  if (!node) return undefined;
  if (node.kind === 'number') return node.value;
  if (node.kind === 'string') {
    const n = Number(node.value);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

/** Coerce an object node to a flat record of primitive values. */
export function nodeToObject(node: Node | undefined): Record<string, unknown> | undefined {
  if (!node || node.kind !== 'object') return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node.fields)) {
    const prim = nodeToPrimitive(v);
    out[k] = prim === undefined ? nodeToValue(v) : prim;
  }
  return out;
}

/** Coerce an array node to an array of primitive values (e.g. chip labels). */
export function nodeToStringArray(node: Node | undefined): string[] | undefined {
  if (!node || node.kind !== 'array') return undefined;
  return node.items.map((n) => nodeToString(n) ?? '').filter((s) => s.length > 0);
}

/** Deep, best-effort coercion of any node to a plain JS value. */
export function nodeToValue(node: Node | undefined): unknown {
  if (!node) return undefined;
  switch (node.kind) {
    case 'string':
    case 'number':
    case 'bool':
      return nodeToPrimitive(node);
    case 'array':
      return node.items.map(nodeToValue);
    case 'object': {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node.fields)) out[k] = nodeToValue(v);
      return out;
    }
    case 'ref':
      return { $ref: node.name };
    case 'constructor':
      return { $type: node.type, args: node.args.map(nodeToValue) };
  }
}

/** Return the child nodes referenced by an array-of-refs arg. */
export function childNodes(node: Node | undefined): Node[] {
  if (!node) return [];
  if (node.kind === 'array') return node.items;
  // A single child passed without brackets — tolerate it.
  return [node];
}

/**
 * Parse an `Action([...])` node into a flat, ordered list of primitive steps.
 * Each step is `{ type, args }` with args coerced to JS values. Non-constructor
 * entries are skipped. Returns [] for anything that isn't a well-formed action.
 */
export function parseAction(node: Node | undefined): ActionStep[] {
  if (!node || node.kind !== 'constructor' || node.type !== 'Action') return [];
  const list = node.args[0];
  if (!list || list.kind !== 'array') return [];
  const steps: ActionStep[] = [];
  for (const item of list.items) {
    if (item.kind !== 'constructor') continue;
    steps.push({ type: item.type, args: item.args.map(nodeToValue) });
  }
  return steps;
}
