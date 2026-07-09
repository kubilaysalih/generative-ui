// A soft "loading" pulse laid OVER a region that is being partially
// regenerated. The region's real content stays underneath, so nothing
// disappears — only that a fresh version is loading is signalled.
//
// A round glow breathes in the CENTER of the area and falls off SMOOTHLY to
// FULLY transparent. It lives in a box that is SMALLER than the region (~75%,
// centered) and the radial reaches zero opacity right at that box's edge — so
// the fade always finishes with margin to spare and never touches (or gets
// clipped by) the region's edges. No measuring, no rectangular veil, no cut.
// Only the wrapper's opacity animates.
//
// react-native-svg ships inside Expo Go, so this needs only a JS reload.

import React, { useEffect, useId } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../theme';

export function Shimmer() {
  const { colors, scheme } = useTheme();
  const pulse = useSharedValue(0);

  // Unique gradient id per instance (several regions can load at once; a shared
  // id would let them reference the wrong gradient). Colons from useId aren't
  // valid inside url(#id), so strip them.
  const gid = 'glow' + useId().replace(/:/g, '');

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 850, easing: Easing.inOut(Easing.ease) }),
      -1,
      true, // reverse — breathe in and out
    );
  }, [pulse]);

  const isDark = scheme === 'dark';

  // The whole glow breathes between a dim floor and a soft peak. Dark theme is
  // kept more transparent so it stays subtle over dark surfaces.
  const floor = isDark ? 0.05 : 0.15;
  const peak = isDark ? 0.22 : 0.5;
  const glow = useAnimatedStyle(() => ({
    opacity: floor + pulse.value * (peak - floor),
  }));

  // Theme-aware NEUTRAL: a muted grey from the palette (light-grey on dark,
  // mid-grey on light) — reads as a soft loading highlight in both themes, not a
  // brand-coloured or hard-white blob. Edge is transparent (gradient stops).
  const core = colors.textMuted;

  return (
    // Outer view owns the mount/unmount FADE (layout entering/exiting) so the
    // glow eases in and out instead of snapping. It's kept separate from the
    // breathing pulse below because that pulse drives opacity every frame via
    // useAnimatedStyle, which would otherwise override a fade on the same view.
    // The two opacities multiply, composing cleanly.
    <Animated.View
      pointerEvents="none"
      entering={FadeIn.duration(240)}
      exiting={FadeOut.duration(280)}
      style={[StyleSheet.absoluteFill, styles.center]}
    >
      {/* Inner view: the breathing pulse (opacity floor..peak). */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, glow]}>
        {/* Glow box: smaller than the region, so its transparent edge sits well
            inside the region — the fade never reaches the region's bounds. */}
        <Animated.View style={styles.box}>
          <Svg width="100%" height="100%">
          <Defs>
            {/* r=50% (default objectBoundingBox): reaches zero opacity exactly at
                THIS box's edge, which is already inset from the region. Soft,
                multi-stop falloff so there's no defined circle edge — a diffuse
                haze that fades out gradually rather than a crisp disc. */}
            <RadialGradient id={gid} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={core} stopOpacity={1} />
              <Stop offset="35%" stopColor={core} stopOpacity={0.7} />
              <Stop offset="65%" stopColor={core} stopOpacity={0.3} />
              <Stop offset="100%" stopColor={core} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gid})`} />
          </Svg>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  box: { width: '88%', height: '88%' },
});
