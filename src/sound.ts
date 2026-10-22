import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

const sources = {
  tap: require('../assets/sounds/tap.wav'),
  scan: require('../assets/sounds/scan.wav'),
  success: require('../assets/sounds/success.wav'),
  denied: require('../assets/sounds/denied.wav'),
  ready: require('../assets/sounds/ready.wav'),
  meow: require('../assets/sounds/meow.wav'),
  bark: require('../assets/sounds/bark.mp3'),
};

export type SoundName = keyof typeof sources;

const players: Partial<Record<SoundName, AudioPlayer>> = {};

export async function initSounds() {
  try {
    await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' });
  } catch {}
  (Object.keys(sources) as SoundName[]).forEach((name) => {
    try {
      players[name] = createAudioPlayer(sources[name]);
    } catch {}
  });
}

export function play(name: SoundName, volume = 1) {
  const p = players[name];
  if (!p) return;
  try {
    p.volume = volume;
    p.seekTo(0);
    p.play();
  } catch {}
}

export function stop(name: SoundName) {
  try {
    players[name]?.pause();
  } catch {}
}

export function tap() {
  play('tap', 0.6);
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function say(text: string, delay = 0) {
  setTimeout(() => {
    Speech.stop()
      .catch(() => {})
      .finally(() => {
        Speech.speak(text, {
          language: 'ru-RU',
          rate: 0.96,
          pitch: 1.02,
          volume: 1,
          useApplicationAudioSession: false,
        });
      });
  }, delay);
}

export function hush() {
  Speech.stop().catch(() => {});
}
