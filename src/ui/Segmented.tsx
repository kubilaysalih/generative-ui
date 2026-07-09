// A small JS segmented control (Pressable-based) so it runs in Expo Go — a drop-in
// for @react-native-segmented-control. The selected segment fills with the accent
// colour; theme-aware.

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, space, useTheme, type Palette, type TextStyles } from '../theme';

export function Segmented({
  values,
  selectedIndex,
  onChange,
}: {
  values: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}) {
  const { colors, text } = useTheme();
  const styles = useMemo(() => makeStyles(colors, text), [colors, text]);
  return (
    <View style={styles.container}>
      {values.map((v, i) => {
        const active = i === selectedIndex;
        return (
          <Pressable
            key={v}
            onPress={() => onChange(i)}
            style={[styles.segment, active && styles.segmentActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[styles.label, active && styles.labelActive]}
              numberOfLines={1}
            >
              {v}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(colors: Palette, text: TextStyles) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      padding: 3,
      gap: 3,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    segment: {
      flex: 1,
      paddingVertical: space.sm,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentActive: { backgroundColor: colors.primary },
    label: { ...text.caption, color: colors.textMuted, fontWeight: '600' },
    labelActive: { color: colors.primaryText },
  });
}
