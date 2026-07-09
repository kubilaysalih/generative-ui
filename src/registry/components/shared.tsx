import React from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { z } from 'zod';
import { radius, useTheme } from '../../theme';
import type { ActionStep, Node } from '../../dsl/types';
import { useRenderApi } from '../../render/RenderContext';

/** Zod schema for a coerced list of action steps. */
export const actionSchema = z
  .array(z.object({ type: z.string(), args: z.array(z.any()) }))
  .default([]);

export type ActionSteps = ActionStep[];

/**
 * Pressable surface that dispatches an action's steps on tap. If there are no
 * steps it renders as a plain, non-interactive view.
 */
export function Tappable({
  steps,
  node,
  style,
  children,
}: {
  steps?: ActionSteps;
  node?: Node;
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
}) {
  const { dispatch } = useRenderApi();
  const { colors } = useTheme();

  if (!steps || steps.length === 0) {
    return <View style={style}>{children}</View>;
  }

  const pressedStyle: ViewStyle = {
    opacity: 0.6,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  };

  return (
    <Pressable
      onPress={() => dispatch(steps, node)}
      style={({ pressed }) => [style as ViewStyle, pressed ? pressedStyle : null]}
    >
      {children}
    </Pressable>
  );
}
