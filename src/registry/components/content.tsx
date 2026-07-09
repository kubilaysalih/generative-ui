import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import {
  radius,
  space,
  useTheme,
  type Palette,
  type TextStyles,
  type TextVariant,
} from '../../theme';
import { nodeToObject, nodeToString } from '../../dsl/resolver';
import type { RegistryEntry } from '../types';

const VARIANTS: TextVariant[] = [
  'large-heavy',
  'large',
  'title',
  'body',
  'caption',
  'label',
];

// --- TextContent: text with a style variant ---------------------------------

function TextContent({ text, variant }: { text: string; variant?: TextVariant }) {
  const theme = useTheme();
  const style = theme.text[variant && VARIANTS.includes(variant) ? variant : 'body'];
  return <Text style={style}>{text}</Text>;
}

export const textContentEntry: RegistryEntry = {
  name: 'TextContent',
  description:
    'A block of text with a style variant. variant ∈ {large-heavy, large, title, body, caption, label}.',
  signature: 'TextContent(text: string, variant?: string)',
  schema: z.object({
    text: z.string(),
    variant: z.enum(VARIANTS as [TextVariant, ...TextVariant[]]).optional(),
  }),
  props: (args) => ({
    text: nodeToString(args[0]) ?? '',
    variant: nodeToString(args[1]),
  }),
  Component: TextContent,
};

// --- CardHeader: title + subtitle -------------------------------------------

function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { colors, text } = useTheme();
  const styles = useMemo(() => makeStyles(colors, text), [colors, text]);
  return (
    <View style={styles.header}>
      <Text style={text.large}>{title}</Text>
      {subtitle ? <Text style={styles.headerSub}>{subtitle}</Text> : null}
    </View>
  );
}

export const cardHeaderEntry: RegistryEntry = {
  name: 'CardHeader',
  description: 'A prominent header with a title and optional subtitle.',
  signature: 'CardHeader(title: string, subtitle?: string)',
  schema: z.object({ title: z.string(), subtitle: z.string().optional() }),
  props: (args) => ({
    title: nodeToString(args[0]) ?? '',
    subtitle: nodeToString(args[1]),
  }),
  Component: CardHeader,
};

// --- KVList: titled label/value pairs ---------------------------------------

function KVList({
  title,
  pairs,
}: {
  title?: string;
  pairs: Record<string, unknown>;
}) {
  const { colors, text } = useTheme();
  const styles = useMemo(() => makeStyles(colors, text), [colors, text]);
  const entries = Object.entries(pairs ?? {});
  return (
    <View style={styles.kv}>
      {title ? <Text style={styles.kvTitle}>{title.toUpperCase()}</Text> : null}
      <View style={styles.kvBody}>
        {entries.map(([k, v], i) => (
          <View
            key={k}
            style={[styles.kvRow, i < entries.length - 1 && styles.kvRowBorder]}
          >
            <Text style={styles.kvKey}>{k}</Text>
            <Text style={styles.kvVal}>{String(v)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export const kvListEntry: RegistryEntry = {
  name: 'KVList',
  description:
    'A titled set of label/value rows (e.g. an order summary). pairs is an object like {Delivery:"$2.99", ETA:"25 min"}.',
  signature: 'KVList(title: string, pairs: object)',
  schema: z.object({
    title: z.string().optional(),
    pairs: z.record(z.string(), z.any()).default({}),
  }),
  props: (args) => ({
    title: nodeToString(args[0]),
    pairs: nodeToObject(args[1]) ?? {},
  }),
  Component: KVList,
};

// --- HeroStat: big number + label + caption ---------------------------------

function HeroStat({
  value,
  label,
  caption,
}: {
  value: string;
  label?: string;
  caption?: string;
}) {
  const { colors, text } = useTheme();
  const styles = useMemo(() => makeStyles(colors, text), [colors, text]);
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      {label ? <Text style={styles.statLabel}>{label}</Text> : null}
      {caption ? <Text style={styles.statCaption}>{caption}</Text> : null}
    </View>
  );
}

export const heroStatEntry: RegistryEntry = {
  name: 'HeroStat',
  description: 'A large highlighted number with a label and optional caption.',
  signature: 'HeroStat(value: string, label?: string, caption?: string)',
  schema: z.object({
    value: z.string(),
    label: z.string().optional(),
    caption: z.string().optional(),
  }),
  props: (args) => ({
    value: nodeToString(args[0]) ?? '',
    label: nodeToString(args[1]),
    caption: nodeToString(args[2]),
  }),
  Component: HeroStat,
};

function makeStyles(colors: Palette, text: TextStyles) {
  return StyleSheet.create({
    header: { gap: space.xs },
    headerSub: { ...text.caption },
    kv: { gap: space.sm },
    kvTitle: { ...text.label, letterSpacing: 0.6, paddingHorizontal: space.xs },
    kvBody: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      paddingHorizontal: space.md,
    },
    kvRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: space.md,
    },
    kvRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    kvKey: { ...text.body, color: colors.textMuted },
    kvVal: { ...text.body, fontWeight: '600' },
    stat: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      padding: space.lg,
      alignItems: 'center',
      gap: space.xs,
    },
    statValue: { fontSize: 40, fontWeight: '800', color: colors.accent },
    statLabel: { ...text.title },
    statCaption: { ...text.caption },
  });
}
