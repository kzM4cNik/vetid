import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { easeIn, easeOut, RISE_IN, RISE_OUT } from '../motion';
import { colors, fonts } from '../theme';

export function SettingsSheet({
  open,
  turnstile,
  bottomInset,
  onToggle,
  onClose,
}: {
  open: boolean;
  turnstile: boolean;
  bottomInset: number;
  onToggle: () => void;
  onClose: () => void;
}) {
  const y = useSharedValue(720);
  const fade = useSharedValue(0);
  const knob = useSharedValue(turnstile ? 1 : 0);

  useEffect(() => {
    if (open) y.value = 720;
    y.value = withTiming(open ? 0 : 720, { duration: open ? RISE_IN : RISE_OUT, easing: open ? easeOut : easeIn });
    fade.value = withTiming(open ? 1 : 0, { duration: open ? 280 : 240, easing: open ? Easing.out(Easing.cubic) : easeIn });
  }, [open]);

  useEffect(() => {
    knob.value = withTiming(turnstile ? 1 : 0, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [turnstile]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: knob.value * 20 }] }));

  return (
    <View style={styles.backdrop} pointerEvents={open ? 'auto' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.dim, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.sheet, { paddingBottom: bottomInset + 18 }, sheetStyle]}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,11,22,0.92)' }]} />
        <View style={styles.handle} />
        <Text style={styles.title}>Настройки стойки</Text>
        <Text style={styles.lead}>Телефон на входе сам встречает пациента и зовёт следующего.</Text>

        <Pressable onPress={onToggle} style={[styles.row, turnstile && { borderColor: colors.primary }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Режим турникета</Text>
            <Text style={styles.rowText}>Камера снимает сама и после решения говорит: проходите, следующий.</Text>
          </View>
          <View style={[styles.switch, turnstile && { backgroundColor: colors.primary }]}>
            <Animated.View style={[styles.knob, knobStyle]} />
          </View>
        </Pressable>

        <Pressable onPress={onClose} style={styles.close}>
          <Ionicons name="checkmark" size={18} color="#03101C" />
          <Text style={styles.closeText}>Готово</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'flex-end' },
  dim: { backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 28,
    overflow: 'hidden',
    padding: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', marginBottom: 16 },
  title: { fontFamily: fonts.displayMedium, fontSize: 22, color: colors.text },
  lead: { marginTop: 8, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textDim },
  row: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  rowTitle: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.text },
  rowText: { marginTop: 4, fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textDim },
  switch: { width: 48, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.16)', padding: 3, justifyContent: 'center' },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#F4F7FF' },
  close: {
    marginTop: 16,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  closeText: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: '#03101C' },
});
