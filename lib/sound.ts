import { Platform } from 'react-native';

const CLICK_AUDIO = require('../assets/audio/click.mp3');

let audioModule: typeof import('expo-audio') | null = null;
let clickPlayer: ReturnType<typeof import('expo-audio')['createAudioPlayer']> | null = null;
let audioReadyPromise: Promise<void> | null = null;
let lastClickAt = 0;

async function ensureAudio() {
  if (audioReadyPromise) return audioReadyPromise;
  audioReadyPromise = (async () => {
    audioModule = require('expo-audio');
    await audioModule?.setIsAudioActiveAsync?.(true);
    await audioModule?.setAudioModeAsync({
      interruptionMode: 'doNotMix',
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    });
  })().catch(() => {
    audioModule = null;
    audioReadyPromise = null;
  });
  return audioReadyPromise;
}

export async function playClickSound() {
  if (Platform.OS === 'android') return;
  const now = Date.now();
  if (now - lastClickAt < 80) return;
  lastClickAt = now;
  try {
    await ensureAudio();
    if (!audioModule) return;
    clickPlayer ??= audioModule.createAudioPlayer(CLICK_AUDIO, { keepAudioSessionActive: true });
    await clickPlayer.seekTo(0);
    clickPlayer.play();
  } catch {
    // Sound must never block the button action.
  }
}
