import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { z } from 'zod';
import { radius, space, useTheme, type Palette, type TextStyles } from '../../theme';
import {
  nodeToObject,
  nodeToString,
  nodeToStringArray,
  parseAction,
} from '../../dsl/resolver';
import { useStateStore, type StateValue } from '../../state/store';
import { useRenderApi } from '../../render/RenderContext';
import type { RegistryEntry } from '../types';
import { actionSchema, Tappable, type ActionSteps } from './shared';

// --- ListItem: row with title, subtitle, thumbnail, action ------------------

function ListItem({
  title,
  subtitle,
  thumbnail,
  action,
}: {
  title: string;
  subtitle?: string;
  thumbnail?: { src?: string; alt?: string };
  action?: ActionSteps;
}) {
  const { colors, text } = useTheme();
  const styles = useMemo(() => makeStyles(colors, text), [colors, text]);
  return (
    <Tappable steps={action} style={styles.row}>
      {thumbnail?.src ? (
        <Image
          source={{ uri: thumbnail.src }}
          style={styles.thumb}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          accessibilityLabel={thumbnail.alt}
        />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}
      <View style={styles.rowText}>
        <Text style={text.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={text.caption} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action && action.length > 0 ? (
        <Text style={styles.chevron}>›</Text>
      ) : null}
    </Tappable>
  );
}

export const listItemEntry: RegistryEntry = {
  name: 'ListItem',
  description:
    'A tappable row: title, subtitle, optional thumbnail {src,alt}, and an optional Action. Usually inside a ListBlock.',
  signature:
    'ListItem(title: string, subtitle?: string, thumbnail?: {src,alt}, action?: Action)',
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    thumbnail: z
      .object({ src: z.string().optional(), alt: z.string().optional() })
      .optional(),
    action: actionSchema,
  }),
  props: (args) => ({
    title: nodeToString(args[0]) ?? '',
    subtitle: nodeToString(args[1]),
    thumbnail: nodeToObject(args[2]),
    action: parseAction(args[3]),
  }),
  Component: ListItem,
};

// --- Button: label + action + variant ---------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
const BUTTON_VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'ghost'];

function Button({
  label,
  action,
  variant = 'secondary',
}: {
  label: string;
  action?: ActionSteps;
  variant?: ButtonVariant;
}) {
  const { dispatch } = useRenderApi();
  const { colors, text } = useTheme();
  const styles = useMemo(() => makeStyles(colors, text), [colors, text]);
  const v = BUTTON_VARIANTS.includes(variant) ? variant : 'secondary';
  return (
    <Pressable
      onPress={() => action && dispatch(action)}
      style={({ pressed }) => [
        styles.btn,
        styles[`btn_${v}`],
        pressed && styles.btnPressed,
      ]}
    >
      <Text style={[styles.btnLabel, styles[`btnLabel_${v}`]]}>{label}</Text>
    </Pressable>
  );
}

export const buttonEntry: RegistryEntry = {
  name: 'Button',
  description:
    'A tappable button. variant ∈ {primary, secondary, ghost}. action is an Action.',
  signature: 'Button(label: string, action?: Action, variant?: string)',
  schema: z.object({
    label: z.string(),
    action: actionSchema,
    variant: z.enum(BUTTON_VARIANTS as [ButtonVariant, ...ButtonVariant[]]).optional(),
  }),
  props: (args) => ({
    label: nodeToString(args[0]) ?? '',
    action: parseAction(args[1]),
    variant: nodeToString(args[2]),
  }),
  Component: Button,
};

// --- Chips: horizontal selectable chips (local-first, stateful) -------------

function Chips({
  options,
  stateKey,
  initial,
  region,
}: {
  options: string[];
  stateKey?: string;
  initial?: string;
  region?: string;
}) {
  const { colors, text } = useTheme();
  const styles = useMemo(() => makeStyles(colors, text), [colors, text]);
  const { dispatch } = useRenderApi();

  // Local-first: the model is never contacted for a chip selection. When the
  // model gives a semantic stateKey we persist to the store; otherwise we fall
  // back to local component state so the selection ALWAYS responds to a tap.
  const key = stateKey ?? '';
  const stored = useStateStore((s) => (key ? s.bag[key] : undefined));
  const setState = useStateStore((s) => s.set);
  const [localSel, setLocalSel] = useState<string | undefined>(undefined);
  const selected =
    (typeof stored === 'string' ? stored : undefined) ??
    localSel ??
    initial ??
    options[0];

  const onSelect = (opt: string) => {
    if (opt === selected) return;
    setLocalSel(opt); // instant visual feedback, key or not
    if (key) setState(key, opt as StateValue, 'user');

    // A FILTER chip changes the content. If the model named a `region`, only
    // that region reloads (partial refine, content stays visible under a
    // shimmer). Otherwise fall back to a full-screen refine.
    if (region) {
      dispatch([
        {
          type: 'refineRegion',
          args: [
            region,
            `Filter ${key || 'category'} = "${opt}". Show only "${opt}" items. Keep the chips with "${opt}" selected.`,
          ],
        },
      ]);
    } else if (key.startsWith('filter.')) {
      dispatch([
        {
          type: 'refine',
          args: [
            `The user selected "${opt}" from the ${key} filter. Regenerate THIS screen showing only "${opt}" results. Keep the same chips with "${opt}" selected.`,
          ],
        },
      ]);
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chipsScroll}
      contentContainerStyle={styles.chips}
    >
      {options.map((opt) => {
        const active = opt === selected;
        return (
          <Pressable
            key={opt}
            onPress={() => onSelect(opt)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export const chipsEntry: RegistryEntry = {
  name: 'Chips',
  description:
    'A horizontal row of selectable chips (filter tabs). Selection persists to stateKey (e.g. "filter.category"), initial sets the default. If `region` (a line name string) is given, selecting a chip PARTIALLY reloads only that region — the rest of the screen stays put. Prefer giving a region so filtering doesn\'t reload the whole screen.',
  signature:
    'Chips(options: string[], stateKey?: string, initial?: string, region?: string)',
  schema: z.object({
    options: z.array(z.string()).default([]),
    stateKey: z.string().optional(),
    initial: z.string().optional(),
    region: z.string().optional(),
  }),
  props: (args) => ({
    options: nodeToStringArray(args[0]) ?? [],
    stateKey: nodeToString(args[1]),
    initial: nodeToString(args[2]),
    region: nodeToString(args[3]),
  }),
  Component: Chips,
};

// --- StateList: an editable collection backed entirely by local state --------

function StateList({
  title,
  stateKey,
  initial,
  emptyText,
}: {
  title?: string;
  stateKey?: string;
  initial?: string[];
  emptyText?: string;
}) {
  const { colors, text } = useTheme();
  const styles = useMemo(() => makeStyles(colors, text), [colors, text]);

  const key = stateKey ?? '';
  // Subscribe to this key so the list re-renders the instant the store changes.
  const items = useStateStore((s) => (key ? s.bag[key] : undefined));
  const seedArray = useStateStore((s) => s.seedArray);
  const removeItem = useStateStore((s) => s.removeItem);

  // Seed the store from the model's initial items once (never overwrites edits).
  useEffect(() => {
    if (key && initial && initial.length && !Array.isArray(items)) {
      seedArray(key, initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const list = Array.isArray(items) ? items : initial ?? [];

  return (
    <View style={styles.stateList}>
      {title ? <Text style={styles.stateTitle}>{title.toUpperCase()}</Text> : null}
      <View style={styles.stateBody}>
        {list.length === 0 ? (
          <Text style={styles.emptyText}>{emptyText ?? 'No items yet'}</Text>
        ) : (
          list.map((item, i) => (
            <View
              key={`${item}-${i}`}
              style={[styles.stateRow, i < list.length - 1 && styles.stateRowBorder]}
            >
              <Text style={styles.stateItem}>{item}</Text>
              <Pressable
                hitSlop={8}
                onPress={() => key && removeItem(key, item, 'user')}
                accessibilityLabel={`Remove ${item}`}
              >
                <Ionicons name="close" size={18} color={colors.textFaint} />
              </Pressable>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

export const stateListEntry: RegistryEntry = {
  name: 'StateList',
  description:
    'An EDITABLE list backed by local state (no regeneration). Seeded from `initial`; wire buttons to add(stateKey,"X") / remove / toggle to mutate it INSTANTLY. Use for carts, shopping lists, to-dos, selected items. stateKey is semantic under form.* (e.g. "form.cart"). Rows have a built-in remove (×).',
  signature:
    'StateList(title: string, stateKey: string, initial?: string[], emptyText?: string)',
  schema: z.object({
    title: z.string().optional(),
    stateKey: z.string().optional(),
    initial: z.array(z.string()).optional(),
    emptyText: z.string().optional(),
  }),
  props: (args) => ({
    title: nodeToString(args[0]),
    stateKey: nodeToString(args[1]),
    initial: nodeToStringArray(args[2]),
    emptyText: nodeToString(args[3]),
  }),
  Component: StateList,
};

function makeStyles(colors: Palette, text: TextStyles) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      // No self-padding: edge insets + between-row spacing come entirely from the
      // ListBlock body (padding + gap), so rows never double up on spacing.
    },
    thumb: {
      width: 52,
      height: 52,
      borderRadius: radius.sm,
      backgroundColor: colors.skeleton,
    },
    thumbPlaceholder: { backgroundColor: colors.skeleton },
    rowText: { flex: 1, gap: 2 },
    chevron: { fontSize: 24, color: colors.textFaint },

    btn: {
      // No width of its own: a button fills whatever it's placed in. Inside a
      // Row/Buttons cell it fills the (equal) cell; on its own in a column it
      // stretches full-width. Layout is decided by the container, not here.
      alignSelf: 'stretch',
      paddingVertical: space.md,
      paddingHorizontal: space.lg,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnPressed: { opacity: 0.75 },
    btn_primary: { backgroundColor: colors.primary },
    btn_secondary: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    // Ghost still reads as a button (a faint surface), just lower-emphasis than
    // secondary (no border) with the accent-coloured label.
    btn_ghost: { backgroundColor: colors.surfaceAlt },
    btnLabel: { ...text.title, textAlign: 'center' },
    btnLabel_primary: { color: colors.primaryText },
    btnLabel_secondary: { color: colors.text },
    btnLabel_ghost: { color: colors.primary },

    stateList: { gap: space.sm },
    stateTitle: { ...text.label, letterSpacing: 0.6, paddingHorizontal: space.xs },
    stateBody: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      paddingHorizontal: space.md,
    },
    stateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: space.md,
      gap: space.md,
    },
    stateRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    stateItem: { ...text.body, flex: 1 },
    emptyText: { ...text.caption, paddingVertical: space.md },

    // Full-bleed: cancel the container padding so chips scroll to the edge, and
    // re-add it inside so the first chip still lines up with the content.
    chipsScroll: { marginHorizontal: -space.md },
    chips: { gap: space.sm, paddingHorizontal: space.md, paddingVertical: 2 },
    chip: {
      paddingVertical: space.sm,
      paddingHorizontal: space.md,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceAlt,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { ...text.caption, color: colors.text },
    chipTextActive: { color: colors.primaryText, fontWeight: '600' },
  });
}
