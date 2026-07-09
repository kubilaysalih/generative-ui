// Settings: appearance (theme), mock mode, provider (OpenRouter / OpenAI /
// Anthropic), a key per provider, and a model picker (popular models + free
// tier + custom id). All persisted to AsyncStorage. Presented as a modal from
// the Home gear.

import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Segmented } from '../ui/Segmented';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  PROVIDER_IDS,
  PROVIDERS,
  useSettingsStore,
  type ThemePref,
} from '../state/settings';
import type { RootStackParamList } from '../navigation/types';
import {
  radius,
  space,
  useTheme,
  type Palette,
  type TextStyles,
} from '../theme';

const THEME_OPTS: ThemePref[] = ['system', 'light', 'dark'];
const THEME_LABELS = ['System', 'Light', 'Dark'];
type Nav = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const { colors, text, scheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors, text), [colors, text]);

  const useMock = useSettingsStore((s) => s.useMock);
  const provider = useSettingsStore((s) => s.provider);
  const keys = useSettingsStore((s) => s.keys);
  const models = useSettingsStore((s) => s.models);
  const theme = useSettingsStore((s) => s.theme);
  const setUseMock = useSettingsStore((s) => s.setUseMock);
  const setProvider = useSettingsStore((s) => s.setProvider);
  const setKey = useSettingsStore((s) => s.setKey);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const [showKey, setShowKey] = useState(false);

  const def = PROVIDERS[provider];
  const key = keys[provider];
  const model = models[provider];

  return (
    <View style={styles.screen}>
      {/* Modal over the dark backdrop → light status bar (visible in light theme). */}
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Appearance / theme */}
          <View style={styles.field}>
            <Text style={styles.label}>Appearance</Text>
            <Segmented
              values={THEME_LABELS}
              selectedIndex={THEME_OPTS.indexOf(theme)}
              onChange={(i) => setTheme(THEME_OPTS[i])}
            />
          </View>

          {/* Mock mode */}
          <View style={styles.rowBetween}>
            <View style={styles.flex}>
              <Text style={styles.label}>Mock mode</Text>
              <Text style={styles.hint}>
                Offline demo — no key or network needed. Turn off to use a real model.
              </Text>
            </View>
            <Switch
              value={useMock}
              onValueChange={setUseMock}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#fff"
            />
          </View>

          {!useMock && (
            <>
              {/* Provider */}
              <View style={styles.field}>
                <Text style={styles.label}>Provider</Text>
                <Segmented
                  values={PROVIDER_IDS.map((id) => PROVIDERS[id].label)}
                  selectedIndex={PROVIDER_IDS.indexOf(provider)}
                  onChange={(i) => setProvider(PROVIDER_IDS[i])}
                />
              </View>

              {/* API key (per provider) */}
              <View style={styles.field}>
                <View style={styles.rowBetween}>
                  <Text style={styles.label}>{def.label} API key</Text>
                  <Pressable onPress={() => Linking.openURL(def.keysUrl)} hitSlop={8}>
                    <Text style={styles.link}>Get a key ↗</Text>
                  </Pressable>
                </View>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.keyInput}
                    value={key}
                    onChangeText={(v) => setKey(provider, v)}
                    placeholder={def.keyPlaceholder}
                    placeholderTextColor={colors.textFaint}
                    secureTextEntry={!showKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable onPress={() => setShowKey((v) => !v)} hitSlop={8}>
                    <Ionicons
                      name={showKey ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </Pressable>
                </View>
                <Text style={styles.hint}>{def.keyHint} Stored on-device only.</Text>
              </View>

              {/* Model */}
              <View style={styles.field}>
                <Text style={styles.label}>Model</Text>
                <Pressable
                  style={styles.select}
                  onPress={() => navigation.navigate('ModelPicker', { provider })}
                >
                  <Text style={styles.selectText} numberOfLines={1}>
                    {model}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                </Pressable>
                {def.hasFree && (
                  <Text style={styles.hint}>
                    Free models cost nothing but are rate-limited (~20/min) and can be
                    flaky — handy to test if you don&apos;t have a key.
                  </Text>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function makeStyles(colors: Palette, text: TextStyles) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    flex: { flex: 1 },
    content: { padding: space.lg, gap: space.xl },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
    },
    field: { gap: space.sm },
    label: { ...text.title },
    hint: { ...text.caption },
    link: { ...text.caption, color: colors.primary, fontWeight: '600' },

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

    select: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      paddingHorizontal: space.lg,
      paddingVertical: space.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    selectText: { ...text.body, flex: 1, marginRight: space.sm },
  });
}
