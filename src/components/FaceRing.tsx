import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';

const AnimatedLine = Animated.createAnimatedComponent(Line);

const TICKS = 72;

type Props = {
  size: number;
  innerRadius: number;
  color: string;
  progress: SharedValue<number>;
  active?: boolean;
};

const Tick = memo(function Tick({
  i,
  c,
  r1,
  r2,
  color,
  progress,
  sweep,
}: {
  i: number;
  c: number;
  r1: number;
  r2: number;
  color: string;
  progress: SharedValue<number>;
  sweep: SharedValue<number>;
}) {
  const a = (i / TICKS) * Math.PI * 2 - Math.PI / 2;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const p = i / TICKS;

  const animatedProps = useAnimatedProps(() => {
    const lit = progress.value > p;
    let d = sweep.value - p;
    d = d - Math.floor(d);
    const comet = Math.pow(1 - d, 14);
    const grow = lit ? 1 : 0;
    return {
      strokeOpacity: lit ? 1 : 0.14 + 0.75 * comet,
      x2: c + (r2 + grow * 6) * cos,
      y2: c + (r2 + grow * 6) * sin,
    };
  });

  return (
    <AnimatedLine
      x1={c + r1 * cos}
      y1={c + r1 * sin}
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      animatedProps={animatedProps}
    />
  );
});

export function FaceRing({ size, innerRadius, color, progress, active = true }: Props) {
  const sweep = useSharedValue(0);
  const spin = useSharedValue(0);
  const c = size / 2;
  const r1 = innerRadius + 10;
  const r2 = innerRadius + 20;

  useEffect(() => {
    sweep.value = 0;
    sweep.value = withRepeat(withTiming(1, { duration: active ? 1600 : 3200, easing: Easing.linear }), -1);
  }, [active]);

  useEffect(() => {
    spin.value = withRepeat(withTiming(360, { duration: 14000, easing: Easing.linear }), -1);
  }, []);

  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  const spinBackStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${-spin.value * 1.6}deg` }] }));

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, spinStyle]}>
        <Svg width={size} height={size}>
          <Circle
            cx={c}
            cy={c}
            r={r2 + 16}
            stroke={color}
            strokeOpacity={0.5}
            strokeWidth={1.5}
            fill="none"
            strokeDasharray={`${size * 0.5} ${size * 0.3} 6 ${size * 0.2}`}
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, spinBackStyle]}>
        <Svg width={size} height={size}>
          <Circle
            cx={c}
            cy={c}
            r={r2 + 24}
            stroke={color}
            strokeOpacity={0.22}
            strokeWidth={1}
            fill="none"
            strokeDasharray="2 10"
          />
        </Svg>
      </Animated.View>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={c} cy={c} r={innerRadius + 2} stroke={color} strokeOpacity={0.35} strokeWidth={1.5} fill="none" />
        {Array.from({ length: TICKS }, (_, i) => (
          <Tick key={i} i={i} c={c} r1={r1} r2={r2} color={color} progress={progress} sweep={sweep} />
        ))}
      </Svg>
    </View>
  );
}
