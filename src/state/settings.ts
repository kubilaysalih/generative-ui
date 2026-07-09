// User settings, persisted to AsyncStorage. Single source of truth for how
// generation runs — the app reads no build-time environment variables.
//
//  - useMock  : run the offline demo stream instead of a live model
//  - provider : which service to call (OpenRouter / OpenAI / Anthropic)
//  - keys     : one API key per provider (users can hold several)
//  - models   : the selected model id per provider
//
// Persistence is handled by zustand's persist middleware; hydration is async, so
// `hydrated` tells the UI when the stored values are loaded.

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PROVIDER_IDS, PROVIDERS, type ProviderId } from '../llm/providers';

export type ThemePref = 'system' | 'light' | 'dark';

type PerProvider<T> = Record<ProviderId, T>;

function emptyKeys(): PerProvider<string> {
  return { openrouter: '', openai: '', anthropic: '' };
}
function defaultModels(): PerProvider<string> {
  return {
    openrouter: PROVIDERS.openrouter.defaultModel,
    openai: PROVIDERS.openai.defaultModel,
    anthropic: PROVIDERS.anthropic.defaultModel,
  };
}

interface SettingsState {
  useMock: boolean;
  provider: ProviderId;
  keys: PerProvider<string>;
  models: PerProvider<string>;
  theme: ThemePref;
  hydrated: boolean;

  setUseMock: (v: boolean) => void;
  setProvider: (p: ProviderId) => void;
  setKey: (p: ProviderId, v: string) => void;
  setModel: (p: ProviderId, v: string) => void;
  setTheme: (t: ThemePref) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Default to mock so a fresh install works with no key at all.
      useMock: true,
      provider: 'openrouter',
      keys: emptyKeys(),
      models: defaultModels(),
      theme: 'system',
      hydrated: false,

      setUseMock: (v) => set({ useMock: v }),
      setProvider: (p) => set({ provider: p }),
      setKey: (p, v) =>
        set((s) => ({ keys: { ...s.keys, [p]: v.trim() } })),
      setModel: (p, v) =>
        set((s) => ({
          models: { ...s.models, [p]: v.trim() || PROVIDERS[p].defaultModel },
        })),
      setTheme: (t) => set({ theme: t }),
    }),
    {
      name: 'genui-settings',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        useMock: s.useMock,
        provider: s.provider,
        keys: s.keys,
        models: s.models,
        theme: s.theme,
      }),
      // Migrate the old flat shape { apiKey, model, useMock } → per-provider.
      migrate: (persisted, version) => {
        if (version === 0 && persisted && typeof persisted === 'object') {
          const p = persisted as { apiKey?: string; model?: string; useMock?: boolean };
          const keys = emptyKeys();
          const models = defaultModels();
          if (p.apiKey) keys.openrouter = p.apiKey;
          if (p.model) models.openrouter = p.model;
          return {
            // If they never entered a key, fall back to mock so it still works.
            useMock: p.apiKey ? p.useMock ?? false : true,
            provider: 'openrouter' as ProviderId,
            keys,
            models,
          } as unknown as SettingsState;
        }
        return persisted as SettingsState;
      },
      onRehydrateStorage: () => () => {
        useSettingsStore.setState({ hydrated: true });
      },
    },
  ),
);

export { PROVIDER_IDS, PROVIDERS };
export type { ProviderId };
