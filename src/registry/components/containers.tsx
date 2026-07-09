import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { radius, space, useTheme, type Palette, type TextStyles } from '../../theme';
import { childNodes, nodeToString } from '../../dsl/resolver';
import type { RegistryEntry } from '../types';

// --- Card: vertical container of child refs ---------------------------------

function Card({ children }: { children?: React.ReactNode }) {
  const { colors, text } = useTheme();
  const styles = useMemo(() => makeStyles(colors, text), [colors, text]);
  return <View style={styles.card}>{children}</View>;
}

export const cardEntry: RegistryEntry = {
  name: 'Card',
  description: 'Vertical container that stacks its child components with spacing.',
  signature: 'Card(children: ref[])',
  schema: z.object({}),
  props: () => ({}),
  children: (args) => ({ children: childNodes(args[0]) }),
  Component: Card,
};

// --- ListBlock: titled list of child refs -----------------------------------

function ListBlock({
  title,
  children,
}: {
  title?: string;
  children?: React.ReactNode;
}) {
  const { colors, text } = useTheme();
  const styles = useMemo(() => makeStyles(colors, text), [colors, text]);
  return (
    <View style={styles.listBlock}>
      {title ? <Text style={styles.listTitle}>{title.toUpperCase()}</Text> : null}
      <View style={styles.listBody}>{children}</View>
    </View>
  );
}

export const listBlockEntry: RegistryEntry = {
  name: 'ListBlock',
  description: 'A titled vertical list of rows (usually ListItem refs).',
  signature: 'ListBlock(children: ref[], title?: string)',
  schema: z.object({ title: z.string().optional() }),
  props: (args) => ({ title: nodeToString(args[1]) }),
  children: (args) => ({ children: childNodes(args[0]) }),
  Component: ListBlock,
};

// --- Row: horizontal layout that splits width evenly among children ---------

// One primitive for all horizontal layout. Each child is put in an equal flex
// cell, so widths are decided HERE (by the row), not by giving every child its
// own width. A child fills its cell — buttons, stats, chips, whatever. Keep to
// 2–4 children; for a grid, stack multiple Rows inside a Column.
function EvenRow({ children }: { children?: React.ReactNode }) {
  const { colors, text } = useTheme();
  const styles = useMemo(() => makeStyles(colors, text), [colors, text]);
  return (
    <View style={styles.row}>
      {React.Children.map(children, (child) =>
        child == null ? null : <View style={styles.rowCell}>{child}</View>,
      )}
    </View>
  );
}

export const rowEntry: RegistryEntry = {
  name: 'Row',
  description:
    'A horizontal row that splits its width EVENLY among its children (equal columns). Use for anything side by side — buttons, stats, cells. Keep to 2–4 children; for a grid, stack several Rows in a Column.',
  signature: 'Row(children: ref[])',
  schema: z.object({}),
  props: () => ({}),
  children: (args) => ({ children: childNodes(args[0]) }),
  rowChildren: true,
  Component: EvenRow,
};

// Buttons is just a Row specialised for a call-to-action bar (same even split).
export const buttonsEntry: RegistryEntry = {
  name: 'Buttons',
  description:
    'A horizontal call-to-action bar: splits its width evenly among Button refs. (Same as Row, named for buttons.) Keep to 2–4; more should be stacked as Rows in a Column.',
  signature: 'Buttons(children: ref[])',
  schema: z.object({}),
  props: () => ({}),
  children: (args) => ({ children: childNodes(args[0]) }),
  rowChildren: true,
  Component: EvenRow,
};

// --- Column: vertical stack of child refs (no card chrome) ------------------

function Column({ children }: { children?: React.ReactNode }) {
  const { colors, text } = useTheme();
  const styles = useMemo(() => makeStyles(colors, text), [colors, text]);
  return <View style={styles.column}>{children}</View>;
}

export const columnEntry: RegistryEntry = {
  name: 'Column',
  description:
    'A vertical stack of components with spacing (no card background). Use to group items, or to stack Rows into a grid.',
  signature: 'Column(children: ref[])',
  schema: z.object({}),
  props: () => ({}),
  children: (args) => ({ children: childNodes(args[0]) }),
  Component: Column,
};

// --- Carousel: full-bleed horizontal scroller -------------------------------

// A horizontal, edge-to-edge scroller for cards/photos. It cancels the standard
// content padding with a negative margin and re-adds it INSIDE the scroll, so
// items line up with the rest of the content yet scroll all the way to the
// screen edge (no weird cutoff short of the edge). Put it at the top level (in a
// Column root, NOT inside a Card) so the bleed reaches the real edge. Children
// keep their own width (e.g. PhotoCard); they are laid out in a row with a gap.
function Carousel({ children }: { children?: React.ReactNode }) {
  const { colors, text } = useTheme();
  const styles = useMemo(() => makeStyles(colors, text), [colors, text]);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.carousel}
      contentContainerStyle={styles.carouselContent}
    >
      {children}
    </ScrollView>
  );
}

export const carouselEntry: RegistryEntry = {
  name: 'Carousel',
  description:
    'A full-bleed HORIZONTAL scroller for cards/photos — scrolls edge to edge. Children keep their own width (use PhotoCard). Place it at the top level (a child of a Column root, not inside a Card) so it bleeds to the screen edges.',
  signature: 'Carousel(children: ref[])',
  schema: z.object({}),
  props: () => ({}),
  children: (args) => ({ children: childNodes(args[0]) }),
  rowChildren: true,
  childSkeleton: 'card',
  Component: Carousel,
};

function makeStyles(colors: Palette, text: TextStyles) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space.md,
      gap: space.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    listBlock: {
      gap: space.sm,
    },
    listTitle: {
      ...text.label,
      letterSpacing: 0.6,
      paddingHorizontal: space.xs,
    },
    listBody: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      overflow: 'hidden',
      // The body owns ALL the spacing — uniform padding on every edge plus a gap
      // between children — so real rows and loading skeletons are inset and
      // spaced identically (children add no vertical margin of their own).
      padding: space.md,
      gap: space.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: space.sm,
    },
    rowCell: { flex: 1 },
    column: { gap: space.md },
    // Full-bleed: cancel the surrounding content padding, then re-add it inside
    // the scroll so the first item aligns but content reaches the edge.
    carousel: { marginHorizontal: -space.md },
    carouselContent: {
      paddingHorizontal: space.md,
      gap: space.md,
      paddingVertical: 2,
    },
  });
}
