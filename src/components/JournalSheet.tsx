import { useEffect } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { Verdict } from '../ml/types';
import { easeIn, easeOut, RISE_IN, RISE_OUT } from '../motion';
import { colors, fonts } from '../theme';
import { VERDICTS } from '../verdicts';

export type Visit = {
  id: number;
  at: number;
  verdict: Verdict;
  breed: string | null;
  ticket: string | null;
  room: string | null;
  uri: string | null;
};

function timeLabel(at: number) {
  return new Date(at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function JournalSheet({
  open,
  visits,
  top,
  bottom,
  onClear,
}: {
  open: boolean;
  visits: Visit[];
  top: number;
  bottom: number;
  onClear: () => void;
}) {
  const y = useSharedValue(1400);
  const allowed = visits.filter((v) => VERDICTS[v.verdict].allowed).length;
  const denied = visits.length - allowed;

  useEffect(() => {
    if (open) y.value = 1400;
    y.value = withTiming(open ? 0 : 1400, { duration: open ? RISE_IN : RISE_OUT, easing: open ? easeOut : easeIn });
  }, [open]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <Animated.View pointerEvents={open ? 'auto' : 'none'} style={[styles.sheet, { top, bottom }, sheetStyle]}>
      <Text style={styles.kicker}>СМЕНА</Text>
      <Text style={styles.title}>Журнал стойки</Text>
      <View style={styles.summary}>
        <Text style={styles.summaryText}>{visits.length} проверок</Text>
        <Text style={[styles.summaryText, { color: colors.granted }]}>{allowed} пустили</Text>
        <Text style={[styles.summaryText, { color: colors.human }]}>{denied} отказ</Text>
      </View>

      {visits.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Пока никого</Text>
          <Text style={styles.emptyText}>Каждая проверка появится здесь: время, порода и талон. Сервер для этого не нужен.</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
          {visits.map((visit, index) => {
            const info = VERDICTS[visit.verdict];
            return (
              <View key={visit.id} style={styles.row}>
                {visit.uri ? (
                  <Image source={{ uri: visit.uri }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbFallback]}>
                    <Text style={{ fontSize: 22 }}>{info.emoji}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: info.color }]}>{info.title}</Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {visit.breed ? visit.breed : info.status}
                    {visit.ticket ? `  ·  ${visit.ticket}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.time}>{timeLabel(visit.at)}</Text>
                  <Text style={styles.index}>{String(visits.length - index).padStart(2, '0')}</Text>
                </View>
              </View>
            );
          })}
          <Pressable onPress={onClear} style={styles.clear}>
            <Text style={styles.clearText}>Очистить смену</Text>
          </Pressable>
        </ScrollView>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 28,
    backgroundColor: 'rgba(8,11,22,0.94)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: 16,
    paddingTop: 18,
    overflow: 'hidden',
  },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 2, color: colors.textFaint },
  title: { marginTop: 4, fontFamily: fonts.display, fontSize: 28, color: colors.text },
  summary: { flexDirection: 'row', gap: 14, marginTop: 10, marginBottom: 14 },
  summaryText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textDim },
  empty: { flex: 1, justifyContent: 'center', paddingHorizontal: 12, paddingBottom: 40 },
  emptyTitle: { fontFamily: fonts.displayMedium, fontSize: 22, color: colors.text },
  emptyText: { marginTop: 8, fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.textDim },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  thumb: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#111' },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.bodyHeavy, fontSize: 15 },
  rowMeta: { marginTop: 2, fontFamily: fonts.body, fontSize: 13, color: colors.textDim },
  time: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  index: { marginTop: 2, fontFamily: fonts.body, fontSize: 11, color: colors.textFaint },
  clear: { alignSelf: 'center', marginTop: 16, paddingVertical: 10, paddingHorizontal: 14 },
  clearText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textFaint },
});
