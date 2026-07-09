// Tree cache + navigation history.
//
// Each generated screen is one route. This store maps screenId ->
// { prompt, table (dsl tree), status, context }. React Navigation's native
// stack IS the history: Back just pops to a route whose cached tree is already
// here, so Back is instant and free — we never regenerate.
//
// The main thread's context chain lives here too. Detail screens are an
// isolated branch: they carry their own minimal context and never append to
// the main chain, so opening card details doesn't pollute what the model sees
// when the user later refines in the main thread.

import { create } from 'zustand';
import type { SymbolTable } from '../dsl/types';

export type ScreenKind = 'main' | 'detail';
export type ScreenStatus = 'idle' | 'streaming' | 'done' | 'error';

export interface ScreenRecord {
  id: string;
  prompt: string;
  kind: ScreenKind;
  /** Live symbol table (the dsl tree). Grows as the stream arrives. */
  table: SymbolTable | null;
  status: ScreenStatus;
  error?: string;
  /** The context lines this screen was generated with (already frozen). */
  context: string[];
  /** Whether generation has been kicked off (prevents double-start). */
  started: boolean;
  /** Names of regions (line names) currently being partially regenerated. */
  loading: string[];
}

interface HistoryStore {
  records: Record<string, ScreenRecord>;
  /** Monotonic id counter (deterministic, no Date.now / random). */
  counter: number;
  /** Main-thread context chain — the light semantic summary the model sees. */
  mainContext: string[];

  createScreen: (input: {
    prompt: string;
    kind: ScreenKind;
    context: string[];
  }) => string;

  get: (id: string) => ScreenRecord | undefined;
  markStarted: (id: string) => void;
  setTable: (id: string, table: SymbolTable) => void;
  setStatus: (id: string, status: ScreenStatus, error?: string) => void;

  /** Mark a region (line name) as loading / done for partial refine. */
  setRegionLoading: (id: string, region: string, on: boolean) => void;
  /** Splice partial DSL lines into the live table (partial region refine). */
  mergeTable: (id: string, partial: SymbolTable) => void;

  /** Append a summary line to the main-thread context chain. */
  appendMainContext: (line: string) => void;

  /** "New window": wipe all cached screens + the main context chain. */
  resetWindow: () => void;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  records: {},
  counter: 0,
  mainContext: [],

  createScreen: ({ prompt, kind, context }) => {
    const id = `s${get().counter + 1}`;
    set((s) => ({
      counter: s.counter + 1,
      records: {
        ...s.records,
        [id]: {
          id,
          prompt,
          kind,
          table: null,
          status: 'idle',
          context,
          started: false,
          loading: [],
        },
      },
    }));
    return id;
  },

  get: (id) => get().records[id],

  markStarted: (id) =>
    set((s) => {
      const rec = s.records[id];
      if (!rec) return s;
      return { records: { ...s.records, [id]: { ...rec, started: true } } };
    }),

  setTable: (id, table) =>
    set((s) => {
      const rec = s.records[id];
      if (!rec) return s;
      // Clone the map so React sees a new reference and re-renders.
      return {
        records: { ...s.records, [id]: { ...rec, table: new Map(table) } },
      };
    }),

  setStatus: (id, status, error) =>
    set((s) => {
      const rec = s.records[id];
      if (!rec) return s;
      return { records: { ...s.records, [id]: { ...rec, status, error } } };
    }),

  setRegionLoading: (id, region, on) =>
    set((s) => {
      const rec = s.records[id];
      if (!rec) return s;
      const loading = on
        ? rec.loading.includes(region)
          ? rec.loading
          : [...rec.loading, region]
        : rec.loading.filter((r) => r !== region);
      return { records: { ...s.records, [id]: { ...rec, loading } } };
    }),

  mergeTable: (id, partial) =>
    set((s) => {
      const rec = s.records[id];
      if (!rec) return s;
      const next = new Map(rec.table ?? new Map());
      for (const [k, v] of partial) next.set(k, v);
      return { records: { ...s.records, [id]: { ...rec, table: next } } };
    }),

  appendMainContext: (line) =>
    set((s) => ({ mainContext: [...s.mainContext, line] })),

  resetWindow: () => set({ records: {}, mainContext: [], counter: 0 }),
}));
