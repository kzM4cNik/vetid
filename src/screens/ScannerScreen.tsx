import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Mask, Rect } from 'react-native-svg';
import { prepareCameraShot, prepareLibraryImage, type Prepared } from '../capture';
import { Aurora } from '../components/Aurora';
import { EngineBadge } from '../components/EngineBadge';
import { FaceRing } from '../components/FaceRing';
import { GlowButton } from '../components/GlowButton';
import { JournalSheet, type Visit } from '../components/JournalSheet';
import { ResultSheet, type Shot } from '../components/ResultSheet';
import { SettingsSheet } from '../components/SettingsSheet';
import type { ClassifyResult } from '../ml/types';
import { useVisionEngine } from '../ml/VisionEngine';
import { hush, play, say, stop, tap } from '../sound';
import { issueTicket, type Ticket } from '../tickets';
import { colors, fonts } from '../theme';
import { VERDICTS } from '../verdicts';

type Phase = 'idle' | 'scanning' | 'result';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function ScanLine({ r }: { r: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -20 + t.value * (r * 2) }] }));
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, height: 40 }, style]}>
      <LinearGradient
        colors={['transparent', colors.primary + 'AA', 'transparent']}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ position: 'absolute', top: 19, left: 0, right: 0, height: 2, backgroundColor: colors.primary }} />
    </Animated.View>
  );
}

export function ScannerScreen() {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const engine = useVisionEngine();
  const [permission, requestPermission] = useCameraPermissions();
  const camRef = useRef<CameraView>(null);

  const [facing, setFacing] = useState<CameraType>('back');
  const [phase, setPhase] = useState<Phase>('idle');
  const [shot, setShot] = useState<Shot | null>(null);
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ allowed: 0, denied: 0 });
  const [visits, setVisits] = useState<Visit[]>([]);
  const [tab, setTab] = useState<'scan' | 'journal'>('scan');
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [turnstile, setTurnstile] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const r = Math.min(W * 0.36, 160);
  const cx = W / 2;
  const cy = Math.max(insets.top + 130 + r, H * 0.42);
  const ringSize = r * 2 + 90;

  const progress = useSharedValue(0);
  const dim = useSharedValue(0);
  const ringT = useSharedValue(0);
  const flash = useSharedValue(0);
  const breathe = useSharedValue(0);

  useEffect(() => {
    breathe.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);

  const resultScale = 0.42;
  const resultCy = insets.top + 54 + r * resultScale;

  const ringStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: (resultCy - cy) * ringT.value },
      { scale: 1 - (1 - resultScale) * ringT.value },
    ],
  }));
  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.value }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const scanBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breathe.value * 0.05 }], opacity: 0.35 + breathe.value * 0.4 }));

  const info = result ? VERDICTS[result.verdict] : null;
  const ringColor = phase === 'result' && info ? info.color : colors.primary;

  async function analyze(prepared: Prepared, mirrored: boolean) {
    setShot({ uri: prepared.uri, width: prepared.width, height: prepared.height, mirrored });
    const [res] = await Promise.all([engine.classify(prepared.base64), wait(1500)]);
    const v = VERDICTS[res.verdict];
    stop('scan');
    setResult(res);
    setPhase('result');
    progress.value = withTiming(1.01, { duration: 200 });
    ringT.value = withSpring(1, { damping: 18, stiffness: 120 });
    dim.value = withTiming(1, { duration: 400 });

    const pass = v.allowed ? issueTicket(res.verdict) : null;
    setTicket(pass);
    play(v.sound);
    setVisits((items) =>
      [
        {
          id: Date.now(),
          at: Date.now(),
          verdict: res.verdict,
          breed: res.breed?.name ?? null,
          ticket: pass?.code ?? null,
          room: pass?.room ?? null,
          uri: prepared.uri,
        },
        ...items,
      ].slice(0, 40)
    );
    if (v.allowed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setStats((s) => ({ ...s, allowed: s.allowed + 1 }));
    } else if (res.verdict === 'human') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      flash.value = withSequence(
        withTiming(0.55, { duration: 90 }),
        withTiming(0, { duration: 220 }),
        withTiming(0.45, { duration: 90 }),
        withTiming(0, { duration: 260 }),
        withTiming(0.3, { duration: 90 }),
        withTiming(0, { duration: 400 })
      );
      setStats((s) => ({ ...s, denied: s.denied + 1 }));
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
    if (v.allowed) {
      const line = [
        res.breed ? res.breed.name.charAt(0).toUpperCase() + res.breed.name.slice(1) : null,
        pass ? `Талон ${pass.code}, ${pass.room}` : null,
        'Проходите',
        turnstile ? 'Следующий' : null,
      ]
        .filter(Boolean)
        .join('. ');
      say(`${line}.`, 900);
    } else if (v.speech) {
      say(turnstile ? `${v.speech} Следующий.` : v.speech, 750);
    } else if (turnstile) {
      say('Не удалось распознать. Следующий.', 500);
    }
  }

  function beginScan() {
    setError(null);
    setPhase('scanning');
    play('scan', 0.7);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    progress.value = 0;
    progress.value = withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) });
  }

  function fail(e: unknown) {
    stop('scan');
    setPhase('idle');
    setShot(null);
    progress.value = withTiming(0, { duration: 300 });
    setError(e instanceof Error ? e.message : String(e));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  }

  function guardReady() {
    if (engine.status.state === 'ready') return true;
    setError(engine.status.state === 'error' ? 'Нейросеть не запустилась. Проверьте интернет при первом запуске.' : 'Нейросеть ещё загружается, подождите пару секунд…');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    return false;
  }

  async function scanCamera() {
    if (phase !== 'idle' || !guardReady()) return;
    beginScan();
    try {
      const photo = await camRef.current?.takePictureAsync({ quality: 0.7, shutterSound: false });
      if (!photo) throw new Error('Камера не готова');
      const prepared = await prepareCameraShot(photo, { width: W, height: H, cx, cy, r });
      await analyze(prepared, facing === 'front');
    } catch (e) {
      fail(e);
    }
  }

  async function scanLibrary() {
    if (phase !== 'idle' || !guardReady()) return;
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (picked.canceled || !picked.assets?.[0]) return;
      beginScan();
      const prepared = await prepareLibraryImage(picked.assets[0]);
      await analyze(prepared, false);
    } catch (e) {
      fail(e);
    }
  }

  function reset() {
    hush();
    setPhase('idle');
    setResult(null);
    setShot(null);
    setTicket(null);
    progress.value = withTiming(0, { duration: 350 });
    ringT.value = withSpring(0, { damping: 18, stiffness: 120 });
    dim.value = withTiming(0, { duration: 350 });
  }

  const cameraAllowed = permission?.granted;
  const scanRef = useRef(scanCamera);
  const resetRef = useRef(reset);
  useEffect(() => {
    scanRef.current = scanCamera;
    resetRef.current = reset;
  });

  useEffect(() => {
    if (!turnstile || settingsOpen || tab !== 'scan' || phase !== 'idle' || !cameraAllowed || engine.status.state !== 'ready') return;
    const timer = setTimeout(() => scanRef.current(), 1600);
    return () => clearTimeout(timer);
  }, [turnstile, settingsOpen, tab, phase, cameraAllowed, engine.status.state]);

  useEffect(() => {
    if (!turnstile || settingsOpen || phase !== 'result') return;
    const verdict = result?.verdict;
    const waitMs = verdict === 'human' ? 12000 : verdict === 'unknown' ? 4500 : 7000;
    const timer = setTimeout(() => resetRef.current(), waitMs);
    return () => clearTimeout(timer);
  }, [turnstile, settingsOpen, phase, result?.verdict]);

  return (
    <View style={styles.root}>
      {cameraAllowed ? (
        <CameraView ref={camRef} style={StyleSheet.absoluteFill} facing={facing} animateShutter={false} />
      ) : (
        <Aurora />
      )}

      <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <Mask id="hole">
            <Rect width={W} height={H} fill="white" />
            <Circle cx={cx} cy={cy} r={r} fill="black" />
          </Mask>
        </Defs>
        <Rect width={W} height={H} fill="rgba(4,6,14,0.84)" mask="url(#hole)" />
      </Svg>

      <Animated.View style={[StyleSheet.absoluteFill, dimStyle]} pointerEvents="none">
        <Aurora tint={info?.color} />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', left: cx - ringSize / 2, top: cy - ringSize / 2, width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center' },
          ringStyle,
        ]}
      >
        {shot && (
          <View style={{ width: r * 2, height: r * 2, borderRadius: r, overflow: 'hidden', position: 'absolute' }}>
            <Image
              source={{ uri: shot.uri }}
              style={[StyleSheet.absoluteFill, shot.mirrored && { transform: [{ scaleX: -1 }] }]}
              resizeMode="cover"
            />
            {phase === 'scanning' && <ScanLine r={r} />}
          </View>
        )}
        {!shot && !cameraAllowed && (
          <View style={{ position: 'absolute', alignItems: 'center' }}>
            <Text style={{ fontSize: 64 }}>📷</Text>
          </View>
        )}
        <FaceRing size={ringSize} innerRadius={r} color={ringColor} progress={progress} active={phase === 'scanning'} />
        {phase === 'result' && info && (
          <Animated.Text entering={FadeIn.delay(200)} style={styles.ringEmoji}>
            {info.emoji}
          </Animated.Text>
        )}
      </Animated.View>

      <View style={[styles.topBar, { top: insets.top + 8 }]} pointerEvents="box-none">
        <View style={styles.brandRow}>
          <Text style={styles.logo}>
            Vet<Text style={{ color: colors.primary }}>ID</Text>
          </Text>
          {turnstile && phase !== 'result' ? <Text style={styles.modePill}>ТУРНИКЕТ</Text> : null}
        </View>
        <View style={styles.stats}>
          <Pressable
            onPress={() => {
              tap();
              setSettingsOpen(true);
            }}
            style={styles.gear}
          >
            <Ionicons name="settings-sharp" size={16} color={colors.text} />
          </Pressable>
          <View style={styles.stat}>
            <Ionicons name="checkmark-circle" size={15} color={colors.granted} />
            <Text style={[styles.statText, { color: colors.granted }]}>{stats.allowed}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="close-circle" size={15} color={colors.human} />
            <Text style={[styles.statText, { color: colors.human }]}>{stats.denied}</Text>
          </View>
        </View>
      </View>

      {phase !== 'result' && tab === 'scan' && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={[styles.badgeRow, { top: insets.top + 56 }]}>
          <EngineBadge />
        </Animated.View>
      )}

      {phase !== 'result' && tab === 'scan' && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={[styles.hint, { top: cy + r + 52 }]}>
          <Text style={styles.hintTitle}>
            {phase === 'scanning' ? 'Анализ биометрии…' : turnstile ? 'Турникет ждёт пациента' : 'Наведите камеру на пациента'}
          </Text>
          <Text style={styles.hintSub}>
            {phase === 'scanning'
              ? 'Нейросеть ищет кошек, собак и людей'
              : turnstile
                ? 'Подойдите к камере. Кнопка не нужна'
                : cameraAllowed
                  ? 'Покажите фото кошки, собаки или человека'
                  : 'Выберите фото из галереи'}
          </Text>
          {error && <Text style={styles.error}>{error}</Text>}
        </Animated.View>
      )}

      {phase === 'idle' && tab === 'scan' && (
        <Animated.View entering={FadeIn.delay(80)} exiting={FadeOut.duration(220)} style={[styles.controls, { bottom: insets.bottom + 78 }]}>
          <GlowButton
            variant="glass"
            round
            size={58}
            onPress={scanLibrary}
            icon={<Ionicons name="images" size={24} color={colors.text} />}
          />

          {cameraAllowed ? (
            <Pressable
              onPressIn={tap}
              onPress={scanCamera}
              style={({ pressed }) => [styles.scanBtn, pressed && { transform: [{ scale: 0.93 }] }]}
            >
              <Animated.View style={[styles.scanHalo, scanBtnStyle]} />
              <LinearGradient colors={[colors.primary, colors.primaryDeep]} style={styles.scanInner}>
                <Ionicons name="scan" size={34} color="#03101C" />
              </LinearGradient>
            </Pressable>
          ) : (
            <GlowButton label="Включить камеру" onPress={requestPermission} />
          )}

          <GlowButton
            variant="glass"
            round
            size={58}
            disabled={!cameraAllowed}
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            icon={<Ionicons name="camera-reverse" size={26} color={colors.text} />}
          />
        </Animated.View>
      )}

      {phase === 'result' && result && info && shot && (
        <ResultSheet
          result={result}
          info={info}
          shot={shot}
          ticket={ticket}
          turnstile={turnstile}
          width={W}
          bottomInset={insets.bottom}
          onAgain={reset}
        />
      )}

      {phase === 'idle' && (
        <View style={[styles.tabs, { bottom: insets.bottom + 8 }]}>
          {(['scan', 'journal'] as const).map((key) => {
            const active = tab === key;
            return (
              <Pressable
                key={key}
                onPress={() => {
                  if (key === tab) return;
                  tap();
                  setTab(key);
                }}
                style={styles.tab}
              >
                <Text style={[styles.tabText, active && { color: colors.text }]}>{key === 'scan' ? 'Скан' : 'Журнал'}</Text>
                {key === 'journal' && visits.length > 0 ? <Text style={styles.tabCount}>{visits.length}</Text> : null}
                <View style={[styles.tabLine, { backgroundColor: active ? colors.primary : 'transparent' }]} />
              </Pressable>
            );
          })}
        </View>
      )}

      <JournalSheet
        open={tab === 'journal' && phase === 'idle'}
        visits={visits}
        top={insets.top + 58}
        bottom={insets.bottom + 72}
        onClear={() => setVisits([])}
      />

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.human }, flashStyle]} />

      <SettingsSheet
        open={settingsOpen}
        turnstile={turnstile}
        bottomInset={insets.bottom}
        onToggle={() => setTurnstile((on) => !on)}
        onClose={() => setSettingsOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { fontFamily: fonts.display, fontSize: 24, color: colors.text, letterSpacing: 1 },
  modePill: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 10,
    letterSpacing: 1,
    color: '#03101C',
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  gear: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5,7,15,0.6)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  stats: { flexDirection: 'row', gap: 8 },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(5,7,15,0.6)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  statText: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  badgeRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 10 },
  tabs: {
    position: 'absolute',
    left: 28,
    right: 28,
    height: 52,
    borderRadius: 18,
    flexDirection: 'row',
    backgroundColor: 'rgba(5,7,15,0.72)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  tabText: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.textFaint },
  tabCount: { position: 'absolute', top: 8, right: 22, fontFamily: fonts.bodyHeavy, fontSize: 11, color: colors.primary },
  tabLine: { width: 22, height: 2, borderRadius: 1 },
  hint: { position: 'absolute', left: 24, right: 24, alignItems: 'center' },
  hintTitle: { fontFamily: fonts.displayMedium, fontSize: 17, color: colors.text, textAlign: 'center' },
  hintSub: { marginTop: 6, fontFamily: fonts.body, fontSize: 14, color: colors.textDim, textAlign: 'center' },
  error: { marginTop: 10, fontFamily: fonts.bodyBold, fontSize: 13, color: colors.dog, textAlign: 'center' },
  controls: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' },
  scanBtn: { width: 92, height: 92, alignItems: 'center', justifyContent: 'center' },
  scanHalo: { position: 'absolute', width: 92, height: 92, borderRadius: 46, borderWidth: 2, borderColor: colors.primary },
  scanInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.8,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  ringEmoji: { position: 'absolute', bottom: 0, right: 18, fontSize: 64 },
});
