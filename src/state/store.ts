// The state store: a single flat "state bag" keyed by *semantic* IDs.
//
// Principles enforced here:
//  - Render tree is ephemeral, state is persistent. Keys are semantic
//    (`selection.destination`, `filter.budget`) so they survive regeneration
//    and reordering.
//  - Model writes go through a prefix whitelist. Anything else is dropped.
//  - Store is source of truth; a key the *user* touched is protected from the
//    model within the same screen (user intent beats model assumption).
//  - State lifetime is the window: "New window" resets the bag.

import { create } from 'zustand';

/** Prefixes the model is allowed to write via setState / initial props. */
export const WRITABLE_PREFIXES = [
  'selection.',
  'filter.',
  'expanded.',
  'tab.',
  'form.',
] as const;

export type StateValue = string | number | boolean | null | string[];

/** Origin of a write, used to enforce "user intent wins". */
export type WriteSource = 'user' | 'model';

export function isWritableKey(key: string): boolean {
  return WRITABLE_PREFIXES.some((p) => key.startsWith(p));
}

interface StateStore {
  /** The flat state bag. */
  bag: Record<string, StateValue>;
  /** Keys the user has manually touched in the current screen (protected). */
  userTouched: Set<string>;

  get: (key: string) => StateValue | undefined;

  /**
   * Write a value. Returns true if the write landed.
   *  - Non-whitelisted keys are always dropped.
   *  - A model write to a user-touched key is dropped (user intent wins).
   *  - A user write always lands and marks the key protected.
   */
  set: (key: string, value: StateValue, source: WriteSource) => boolean;

  /** Read a collection value as a string array (empty if unset/not an array). */
  getArray: (key: string) => string[];

  /** Seed a collection once, only if the key isn't already an array. */
  seedArray: (key: string, values: string[]) => void;

  /** Append `value` to the array at `key` (no duplicates). Local-first — no LLM. */
  add: (key: string, value: string, source?: WriteSource) => boolean;

  /** Remove `value` from the array at `key`. */
  removeItem: (key: string, value: string, source?: WriteSource) => boolean;

  /** Toggle membership of `value` in the array at `key`. */
  toggleItem: (key: string, value: string, source?: WriteSource) => boolean;

  /** Compact snapshot for the system prompt, e.g. "filter.budget = orta". */
  snapshot: () => string;

  /** Clear protection markers — called when a genuinely new turn begins. */
  clearUserTouched: () => void;

  /** Reset everything — "New window". */
  reset: () => void;
}

export const useStateStore = create<StateStore>((set, get) => ({
  bag: {},
  userTouched: new Set<string>(),

  get: (key) => get().bag[key],

  set: (key, value, source) => {
    if (!isWritableKey(key)) {
      if (__DEV__) console.warn(`[state] dropped non-whitelisted write: ${key}`);
      return false;
    }
    const { userTouched } = get();
    if (source === 'model' && userTouched.has(key)) {
      // User intent wins within the same screen.
      return false;
    }
    set((s) => {
      const nextTouched =
        source === 'user' ? new Set(s.userTouched).add(key) : s.userTouched;
      return { bag: { ...s.bag, [key]: value }, userTouched: nextTouched };
    });
    return true;
  },

  getArray: (key) => {
    const v = get().bag[key];
    return Array.isArray(v) ? v : [];
  },

  seedArray: (key, values) => {
    if (!isWritableKey(key)) return;
    set((s) => {
      // Only seed if the user hasn't already built this collection.
      if (Array.isArray(s.bag[key])) return s;
      return { bag: { ...s.bag, [key]: [...values] } };
    });
  },

  add: (key, value, source = 'user') => mutateArray(get, set, key, source, (arr) =>
    arr.includes(value) ? arr : [...arr, value],
  ),

  removeItem: (key, value, source = 'user') => mutateArray(get, set, key, source, (arr) =>
    arr.filter((x) => x !== value),
  ),

  toggleItem: (key, value, source = 'user') => mutateArray(get, set, key, source, (arr) =>
    arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value],
  ),

  snapshot: () => {
    const { bag } = get();
    const keys = Object.keys(bag).sort();
    if (keys.length === 0) return '(empty)';
    return keys
      .map((k) => `${k} = ${formatValue(bag[k])}`)
      .join('\n');
  },

  clearUserTouched: () => set({ userTouched: new Set<string>() }),

  reset: () => set({ bag: {}, userTouched: new Set<string>() }),
}));

function formatValue(v: StateValue): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return `[${v.join(', ')}]`;
  return String(v);
}

/** Shared array-mutation path: whitelist + user-intent protection + write. */
function mutateArray(
  get: () => StateStore,
  set: (fn: (s: StateStore) => Partial<StateStore>) => void,
  key: string,
  source: WriteSource,
  update: (arr: string[]) => string[],
): boolean {
  if (!isWritableKey(key)) {
    if (__DEV__) console.warn(`[state] dropped non-whitelisted write: ${key}`);
    return false;
  }
  if (source === 'model' && get().userTouched.has(key)) return false;
  set((s) => {
    const cur = Array.isArray(s.bag[key]) ? (s.bag[key] as string[]) : [];
    const next = update(cur);
    const touched =
      source === 'user' ? new Set(s.userTouched).add(key) : s.userTouched;
    return { bag: { ...s.bag, [key]: next }, userTouched: touched };
  });
  return true;
}
