import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useVisionEngine } from '../ml/VisionEngine';
import { play } from '../sound';
import { colors, fonts } from '../theme';

export function EngineBadge() {
  const { status } = useVisionEngine();
  const blink = useSharedValue(0);
  const announced = useRef(false);

  useEffect(() => {
    blink.value = withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);

  useEffect(() => {
    if (status.state === 'ready' && !announced.current) {
      announced.current = true;
      play('ready', 0.5);
    }
  }, [status.state]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: status.state === 'ready' ? 1 : 0.3 + blink.value * 0.7 }));

  const color = status.state === 'ready' ? colors.granted : status.state === 'error' ? colors.human : colors.dog;
  const text =
    status.state === 'ready'
      ? 'Нейросеть готова · офлайн'
      : status.state === 'error'
        ? 'Ошибка нейросети'
        : status.stage === 'download'
          ? `Загрузка нейросети · ${Math.round(status.progress * 100)}%`
          : 'Запуск нейросети…';

  return (
    <View style={[styles.pill, { borderColor: color + '55' }]}>
      <Animated.View style={[styles.dot, { backgroundColor: color, shadowColor: color }, dotStyle]} />
      <Text style={[styles.text, { color }]}>{text}</Text>
      {status.state === 'loading' && status.stage === 'download' && (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(status.progress * 100)}%`, backgroundColor: color }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(5,7,15,0.55)',
  },
  dot: { width: 8, height: 8, borderRadius: 4, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  text: { fontFamily: fonts.bodyHeavy, fontSize: 12.5, letterSpacing: 0.3 },
  track: { width: 46, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  fill: { height: 4 },
});
