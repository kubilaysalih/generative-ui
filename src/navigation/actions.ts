// Navigation + generation actions shared by the screens and the action
// dispatcher. Creating a screen is a store write; navigating pushes a Gen route
// that points at the new record.
//
// Replace model: each new turn PUSHES a new Gen route. React Navigation's stack
// IS the history — Back pops to a route whose cached tree is already rendered,
// so Back is instant and never regenerates. Detail screens are an isolated
// branch: they carry their own minimal context and don't touch the main chain.

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useHistoryStore } from '../state/history';
import { useStateStore } from '../state/store';
import type { RootStackParamList } from './types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function useGenActions() {
  const navigation = useNavigation<Nav>();

  /** A new main-thread turn: fresh screen in the current context, pushed. */
  const startMain = (prompt: string) => {
    const clean = prompt.trim();
    if (!clean) return;
    // Genuinely new turn: the model's setState is allowed again.
    useStateStore.getState().clearUserTouched();
    const context = useHistoryStore.getState().mainContext;
    const id = useHistoryStore
      .getState()
      .createScreen({ prompt: clean, kind: 'main', context });
    navigation.push('Gen', { screenId: id });
  };

  /** An isolated detail screen from a navigate() seed (full-screen push). */
  const startDetail = (seed: string, fromPrompt: string) => {
    const clean = seed.trim();
    if (!clean) return;
    const id = useHistoryStore.getState().createScreen({
      prompt: clean,
      kind: 'detail',
      // Minimal context so detail generations don't pollute the main thread.
      context: [`Opened from: ${fromPrompt}`],
    });
    navigation.push('Gen', { screenId: id });
  };

  /** Same as startDetail, but presented as a modal sheet (present() primitive). */
  const startSheet = (seed: string, fromPrompt: string) => {
    const clean = seed.trim();
    if (!clean) return;
    const id = useHistoryStore.getState().createScreen({
      prompt: clean,
      kind: 'detail',
      context: [`Opened from: ${fromPrompt}`],
    });
    // push (not navigate): navigate() dedupes by route name, so presenting a
    // sheet from within a sheet would just swap the CURRENT sheet's params
    // instead of stacking a new modal. push always mounts a fresh instance.
    navigation.push('GenSheet', { screenId: id });
  };

  /** "New window": wipe cached screens + state bag, return to Home. */
  const newWindow = () => {
    useHistoryStore.getState().resetWindow();
    useStateStore.getState().reset();
    navigation.popToTop();
  };

  return { startMain, startDetail, startSheet, newWindow };
}

/** Build a compact submit prompt from the current form.* state under a key. */
export function buildSubmitPrompt(formKey: string): string {
  const bag = useStateStore.getState().bag;
  const entries = Object.entries(bag).filter(([k]) => k.startsWith(formKey));
  if (entries.length === 0) return `Submit ${formKey}`;
  const body = entries.map(([k, v]) => `${k} = ${v}`).join(', ');
  return `Submit ${formKey}: ${body}`;
}
