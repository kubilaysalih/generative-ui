import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PROVIDERS, useSettingsStore } from '../state/settings';
import type { RootStackParamList } from '../navigation/types';
import {
  radius,
  space,
  useTheme,
  type Palette,
  type TextStyles,
} from '../theme';

type Route = RouteProp<RootStackParamList, 'ModelPicker'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'ModelPicker'>;

export function ModelPickerScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { colors, text } = useTheme();
  const styles = useMemo(() => makeStyles(colors, text), [colors, text]);
  const [custom, setCustom] = useState('');

  const provider = route.params.provider;
  const def = PROVIDERS[provider];
  const current = useSettingsStore((s) => s.models[provider]);
  const setModel = useSettingsStore((s) => s.setModel);
  const query = custom.trim().toLowerCase();
  const filtered = query
    ? def.models.filter(
        (m) =>
          m.label.toLowerCase().includes(query) ||
          m.id.toLowerCase().includes(query),
      )
    : def.models;

  const select = (id: string) => {
    const clean = id.trim();
    if (!clean) return;
    setModel(provider, clean);
    navigation.goBack();
  };

  return (
    <View style={styles.screen}>
      {/* Modal over the dark backdrop → light status bar (visible in light theme). */}
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[
          styles.pickerContent,
          { paddingBottom: insets.bottom + space.lg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.customField}>
          <Text style={styles.hint}>Search models or enter any model id</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.keyInput}
              value={custom}
              onChangeText={setCustom}
              placeholder="Search Sonnet, GPT, Gemini..."
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={() => select(custom)}
            />
            <Pressable
              onPress={() => select(custom)}
              hitSlop={8}
              disabled={!custom.trim()}
            >
              <Ionicons
                name="arrow-forward-circle"
                size={24}
                color={custom.trim() ? colors.primary : colors.border}
              />
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionLabel}>
          {query ? 'MATCHING MODELS' : 'POPULAR'}
        </Text>
        {filtered.map((m) => {
          const active = m.id === current;
          return (
            <Pressable
              key={m.id}
              style={styles.modelRow}
              onPress={() => select(m.id)}
            >
              <View style={styles.flex}>
                <View style={styles.modelTitleRow}>
                  <Text style={styles.modelLabel}>{m.label}</Text>
                  {m.free ? (
                    <View style={styles.freeBadge}>
                      <Text style={styles.freeBadgeText}>FREE</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.modelId}>{m.id}</Text>
              </View>
              {active ? (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              ) : null}
            </Pressable>
          );
        })}
        {filtered.length === 0 ? (
          <Text style={styles.emptyText}>No matching saved models</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: Palette, text: TextStyles) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    flex: { flex: 1 },
    pickerContent: { paddingHorizontal: space.lg, paddingTop: space.md },
    customField: { gap: space.sm, paddingVertical: space.lg },
    hint: { ...text.caption },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      paddingHorizontal: space.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    keyInput: { flex: 1, ...text.body, paddingVertical: space.md },
    sectionLabel: {
      ...text.label,
      letterSpacing: 0.6,
      marginTop: space.md,
      marginBottom: space.xs,
    },
    modelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      paddingVertical: space.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    modelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
    modelLabel: { ...text.title },
    modelId: { ...text.caption, color: colors.textFaint },
    emptyText: { ...text.caption, paddingVertical: space.md },
    freeBadge: {
      backgroundColor: colors.accent,
      borderRadius: radius.sm,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    freeBadgeText: { fontSize: 10, fontWeight: '800', color: '#000' },
  });
}
