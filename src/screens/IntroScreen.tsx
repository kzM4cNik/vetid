import { useEffect } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aurora } from '../components/Aurora';
import { EngineBadge } from '../components/EngineBadge';
import { FaceRing } from '../components/FaceRing';
import { GlowButton } from '../components/GlowButton';
import { useVisionEngine } from '../ml/VisionEngine';
import { colors, fonts } from '../theme';

const FEATURES = [
  { icon: '🧠', title: 'Нейросеть на устройстве', text: 'COCO-SSD + MobileNet v2 работают прямо в iPhone' },
  { icon: '🔒', title: 'Без сервера', text: 'Фото не покидают телефон — 0 байт в интернет' },
  { icon: '⚡', title: 'Меньше секунды', text: 'Распознаёт кошек, собак и людей мгновенно' },
];

export function IntroScreen({ onStart }: { onStart: () => void }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const engine = useVisionEngine();
  const ringSize = Math.min(width * 0.62, 260);
  const progress = useSharedValue(0);
  const float = useSharedValue(0);
  const status = engine.status;
  const ready = status.state === 'ready';
  const failed = status.state === 'error';
  const loadProgress = status.state === 'loading' ? status.progress : ready ? 1 : 0;

  useEffect(() => {
    float.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);

  useEffect(() => {
    progress.value = withTiming(Math.max(0.06, loadProgress), { duration: 320, easing: Easing.out(Easing.cubic) });
  }, [loadProgress]);

  const pawStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 + float.value * 12 }, { scale: 0.96 + float.value * 0.08 }],
  }));

  const startLabel = failed
    ? 'Повторить загрузку'
    : ready
      ? 'Начать проверку'
      : status.state === 'loading' && status.stage === 'download'
        ? `Загрузка ${Math.round(status.progress * 100)}%`
        : 'Запуск нейросети…';

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <Aurora />

      <Animated.View entering={FadeInDown.duration(700)} style={styles.top}>
        <EngineBadge />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(900)} style={styles.logoWrap}>
        <View style={{ width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center' }}>
          <View style={StyleSheet.absoluteFill}>
            <FaceRing
              size={ringSize}
              innerRadius={ringSize / 2 - 46}
              color={failed ? colors.human : ready ? colors.granted : colors.primary}
              progress={progress}
              active={!ready}
            />
          </View>
          <Animated.Text style={[styles.paw, pawStyle]}>🐾</Animated.Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(250).duration(800)} style={{ alignItems: 'center' }}>
        <Text style={styles.brand}>
          Vet<Text style={{ color: colors.primary }}>ID</Text>
        </Text>
        <Text style={styles.tagline}>Биометрический пропуск{'\n'}ветеринарной клиники</Text>
      </Animated.View>

      <View style={styles.features}>
        {FEATURES.map((f, i) => (
          <Animated.View key={f.title} entering={FadeInDown.delay(400 + i * 120).duration(700)} style={styles.feature}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={FadeInDown.delay(800).duration(700)} style={styles.bottom}>
        <GlowButton
          label={startLabel}
          disabled={!ready && !failed}
          onPress={failed ? engine.reload : onStart}
          icon={<Text style={{ fontSize: 20 }}>{failed ? '↻' : ready ? '🛂' : '⏳'}</Text>}
        />
        <Text style={styles.footnote}>
          {failed
            ? 'Нужен интернет только на первый запуск — потом всё офлайн'
            : 'Только для пациентов с лапками 🐈 🐕'}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 22, justifyContent: 'space-between' },
  top: { alignItems: 'center' },
  logoWrap: { alignItems: 'center' },
  paw: { fontSize: 72 },
  brand: { fontFamily: fonts.display, fontSize: 52, color: colors.text, letterSpacing: 2, textShadowColor: colors.primary, textShadowRadius: 24 },
  tagline: { marginTop: 6, fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 22, textAlign: 'center', color: colors.textDim },
  features: { gap: 10 },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 20,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  featureIcon: { fontSize: 26 },
  featureTitle: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.text },
  featureText: { fontFamily: fonts.body, fontSize: 13, color: colors.textDim, marginTop: 2 },
  bottom: { gap: 12 },
  footnote: { textAlign: 'center', fontFamily: fonts.body, fontSize: 12.5, color: colors.textFaint },
});
