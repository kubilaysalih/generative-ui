// Prompt bar fixed to the bottom of every screen.
//  - Submit (↑) runs generation in the current screen's context (continue).
//  - New (compose icon) resets navigation + context + state bag and starts fresh.

import React, { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, space, useTheme, type Palette, type TextStyles } from '../theme';

/** Side buttons and the input share this height so the row lines up cleanly. */
const CONTROL_SIZE = 44;

export function PromptBar({
  onSubmit,
  onNewWindow,
  placeholder = 'How can I help?',
}: {
  onSubmit: (text: string) => void;
  /** Omit to hide the "new" button (e.g. on Home, where it's redundant). */
  onNewWindow?: () => void;
  placeholder?: string;
}) {
  const [text, setText] = useState('');
  const insets = useSafeAreaInsets();
  const { colors, text: textStyles } = useTheme();
  const styles = useMemo(() => makeStyles(colors, textStyles), [colors, textStyles]);
  const canSend = text.trim().length > 0;

  // Keep the bar above the keyboard without react-native-keyboard-controller (so
  // it runs in Expo Go): on iOS lift the bar by the keyboard's height; on Android
  // the window resizes (adjustResize) so no manual lift is needed. Also drop the
  // home-indicator inset while the keyboard is open (it would be an empty gap).
  const [keyboardUp, setKeyboardUp] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => {
      setKeyboardUp(true);
      if (Platform.OS === 'ios') setKbHeight(e.endCoordinates?.height ?? 0);
    });
    const hide = Keyboard.addListener(hideEvt, () => {
      setKeyboardUp(false);
      setKbHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const bottomPad = keyboardUp ? space.sm : Math.max(insets.bottom, space.sm);

  const submit = () => {
    if (!canSend) return;
    onSubmit(text.trim());
    setText('');
  };

  return (
    <View style={{ paddingBottom: kbHeight, backgroundColor: colors.surface }}>
      <View style={[styles.bar, { paddingBottom: bottomPad }]}>
        {onNewWindow ? (
          <Pressable
            style={styles.newBtn}
            onPress={onNewWindow}
            hitSlop={8}
            accessibilityLabel="New window"
          >
            <Ionicons name="create-outline" size={22} color={colors.textMuted} />
          </Pressable>
        ) : null}

        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          returnKeyType="send"
          onSubmitEditing={submit}
          multiline={false}
        />

        <Pressable
          style={[styles.sendBtn, !canSend && styles.sendDisabled]}
          onPress={submit}
          disabled={!canSend}
          hitSlop={8}
          accessibilityLabel="Send"
        >
          <Ionicons name="arrow-up" size={22} color={colors.primaryText} />
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(colors: Palette, textStyles: TextStyles) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      paddingHorizontal: space.md,
      paddingTop: space.sm,
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    newBtn: {
      width: CONTROL_SIZE,
      height: CONTROL_SIZE,
      borderRadius: CONTROL_SIZE / 2,
      backgroundColor: colors.surfaceAlt,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    input: {
      flex: 1,
      height: CONTROL_SIZE,
      ...textStyles.body,
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.pill,
      paddingHorizontal: space.lg,
      paddingVertical: 0,
    },
    sendBtn: {
      width: CONTROL_SIZE,
      height: CONTROL_SIZE,
      borderRadius: CONTROL_SIZE / 2,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendDisabled: { backgroundColor: colors.border },
  });
}
