import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '../theme';

function Blob({ color, size, x, y, dx, dy, duration }: { color: string; size: number; x: number; y: number; dx: number; dy: number; duration: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x + dx * t.value }, { translateY: y + dy * t.value }, { scale: 1 + 0.15 * t.value }],
  }));
  const id = `g${color.replace('#', '')}`;
  return (
    <Animated.View style={[styles.blob, { width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={0.55} />
            <Stop offset="0.5" stopColor={color} stopOpacity={0.18} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={size} height={size} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

export function Aurora({ tint }: { tint?: string }) {
  const { width, height } = useWindowDimensions();
  const s = width * 1.3;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} pointerEvents="none">
      <Blob color={tint ?? colors.primaryDeep} size={s} x={-s * 0.45} y={-s * 0.35} dx={s * 0.2} dy={s * 0.15} duration={9000} />
      <Blob color={colors.cat} size={s * 0.9} x={width - s * 0.5} y={height * 0.25} dx={-s * 0.2} dy={s * 0.2} duration={11000} />
      <Blob color={tint ?? colors.primary} size={s} x={-s * 0.3} y={height - s * 0.55} dx={s * 0.25} dy={-s * 0.1} duration={13000} />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute', left: 0, top: 0 },
});
