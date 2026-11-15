import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Speech from 'expo-speech';
import type { ConversationMode } from './conversationMode';

// Load only on demand so older development builds can still use text and Realtime.
async function recognition() { return (require('expo-speech-recognition') as typeof import('expo-speech-recognition')).ExpoSpeechRecognitionModule; }
export function useDeviceSpeech({ mode, conversationId, language, onText, onError }: {
  mode: ConversationMode; conversationId?: number; language: string;
  onText: (text: string) => void; onError: (message: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const callbacks = useRef({ onText, onError });
  callbacks.current = { onText, onError };
  const generation = useRef(0);
  const cleanup = useRef<() => void>(() => {});
  const locale = language === 'bs' ? 'bs-BA' : language === 'de' ? 'de-DE' : 'en-US';
  const stop = () => {
    generation.current++;
    cleanup.current(); cleanup.current = () => {};
    void Speech.stop(); setListening(false); setSpeaking(false);
  };
  useEffect(() => {
    stop();
    const listener = AppState.addEventListener('change', state => { if (state !== 'active') stop(); });
    return () => { stop(); listener.remove(); };
  }, [mode, conversationId]);
  const start = async () => {
    stop();
    const token = generation.current;
    try {
      const module = await recognition();
      if (token !== generation.current) return;
      if (!module.isRecognitionAvailable()) throw new Error('Speech recognition is unavailable on this device/browser. Select another mode.');
      const permission = await module.requestPermissionsAsync();
      if (token !== generation.current) return;
      if (!permission.granted) throw new Error('Microphone and speech recognition permission are required. Enable them in settings or select another mode.');
      const supported = await module.getSupportedLocales({});
      if (token !== generation.current) return;
      if (supported.locales.length && !supported.locales.some(value => value.toLowerCase().startsWith(language))) throw new Error(`Speech recognition for ${language} is unavailable. Change the app language or select another mode.`);
      let submitted = false;
      const subscriptions = [
        module.addListener('result', event => {
          if (token !== generation.current || !event.isFinal || submitted) return;
          const text = event.results[0]?.transcript.trim();
          if (text) { submitted = true; stop(); callbacks.current.onText(text); }
        }),
        module.addListener('error', event => {
          if (token !== generation.current) return;
          stop();
          callbacks.current.onError(event.message || 'Speech recognition failed. Try again or select another mode.');
        }),
        module.addListener('end', () => { if (token === generation.current) stop(); }),
      ];
      cleanup.current = () => { subscriptions.forEach(subscription => subscription.remove()); module.abort(); };
      setListening(true);
      module.start({ lang: locale, interimResults: false, continuous: false });
    } catch (error) {
      if (token !== generation.current) return;
      stop(); callbacks.current.onError((error as Error).message);
    }
  };
  const speak = async (text: string) => {
    stop();
    const token = generation.current;
    try {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const voices = await Promise.race([
        Speech.getAvailableVoicesAsync(),
        new Promise<Speech.Voice[]>((_, reject) => { timer = setTimeout(() => reject(new Error('No speech voices are available. Install a voice or select a mode with written replies.')), 3000); }),
      ]).finally(() => clearTimeout(timer));
      if (token !== generation.current) return;
      const voice = voices.find(value => value.language.toLowerCase().startsWith(language));
      if (!voice) throw new Error(`No ${language} speech voice is installed. Install a voice or select a mode with written replies.`);
      setSpeaking(true);
      const chunks = text.match(new RegExp(`[\\s\\S]{1,${Math.min(Speech.maxSpeechInputLength, 3000)}}`, 'g')) ?? [];
      chunks.forEach((chunk, index) => Speech.speak(chunk, { language: locale, voice: voice.identifier,
        onDone: () => { if (token === generation.current && index === chunks.length - 1) setSpeaking(false); },
        onError: () => { if (token === generation.current) { stop(); callbacks.current.onError('Playback failed. The reply remains in the conversation.'); } },
      }));
    } catch (error) { if (token === generation.current) { stop(); callbacks.current.onError((error as Error).message); } }
  };
  return { listening, speaking, start, stop, speak };
}
