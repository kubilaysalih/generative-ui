import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { z } from 'zod';
import { radius, space, useTheme, type Palette, type TextStyles } from '../../theme';
import { nodeToNumber, nodeToString, parseAction } from '../../dsl/resolver';
import type { Node } from '../../dsl/types';
import type { RegistryEntry } from '../types';
import { actionSchema, Tappable, type ActionSteps } from './shared';

// --- ImageBlock: hero/banner image (lazy-loaded) ----------------------------

function ImageBlock({ url, caption }: { url: string; caption?: string }) {
  const { colors, text } = useTheme();
  const styles = useMemo(() => makeStyles(colors, text), [colors, text]);
  return (
    <View style={styles.imageWrap}>
      <Image
        source={{ uri: url }}
        style={styles.image}
        contentFit="cover"
        transition={250}
        cachePolicy="memory-disk"
      />
      {caption ? (
        <View style={styles.captionOverlay}>
          <Text style={styles.caption}>{caption}</Text>
        </View>
      ) : null}
    </View>
  );
}

export const imageBlockEntry: RegistryEntry = {
  name: 'ImageBlock',
  description:
    'A lazy-loaded hero/banner image with an optional caption overlay. url is an image URL.',
  signature: 'ImageBlock(url: string, caption?: string)',
  schema: z.object({ url: z.string(), caption: z.string().optional() }),
  props: (args) => ({
    url: nodeToString(args[0]) ?? '',
    caption: nodeToString(args[1]),
  }),
  Component: ImageBlock,
};

// --- PhotoCard: fixed-width image card (for carousels) ----------------------

function PhotoCard({
  title,
  image,
  subtitle,
  action,
  node,
}: {
  title: string;
  image: string;
  subtitle?: string;
  action?: ActionSteps;
  node?: Node;
}) {
  const { colors, text } = useTheme();
  const styles = useMemo(() => makeStyles(colors, text), [colors, text]);
  return (
    <Tappable steps={action} node={node} style={styles.photoCard}>
      <Image
        source={{ uri: image }}
        style={styles.photoImage}
        contentFit="cover"
        transition={250}
        cachePolicy="memory-disk"
      />
      <View style={styles.photoText}>
        <Text style={text.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={text.caption} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Tappable>
  );
}

export const photoCardEntry: RegistryEntry = {
  name: 'PhotoCard',
  description:
    'A fixed-width photo card: image on top, title + subtitle below, tappable. Made for Carousel (horizontal scroller) items — e.g. destinations, products, places.',
  signature:
    'PhotoCard(title: string, image: string, subtitle?: string, action?: Action)',
  schema: z.object({
    title: z.string(),
    image: z.string(),
    subtitle: z.string().optional(),
    action: actionSchema,
  }),
  props: (args) => ({
    title: nodeToString(args[0]) ?? '',
    image: nodeToString(args[1]) ?? '',
    subtitle: nodeToString(args[2]),
    action: parseAction(args[3]),
  }),
  Component: PhotoCard,
};

// --- MapView: address + zoom (placeholder) ----------------------------------

function MapView({ address, zoom }: { address: string; zoom?: number }) {
  const { colors, text } = useTheme();
  const styles = useMemo(() => makeStyles(colors, text), [colors, text]);
  return (
    <View style={styles.map}>
      <View style={styles.mapGrid} />
      <View style={styles.pin}>
        <Text style={styles.pinGlyph}>📍</Text>
      </View>
      <View style={styles.mapFooter}>
        <Text style={styles.mapAddress} numberOfLines={2}>
          {address}
        </Text>
        {zoom ? <Text style={styles.mapZoom}>zoom {zoom}</Text> : null}
      </View>
    </View>
  );
}

export const mapViewEntry: RegistryEntry = {
  name: 'MapView',
  description:
    'A static map placeholder pinned to an address, with optional zoom level.',
  signature: 'MapView(address: string, zoom?: number)',
  schema: z.object({ address: z.string(), zoom: z.number().optional() }),
  props: (args) => ({
    address: nodeToString(args[0]) ?? '',
    zoom: nodeToNumber(args[1]),
  }),
  Component: MapView,
};

function makeStyles(colors: Palette, text: TextStyles) {
  return StyleSheet.create({
    imageWrap: {
      borderRadius: radius.md,
      overflow: 'hidden',
      backgroundColor: colors.skeleton,
    },
    image: { width: '100%', aspectRatio: 16 / 9 },
    photoCard: { width: 220 },
    photoImage: {
      width: '100%',
      aspectRatio: 4 / 3,
      borderRadius: radius.md,
      backgroundColor: colors.skeleton,
    },
    photoText: { paddingTop: space.sm, gap: 2 },
    captionOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: space.md,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    caption: { ...text.title, color: '#fff' },
    map: {
      height: 180,
      borderRadius: radius.md,
      overflow: 'hidden',
      backgroundColor: '#20303A',
      justifyContent: 'flex-end',
    },
    mapGrid: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderColor: 'rgba(255,255,255,0.06)',
      borderWidth: 20,
    },
    pin: { position: 'absolute', top: '38%', left: '46%' },
    pinGlyph: { fontSize: 28 },
    mapFooter: {
      padding: space.md,
      backgroundColor: 'rgba(0,0,0,0.5)',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: space.sm,
    },
    mapAddress: { ...text.caption, color: '#fff', flex: 1 },
    mapZoom: { ...text.label, color: colors.textMuted },
  });
}
