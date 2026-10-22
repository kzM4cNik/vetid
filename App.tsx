import { Manrope_500Medium, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { Unbounded_600SemiBold, Unbounded_800ExtraBold } from '@expo-google-fonts/unbounded';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { VisionEngineProvider } from './src/ml/VisionEngine';
import { IntroScreen } from './src/screens/IntroScreen';
import { ScannerScreen } from './src/screens/ScannerScreen';
import { initSounds } from './src/sound';
import { colors } from './src/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    Unbounded_600SemiBold,
    Unbounded_800ExtraBold,
    Manrope_500Medium,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const [screen, setScreen] = useState<'intro' | 'scanner'>('intro');

  useEffect(() => {
    initSounds();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <VisionEngineProvider>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          {fontsLoaded &&
            (screen === 'intro' ? (
              <Animated.View key="intro" style={{ flex: 1 }} exiting={FadeOut.duration(300)}>
                <IntroScreen onStart={() => setScreen('scanner')} />
              </Animated.View>
            ) : (
              <Animated.View key="scanner" style={{ flex: 1 }} entering={FadeIn.duration(500)}>
                <ScannerScreen />
              </Animated.View>
            ))}
        </View>
      </VisionEngineProvider>
    </SafeAreaProvider>
  );
}
