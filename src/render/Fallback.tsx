// Safe fallback. Every model output is untrusted: an unknown constructor, a
// failed prop validation, a reference cycle, or excessive depth all land here
// instead of crashing the app.

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { radius, space, useTheme, type Palette, type TextStyles } from '../theme';

export function Fallback({
  label,
  reason,
}: {
  label?: string;
  reason?: string;
}) {
  const { colors, text } = useTheme();
  const styles = useMemo(() => makeStyles(colors, text), [colors, text]);

  if (__DEV__) {
    return (
      <View style={styles.box}>
        <Text style={styles.text}>
          ⚠︎ {label ?? 'Unrenderable'}
          {reason ? ` (${reason})` : ''}
        </Text>
      </View>
    );
  }
  // In production, fail silently to a small inert placeholder.
  return <View style={styles.silent} />;
}

function makeStyles(colors: Palette, text: TextStyles) {
  return StyleSheet.create({
    box: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.danger,
      padding: space.sm,
      marginVertical: space.xs,
    },
    text: { ...text.caption, color: colors.danger },
    silent: { height: space.xs },
  });
}
