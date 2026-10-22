import { BlurView } from 'expo-blur';
import { useEffect, useRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { easeIn, easeOut, RISE_IN, RISE_OUT } from '../motion';
import type { ClassifyResult } from '../ml/types';
import { colors, fonts } from '../theme';
import type { Ticket } from '../tickets';
import type { VerdictInfo } from '../verdicts';
import { GlowButton } from './GlowButton';

export type Shot = { uri: string; width: number; height: number; mirrored?: boolean };

const LABELS: Record<string, string> = { person: 'человек', cat: 'кошка', dog: 'собака', other: 'животное' };
const BOX_COLORS: Record<string, string> = { person: colors.human, cat: colors.cat, dog: colors.dog, other: colors.other };

function Bar({ label, value, color, delay }: { label: string; value: number; color: string; delay: number }) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withDelay(delay, withTiming(value, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [value]);
  const style = useAnimatedStyle(() => ({ width: `${Math.max(2, w.value * 100)}%` }));
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { backgroundColor: color, shadowColor: color }, style]} />
      </View>
      <Text style={[styles.barValue, { color }]}>{Math.round(value * 100)}%</Text>
    </View>
  );
}

function Photo({ shot, result, maxW }: { shot: Shot; result: ClassifyResult; maxW: number }) {
  const maxH = 170;
  let w = maxW;
  let h = (maxW * shot.height) / shot.width;
  if (h > maxH) {
    h = maxH;
    w = (maxH * shot.width) / shot.height;
  }
  return (
    <View style={[styles.photo, { width: w, height: h }]}>
      <Image source={{ uri: shot.uri }} style={StyleSheet.absoluteFill} />
      {result.detections.map((d, i) => {
        const c = BOX_COLORS[d.label];
        return (
          <View
            key={i}
            style={[
              styles.box,
              {
                borderColor: c,
                left: Math.max(0, d.box[0]) * w,
                top: Math.max(0, d.box[1]) * h,
                width: Math.min(1, d.box[2]) * w,
                height: Math.min(1, d.box[3]) * h,
              },
            ]}
          >
            <Text style={[styles.boxTag, { backgroundColor: c }]}>
              {LABELS[d.label]} {Math.round(d.score * 100)}%
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function ResultSheet({
  result,
  info,
  shot,
  ticket,
  turnstile,
  width,
  bottomInset,
  onAgain,
}: {
  result: ClassifyResult;
  info: VerdictInfo;
  shot: Shot;
  ticket: Ticket | null;
  turnstile: boolean;
  width: number;
  bottomInset: number;
  onAgain: () => void;
}) {
  const y = useSharedValue(760);
  const badge = useSharedValue(0);
  const pulse = useSharedValue(0);
  const closing = useRef(false);

  useEffect(() => {
    y.value = withTiming(0, { duration: RISE_IN, easing: easeOut });
    badge.value = withDelay(140, withTiming(1, { duration: 420, easing: easeOut }));
    pulse.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);

  function dismiss() {
    if (closing.current) return;
    closing.current = true;
    y.value = withTiming(760, { duration: RISE_OUT, easing: easeIn }, (finished) => {
      if (finished) runOnJS(onAgain)();
    });
  }

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badge.value,
    transform: [{ translateY: (1 - badge.value) * 16 }],
  }));
  const statusStyle = useAnimatedStyle(() => ({ opacity: 0.75 + pulse.value * 0.25 }));

  const statusColor = info.allowed ? colors.granted : result.verdict === 'human' ? colors.human : colors.unknown;
  const subtitle = result.withHuman ? 'Пациент пришёл с хозяином — проходите вместе!' : info.message;
  const inner = width - 40 - 36;

  return (
    <Animated.View style={[styles.wrap, { paddingBottom: bottomInset + 14 }, sheetStyle]}>
      <View style={[styles.card, { borderColor: info.color + '66', shadowColor: info.color }]}>
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,11,22,0.72)' }]} />

        <View style={styles.header}>
          <Animated.View style={[styles.badge, { backgroundColor: info.color + '22', borderColor: info.color }, badgeStyle]}>
            <Text style={styles.badgeEmoji}>{info.emoji}</Text>
          </Animated.View>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>РЕЗУЛЬТАТ БИОМЕТРИИ</Text>
            <Text style={[styles.title, { color: info.color }]} numberOfLines={1} adjustsFontSizeToFit>
              {info.title}
            </Text>
            {result.breed ? (
              <Text style={styles.breed} numberOfLines={1}>
                {result.verdict === 'other' ? 'Вид' : 'Порода'} · {result.breed.name}
              </Text>
            ) : null}
          </View>
        </View>

        <Animated.View style={[styles.status, { backgroundColor: statusColor + '1F', borderColor: statusColor + '88' }, statusStyle]}>
          <View style={[styles.dot, { backgroundColor: statusColor, shadowColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{info.status}</Text>
        </Animated.View>

        {ticket ? (
          <View style={[styles.ticket, { borderColor: info.color + '88' }]}>
            <Text style={[styles.ticketCode, { color: info.color }]}>{ticket.code}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.ticketRoom}>{ticket.room}</Text>
              <Text style={styles.ticketHint}>талон пациента, только на этом телефоне</Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.message}>{subtitle}</Text>

        <View style={styles.photoRow}>
          <Photo shot={shot} result={result} maxW={inner} />
        </View>

        <Bar label="Кошка" value={result.scores.cat} color={colors.cat} delay={300} />
        <Bar label="Собака" value={result.scores.dog} color={colors.dog} delay={400} />
        <Bar label="Человек" value={result.scores.human} color={colors.human} delay={500} />

        <Text style={styles.meta}>
          ⚡ {result.ms} мс · обработано на устройстве · 0 байт отправлено на сервер
        </Text>

        <GlowButton
          label={turnstile ? 'Следующий' : 'Новое сканирование'}
          onPress={dismiss}
          colorsFrom={[info.color, info.allowed ? colors.primaryDeep : '#7A1230']}
          style={{ marginTop: 14 }}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20 },
  card: {
    borderRadius: 30,
    padding: 18,
    overflow: 'hidden',
    borderWidth: 1,
    shadowOpacity: 0.6,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  badge: { width: 64, height: 64, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  badgeEmoji: { fontSize: 36 },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 2, color: colors.textFaint },
  title: { fontFamily: fonts.display, fontSize: 30, letterSpacing: 1 },
  breed: { marginTop: 2, fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  ticket: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  ticketCode: { fontFamily: fonts.display, fontSize: 26, letterSpacing: 1 },
  ticketRoom: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.text },
  ticketHint: { marginTop: 1, fontFamily: fonts.body, fontSize: 11, color: colors.textFaint },
  status: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 4, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  statusText: { fontFamily: fonts.displayMedium, fontSize: 12, letterSpacing: 1.5 },
  message: { marginTop: 10, fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.textDim },
  photoRow: { alignItems: 'center', marginVertical: 14 },
  photo: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#000' },
  box: { position: 'absolute', borderWidth: 2, borderRadius: 8 },
  boxTag: {
    position: 'absolute',
    left: -2,
    top: -2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderTopLeftRadius: 8,
    borderBottomRightRadius: 8,
    overflow: 'hidden',
    fontFamily: fonts.bodyHeavy,
    fontSize: 10,
    color: '#05070F',
  },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 7 },
  barLabel: { width: 66, fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textDim },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  barValue: { width: 42, textAlign: 'right', fontFamily: fonts.bodyHeavy, fontSize: 13 },
  meta: { marginTop: 12, fontFamily: fonts.body, fontSize: 11.5, color: colors.textFaint, textAlign: 'center' },
});
