import { Practice } from '@/services/practice';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing, cancelAnimation, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import { setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Mic, MicOff, PhoneOff, Volume2, VolumeX } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { darkColors } from '@/theme/colors';
import { useLanguage } from '@/context/LanguageContext';
import { ApiError } from '@/lib/api';
import { Mark } from '@/services/mark';
import { startVoiceSession, type VoiceSession } from '@/lib/realtimeVoice';

/** One breath of the dot. Slow enough to read as an open line, not as a spinner. */
const BREATH_MS = 1600;

/**
 * The live call, as a bar over the thread — never a full screen.
 *
 * Lena settled this one, after a full-screen panel hid exactly the things the call was producing.
 * Everything said in here lands in the conversation as ordinary messages, which is where the
 * transcript belongs, so this bar carries none of its own: it says the line is open, and it lets
 * you leave it.
 *
 * Unmounting the bar is hanging up. The connection, the microphone and the data channel all live
 * in the session below, and the cleanup ends all three.
 */
export function MarkCallBar({ conversationId, onTurn, onClose, onDrainReady, practice = false, forceDark = false }: {
  conversationId: number;
  practice?: boolean;
  /** Each completed turn, both sides, the moment it comes back transcribed. */
  onTurn: (role: 'user' | 'assistant', text: string, itemId?: string) => void;
  onClose: () => void;
  onDrainReady?: (drain: (() => Promise<void>) | null) => void;
  /** For a screen that is dark whatever the system theme says — the simulator is one. */
  forceDark?: boolean;
}) {
  const theme = useTheme();
  const colors = forceDark ? darkColors : theme.colors;
  const { t } = useLanguage();

  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'connecting' | 'ready' | 'error'>('connecting');
  const [detail, setDetail] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [canRoute, setCanRoute] = useState(true);
  const session = useRef<VoiceSession | null>(null);

  // Held in a ref: a caller passing a fresh arrow on every render must not tear the call down and
  // place a new one.
  const turn = useRef(onTurn);
  useEffect(() => { turn.current = onTurn; });

  const closeNow = useRef(onClose);
  closeNow.current = onClose;
  useEffect(() => {
    onDrainReady?.(async () => {
      const complete = session.current ? await session.current.finish() : true;
      await Mark.flushTranscripts(conversationId);
      if (!complete && practice) await Practice.event(conversationId, `gap_${Date.now()}`, { kind: 'action', description: 'Audio ended before its full transcription was available.' });
      closeNow.current();
    });
    return () => onDrainReady?.(null);
  }, [conversationId, onDrainReady, practice]);
  const breath = useSharedValue(0);

  useEffect(() => {
    setStatus('connecting');
    let cancelled = false;
    const abort = new AbortController();

    (async () => {
      try {
        // Recording and playback at once, and out of the earpiece into the speaker — without
        // this iOS routes a call-shaped session to the receiver and it sounds broken.
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
          shouldPlayInBackground: false,
        });

        const secret = await Mark.realtimeSession(conversationId);
        if (cancelled) return;

        const live = await startVoiceSession({
          callUrl: secret.call_url,
          key: secret.value,
          history: secret.history,
          opensConversation: secret.opens_conversation,
          signal: abort.signal,
          onToolCall: practice ? async (name, args, callId) => {
            if (name !== 'record_practice_event') throw new Error('Unknown practice action');
            return Practice.event(conversationId, callId, args);
          } : undefined,
          onTranscript: (role, text, itemId) => turn.current(role, text, itemId),
          onStateChange: state => {
            if (cancelled) return;
            if (state === 'connected') setStatus('ready');
            if (state === 'playback-blocked') { setDetail('Audio playback was blocked. Reconnect to enable sound.'); setStatus('error'); }
            if (state === 'failed' || state === 'closed') { session.current?.hangUp(); session.current = null; setStatus('error'); }
          },
        });

        if (cancelled) { live.hangUp(); return; }

        session.current = live;
        setSpeaker(live.speakerOn);
        setCanRoute(live.canRoute);
        setDetail(`${secret.model} · ${secret.voice}`);
      } catch (e) {
        if (cancelled) return;
        setStatus('error');
        setDetail(e instanceof ApiError ? e.message : (e as Error).message);
      }
    })();

    return () => {
      cancelled = true;
      abort.abort();
      session.current?.hangUp();
      session.current = null;
    };
  }, [conversationId, attempt, practice]);

  useEffect(() => {
    if (muted || status !== 'ready') {
      cancelAnimation(breath);
      breath.value = withTiming(0, { duration: 180 });

      return;
    }
    breath.value = withRepeat(
      withTiming(1, { duration: BREATH_MS, easing: Easing.inOut(Easing.ease) }), -1, true,
    );
  }, [breath, muted, status]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(breath.value, [0, 1], [1, 1.45]) }],
    opacity: interpolate(breath.value, [0, 1], [0.55, 1]),
  }));

  const styles = StyleSheet.create({
    bar: {
      flexDirection: 'row', alignItems: 'center', gap: 11,
      marginHorizontal: 16, marginBottom: 8,
      paddingHorizontal: 14, paddingVertical: 10,
      borderRadius: 18, backgroundColor: colors.card,
      // Only a failed call draws an edge. At rest the bar is a card like any other card here.
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: status === 'error' ? colors.red : 'transparent',
    },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: status === 'error' ? colors.red : colors.blue },
    label: { flex: 1, color: colors.text, fontSize: 13.5, fontWeight: '600' },
    detail: { color: colors.muted, fontSize: 11, marginTop: 1 },
    button: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.input },
    hangUp: { backgroundColor: colors.red },
  });

  const label = status === 'connecting' ? t('voice.connecting')
    : status === 'error' ? (detail ?? t('voice.failed'))
    : muted ? t('voice.tapToTalk') : t('voice.ready');

  return (
    <View style={styles.bar} accessibilityRole="toolbar" accessibilityLabel={t('simulator.voiceCall')}>
      <Animated.View style={[styles.dot, dotStyle]} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
        {status === 'ready' && detail ? <Text style={styles.detail} numberOfLines={1}>{detail}</Text> : null}
      </View>

      {status === 'error' ? <Pressable accessibilityRole="button" onPress={() => setAttempt(value => value + 1)}><Text style={{ color: colors.blue }}>Reconnect</Text></Pressable> : null}
      <Pressable
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setMuted(value => {
            session.current?.setMuted(!value);

            return !value;
          });
        }}
        accessibilityRole="button"
        accessibilityLabel={t('simulator.voiceCall')}
        style={({ pressed }) => [styles.button, { opacity: pressed ? 0.6 : 1 }]}
      >
        {muted ? <MicOff size={16} color={colors.red} /> : <Mic size={16} color={colors.text} />}
      </Pressable>

      {canRoute ? (
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSpeaker(value => {
              session.current?.setSpeaker(!value);

              return !value;
            });
          }}
          accessibilityRole="button"
          accessibilityLabel={t('voice.speaker')}
          style={({ pressed }) => [styles.button, { opacity: pressed ? 0.6 : 1 }]}
        >
          {speaker ? <Volume2 size={16} color={colors.text} /> : <VolumeX size={16} color={colors.muted} />}
        </Pressable>
      ) : null}

      <Pressable
        onPress={async () => { try { await session.current?.finish(); await Mark.flushTranscripts(conversationId); onClose(); } catch (e) { setStatus('error'); setDetail((e as Error).message); } }}
        accessibilityRole="button"
        accessibilityLabel={t('common.done')}
        style={({ pressed }) => [styles.button, styles.hangUp, { opacity: pressed ? 0.6 : 1 }]}
      >
        <PhoneOff size={16} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}
