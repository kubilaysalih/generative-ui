// Entry screen. Introduces the app, shows the current provider status, and
// hosts the prompt bar. A gear (top-right) opens Settings. Submitting a prompt
// creates the first generated screen and pushes into the Gen stack.

import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useGenActions } from '../navigation/actions';
import type { RootStackParamList } from '../navigation/types';
import { PROVIDERS, useSettingsStore } from '../state/settings';
import { PromptBar } from '../ui/PromptBar';
import { radius, space, useTheme, type Palette, type TextStyles } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const SUGGESTIONS = [
  'Trending movies to watch this week',
  'Weekend getaway ideas',
  'A shopping list I can add to',
  'Lofi music on YouTube',
];

export function HomeScreen() {
  const { startMain } = useGenActions();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { colors, text } = useTheme();
  const styles = useMemo(() => makeStyles(colors, text), [colors, text]);

  const useMock = useSettingsStore((s) => s.useMock);
  const provider = useSettingsStore((s) => s.provider);
  const keys = useSettingsStore((s) => s.keys);
  const models = useSettingsStore((s) => s.models);

  // Current provider status, shown so the user can see how generation will run.
  const def = PROVIDERS[provider];
  const status = useMock
    ? { icon: 'flask-outline' as const, text: 'Mock mode — offline demo', tone: colors.textMuted }
    : keys[provider]
      ? {
          icon: 'checkmark-circle' as const,
          text: `${def.label} · ${models[provider]}`,
          tone: colors.primary,
        }
      : {
          icon: 'alert-circle' as const,
          text: `${def.label} — no API key`,
          tone: colors.danger,
        };

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + space.sm }]}>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={10}>
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.emoji}>🥳</Text>
        <Text style={styles.title}>Generative UI</Text>
        <Text style={styles.subtitle}>
          Every screen is written by a model, streamed as a UI description, and
          rendered top-to-bottom as it arrives. Type anything below.
        </Text>

        <Pressable
          style={styles.status}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name={status.icon} size={16} color={status.tone} />
          <Text style={[styles.statusText, { color: status.tone }]}>
            {status.text}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textFaint} />
        </Pressable>

        <View style={styles.suggestions}>
          {SUGGESTIONS.map((s) => (
            <Pressable key={s} style={styles.chip} onPress={() => startMain(s)}>
              <Text style={styles.chipText}>{s}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <PromptBar onSubmit={startMain} />
    </View>
  );
}

function makeStyles(colors: Palette, text: TextStyles) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    scroll: { flex: 1 },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: space.lg,
      paddingBottom: space.sm,
    },
    content: { padding: space.lg, gap: space.md, paddingBottom: space.xl },
    emoji: { fontSize: 110, marginBottom: -space.sm },
    title: { ...text['large-heavy'], fontSize: 30, lineHeight: 36 },
    subtitle: { ...text.body, color: colors.textMuted },
    status: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      alignSelf: 'flex-start',
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      paddingVertical: space.sm,
      paddingHorizontal: space.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      marginTop: space.xs,
    },
    statusText: { ...text.caption, fontWeight: '600' },
    suggestions: { gap: space.sm, marginTop: space.lg },
    chip: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: space.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    chipText: { ...text.title, color: colors.text },
  });
}
