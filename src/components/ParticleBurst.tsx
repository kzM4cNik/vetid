import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

type P = { emoji: string; angle: number; dist: number; rot: number; delay: number; size: number };

function Particle({ p, x, y }: { p: P; x: number; y: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(p.delay, withTiming(1, { duration: 1500, easing: Easing.out(Easing.cubic) }));
  }, []);
  const style = useAnimatedStyle(() => {
    const d = p.dist * t.value;
    const gravity = 260 * t.value * t.value;
    return {
      opacity: t.value < 0.7 ? 1 : 1 - (t.value - 0.7) / 0.3,
      transform: [
        { translateX: x + Math.cos(p.angle) * d - p.size / 2 },
        { translateY: y + Math.sin(p.angle) * d + gravity - p.size / 2 },
        { rotate: `${p.rot * t.value}deg` },
        { scale: 0.4 + Math.min(1, t.value * 4) * 0.8 },
      ],
    };
  });
  return <Animated.Text style={[styles.p, { fontSize: p.size }, style]}>{p.emoji}</Animated.Text>;
}

export function ParticleBurst({ emojis, x, y, count = 26 }: { emojis: string[]; x: number; y: number; count?: number }) {
  const particles = useMemo<P[]>(
    () =>
      Array.from({ length: emojis.length ? count : 0 }, (_, i) => ({
        emoji: emojis[i % emojis.length],
        angle: Math.random() * Math.PI * 2,
        dist: 120 + Math.random() * 180,
        rot: (Math.random() - 0.5) * 720,
        delay: Math.random() * 180,
        size: 18 + Math.random() * 18,
      })),
    [emojis, count]
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Particle key={i} p={p} x={x} y={y} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  p: { position: 'absolute', left: 0, top: 0 },
});