import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { tap } from '../sound';
import { colors, fonts } from '../theme';

type Props = {
  label?: string;
  icon?: ReactNode;
  onPress: () => void;
  colorsFrom?: [string, string];
  disabled?: boolean;
  style?: ViewStyle;
  variant?: 'solid' | 'glass';
  size?: number;
  round?: boolean;
};

export function GlowButton({
  label,
  icon,
  onPress,
  colorsFrom = [colors.primary, colors.primaryDeep],
  disabled,
  style,
  variant = 'solid',
  size = 58,
  round,
}: Props) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[anim, style, disabled && { opacity: 0.45 }]}>
      <Pressable
        disabled={disabled}
        onPressIn={() => {
          scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
          tap();
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 10, stiffness: 300 });
        }}
        onPress={onPress}
        style={[
          styles.base,
          { height: size, borderRadius: round ? size / 2 : 20 },
          round && { width: size },
          variant === 'solid' && { shadowColor: colorsFrom[0] },
          variant === 'solid' ? styles.solidShadow : styles.glass,
        ]}
      >
        {variant === 'solid' && (
          <LinearGradient
            colors={colorsFrom}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: round ? size / 2 : 20 }]}
          />
        )}
        <View style={styles.row}>
          {icon}
          {label ? (
            <Text style={[styles.label, variant === 'solid' ? { color: '#03101C' } : { color: colors.text }]}>{label}</Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, overflow: 'visible' },
  solidShadow: { shadowOpacity: 0.7, shadowRadius: 22, shadowOffset: { width: 0, height: 6 } },
  glass: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: colors.glassBorder },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontFamily: fonts.bodyHeavy, fontSize: 17, letterSpacing: 0.3 },
});
