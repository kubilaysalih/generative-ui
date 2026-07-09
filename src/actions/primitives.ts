// The closed primitive pool. This is the WHOLE list — behaviors come from
// *chaining* primitives, never from adding new ones. A primitive is a UI
// mechanic (navigate, copy, openUrl), never a piece of business logic
// (no bookHotel, no placeOrder — those are `submit` + a backend).

import { Share } from 'react-native';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import type { Node } from '../dsl/types';
import { nodeToString } from '../dsl/resolver';
import { useStateStore, type StateValue } from '../state/store';

/**
 * App-level capabilities a primitive may need but can't own itself (they touch
 * navigation + generation). Injected by the screen that dispatches.
 */
export interface ActionContext {
  /** Push a new generated screen seeded by text. */
  navigate: (seed: string) => void;
  /** Open a new generated screen as a modal sheet, seeded by text. */
  present: (seed: string) => void;
  /** Re-run generation in the current screen's context. */
  refine: (prompt: string) => void;
  /** Regenerate ONLY a named region (line) in place — partial refine. */
  refineRegion: (region: string, prompt: string) => void;
  /** Collect form state under formKey and run a stream with it. */
  submit: (formKey: string) => void;
  /** React Navigation goBack. */
  back: () => void;
}

export type Primitive = (
  args: unknown[],
  node: Node | undefined,
  ctx: ActionContext,
) => void | Promise<void>;

const str = (v: unknown): string => (v == null ? '' : String(v));
const enc = (v: string): string => encodeURIComponent(v);

/**
 * Deep-link targets for a small whitelist of external apps. Each builds a
 * native-scheme URL (opens the installed app directly) and an https fallback
 * (universal link — opens the app if installed, the browser otherwise).
 * Opening a named external app is a UI mechanic, not business logic.
 */
const APP_LINKS: Record<
  string,
  (query?: string) => { native: string; web: string }
> = {
  youtube: (q) =>
    q
      ? {
          native: `youtube://results?search_query=${enc(q)}`,
          web: `https://www.youtube.com/results?search_query=${enc(q)}`,
        }
      : { native: 'youtube://', web: 'https://www.youtube.com' },
  spotify: (q) =>
    q
      ? { native: `spotify:search:${enc(q)}`, web: `https://open.spotify.com/search/${enc(q)}` }
      : { native: 'spotify://', web: 'https://open.spotify.com' },
  maps: (q) =>
    q
      ? { native: `maps://?q=${enc(q)}`, web: `https://maps.google.com/?q=${enc(q)}` }
      : { native: 'maps://', web: 'https://maps.google.com' },
  twitter: (q) =>
    q
      ? { native: `twitter://search?query=${enc(q)}`, web: `https://x.com/search?q=${enc(q)}` }
      : { native: 'twitter://', web: 'https://x.com' },
  instagram: (q) =>
    q
      ? { native: `instagram://tag?name=${enc(q.replace(/[^a-z0-9]/gi, ''))}`, web: `https://www.instagram.com/explore/tags/${enc(q.replace(/[^a-z0-9]/gi, ''))}` }
      : { native: 'instagram://', web: 'https://www.instagram.com' },
  appstore: (q) =>
    q
      ? { native: `itms-apps://search?term=${enc(q)}`, web: `https://apps.apple.com/search?term=${enc(q)}` }
      : { native: 'itms-apps://', web: 'https://apps.apple.com' },
};

/** Fall back to the owning node's first string arg (usually its title). */
function seedFrom(node: Node | undefined): string {
  if (!node || node.kind !== 'constructor') return '';
  return nodeToString(node.args[0]) ?? '';
}

export const primitives: Record<string, Primitive> = {
  navigate: (args, node, ctx) => {
    const seed = str(args[0]) || seedFrom(node);
    if (seed) ctx.navigate(seed);
  },

  present: (args, node, ctx) => {
    const seed = str(args[0]) || seedFrom(node);
    if (seed) ctx.present(seed);
  },

  refine: (args, _node, ctx) => {
    const prompt = str(args[0]);
    if (prompt) ctx.refine(prompt);
  },

  refineRegion: (args, _node, ctx) => {
    const region = str(args[0]);
    const prompt = str(args[1]);
    if (region && prompt) ctx.refineRegion(region, prompt);
  },

  setState: (args) => {
    const key = str(args[0]);
    const value = args[1] as StateValue;
    // Model-originated write: goes through the whitelist + conflict rule.
    useStateStore.getState().set(key, value ?? null, 'model');
  },

  // Local-first collection edits — handled entirely in the Zustand store, with
  // NO model call. A StateList bound to the same key re-renders instantly.
  add: (args) => {
    useStateStore.getState().add(str(args[0]), str(args[1]), 'user');
  },
  remove: (args) => {
    useStateStore.getState().removeItem(str(args[0]), str(args[1]), 'user');
  },
  toggle: (args) => {
    useStateStore.getState().toggleItem(str(args[0]), str(args[1]), 'user');
  },

  openUrl: async (args) => {
    const url = str(args[0]);
    if (url) await Linking.openURL(url).catch(() => {});
  },

  openApp: async (args) => {
    const app = str(args[0]).toLowerCase().trim();
    const query = args[1] != null && str(args[1]) ? str(args[1]) : undefined;

    // A raw URL passed as the app → just open it.
    if (/^[a-z]+:\/\//i.test(app)) {
      await Linking.openURL(app).catch(() => {});
      return;
    }

    const builder = APP_LINKS[app];
    if (!builder) {
      if (__DEV__) console.warn(`[actions] openApp: unknown app '${app}'`);
      return;
    }

    const { native, web } = builder(query);
    // Prefer the native scheme (opens the installed app); fall back to https,
    // which opens the app via a universal link or the browser if it's absent.
    try {
      if (await Linking.canOpenURL(native)) {
        await Linking.openURL(native);
        return;
      }
    } catch {
      // canOpenURL can throw if the scheme isn't declared as queryable.
    }
    await Linking.openURL(web).catch(() => {});
  },

  call: async (args) => {
    const number = str(args[0]).replace(/[^\d+]/g, '');
    if (number) await Linking.openURL(`tel:${number}`).catch(() => {});
  },

  share: async (args) => {
    const text = str(args[0]);
    if (text) await Share.share({ message: text }).catch(() => {});
  },

  copy: async (args) => {
    const text = str(args[0]);
    if (text) await Clipboard.setStringAsync(text).catch(() => {});
  },

  submit: (args, _node, ctx) => {
    const formKey = str(args[0]);
    if (formKey) ctx.submit(formKey);
  },

  back: (_args, _node, ctx) => {
    ctx.back();
  },
};

/** Metadata for the action catalog (system prompt). Keep in sync with the pool. */
export const PRIMITIVE_DOCS: { signature: string; description: string }[] = [
  { signature: 'navigate(seed: string)', description: 'Push a NEW full-screen generated screen seeded by `seed` text (a detail/description).' },
  { signature: 'present(seed: string)', description: 'Open a new generated screen as a MODAL SHEET stacked over the current one (swipe down to close). Prefer this for quick detail views (a film, product, profile, event, place) where a full page-push feels heavy.' },
  { signature: 'refine(prompt: string)', description: 'Re-run generation for the WHOLE current screen with a refinement prompt.' },
  { signature: 'refineRegion(region: string, prompt: string)', description: 'Regenerate ONLY one region (the line named `region` and its children) in place — the rest of the screen stays. Use for filters/tabs so only the affected list reloads, not the whole screen.' },
  { signature: 'setState(key: string, value)', description: 'Write a single value to the state store. Only keys under selection./filter./expanded./tab./form. are allowed.' },
  { signature: 'add(key: string, value: string)', description: 'Append an item to a collection at `key` (a StateList). LOCAL — no regeneration. Use for "add to cart / add to list" buttons.' },
  { signature: 'remove(key: string, value: string)', description: 'Remove an item from a collection at `key`. LOCAL — no regeneration.' },
  { signature: 'toggle(key: string, value: string)', description: 'Toggle an item in a collection at `key` (add if absent, remove if present). LOCAL — no regeneration. Great for checklists.' },
  { signature: 'openUrl(url: string)', description: 'Open an external URL in the browser.' },
  { signature: 'openApp(app: string, query?: string)', description: 'Deep-link into an external app, searching for `query` if given. app ∈ youtube, spotify, maps, twitter, instagram, appstore. Opens the installed app, or the website as fallback.' },
  { signature: 'call(number: string)', description: 'Start a real phone call (tel:). NOT a generated screen.' },
  { signature: 'share(text: string)', description: 'Open the native share sheet with text.' },
  { signature: 'copy(text: string)', description: 'Copy text to the clipboard.' },
  { signature: 'submit(formKey: string)', description: 'Collect form.* state under formKey and run a new generation with it.' },
  { signature: 'back()', description: 'Go back to the previous screen (from cache, instant).' },
];
