// Placeholder shown in a slot whose referenced line hasn't streamed in yet.
// This is what produces the "top-down fill" UX: root lays out N skeleton slots,
// then each subsequent line replaces one skeleton with real content.

import React, { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { radius, space, useTheme } from '../theme';

export function Skeleton({
  height = 56,
  width,
}: {
  height?: number;
  width?: DimensionValue;
}) {
  const { colors } = useTheme();
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    // Infinite yoyo between 0.4 and 1.
    pulse.value = withRepeat(withTiming(1, { duration: 650 }), -1, true);
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[
        {
          backgroundColor: colors.skeleton,
          borderRadius: radius.md,
          height,
          width,
        },
        animatedStyle,
      ]}
    />
  );
}

/**
 * Placeholder for a not-yet-streamed PhotoCard in a Carousel: two parts — the
 * image block on top and a shorter caption bar below — mirroring the real card.
 */
export function PhotoCardSkeleton() {
  return (
    <View style={styles.photoCard}>
      <Skeleton width={220} height={165} />
      <Skeleton width={140} height={16} />
    </View>
  );
}

const styles = StyleSheet.create({
  photoCard: { width: 220, gap: space.sm },
});
