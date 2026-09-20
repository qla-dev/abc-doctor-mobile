import { forwardRef, useImperativeHandle, useRef, type ReactNode } from 'react';
import {
  ActivityIndicator, Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ArrowUp, AudioLines, Mic, Plus, Square, X } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { GlassPanel } from '@/components/common/GlassPanel';
import type { VoiceNote } from '@/lib/voiceNote';
import { VoiceWave } from '@/components/nina/VoiceWave';

/** One line to start with, six before the text scrolls inside the pill instead of growing it. */
const LINE = 21;
const MAX_LINES = 6;

/**
 * How far the keyboard has come up, as a value the UI thread can read.
 *
 * The composer rides on this rather than being pushed by a KeyboardAvoidingView: the padding
 * version arrives a frame after the keyboard and the bar visibly lags behind its own top edge.
 * expo's chat template drives its prompt input the same way.
 */
export function useKeyboardHeight() {
  const height = useSharedValue(0);

  useKeyboardHandler({
    onMove: event => { 'worklet'; height.value = Math.max(0, event.height); },
    onEnd: event => { 'worklet'; height.value = Math.max(0, event.height); },
  }, []);

  return height;
}

export type NinaComposerHandle = {
  /** Put the keyboard back up — whatever took the field's place is gone. */
  focus: () => void;
  /** Take it down, for a sheet that shares the bottom of the screen with it. */
  blur: () => void;
};

export type NinaComposerProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  /** Opens the line. The round button is this until there is something written to send. */
  onTalk: () => void;
  /**
   * The microphone, when there is one: a turn recorded rather than typed. Absent while a call
   * is up, since the line already holds the microphone.
   */
  dictation?: VoiceNote;
  onSkills: () => void;
  /** What Nina is being asked to be right now, as the chip says it. */
  skillLabel: string;
  busy?: boolean;
  canSpeak?: boolean;
  /** Its measured height, so the thread above can keep its last turn clear of it. */
  onHeight?: (height: number) => void;
  /**
   * Anything that belongs with the bar rather than in the thread — the live call, the vitals of
   * a simulated patient. It rides in the same lifted container, or the keyboard would come up
   * over it.
   */
  above?: ReactNode;
};

/**
 * The message bar: one card, the line you write on top of it, and its controls underneath.
 *
 * ChatGPT's composer, over expo's chat-template mechanics: the bar is positioned against the
 * bottom of the screen and follows the keyboard itself, rather than being a child that something
 * else pushes around.
 *
 * The field gets the card's whole width because the row it used to share was not wide enough for
 * both: with the chip beside it, a skill named "Simulator pacijenta" left the field a column
 * narrow enough to wrap its own placeholder across three lines. Everything that was outside the
 * pill — the plus, the mic — is now on the row below the field, which is where a composer with a
 * full-width field has room to put them.
 *
 * The card grows with what is being written, one line to six, and shrinks back when it is sent.
 * Everything the conversation can be told to do is in this bar: the plus opens what Nina can be
 * (and the case behind the simulated patient), the chip says which of those she is right now.
 */
export const NinaComposer = forwardRef<NinaComposerHandle, NinaComposerProps>(function NinaComposer({
  value, onChangeText, onSend, onTalk, dictation, onSkills, skillLabel,
  busy = false, canSpeak = false, onHeight, above,
}, handle) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();

  /**
   * The field, for the screen above it. A bottom sheet and the keyboard both belong to the
   * bottom of the screen, and whichever arrives second opens behind the first — so the screen
   * that raises a sheet takes the keyboard down first and hands it back afterwards.
   */
  const input = useRef<TextInput>(null);
  useImperativeHandle(handle, () => ({
    focus: () => input.current?.focus(),
    // Both: blurring a field the system still considers focused leaves the keyboard up.
    blur: () => { input.current?.blur(); Keyboard.dismiss(); },
  }), []);

  const ready = value.trim().length > 0;
  /**
   * What the round button is right now. An empty field and a skill that can talk means there is
   * nothing to send and the only thing left to do is say it, so the button is the call; the
   * first character typed turns it back into send.
   */
  const calling = !ready && canSpeak;
  /** Solid only when it has something to do — otherwise it is a send with nothing to send. */
  const live = (calling || ready) && !busy;
  /**
   * A recording takes the whole row. Everything on it is about the recording — throw it away,
   * stop it, send it — so the plus and the chip step aside until the turn is over rather than
   * sharing the row with controls that no longer apply.
   */
  const taping = dictation?.state === 'recording' || dictation?.state === 'sending';

  /**
   * `insets.bottom` inside a tab screen is the home indicator AND the tab bar, which is exactly
   * where the bar has to stop; with the keyboard up it rides on that instead.
   */
  const lift = useAnimatedStyle(() => ({
    bottom: Math.max(insets.bottom, keyboard.value),
  }));

  const styles = StyleSheet.create({
    bar: { position: 'absolute', left: 0, right: 0 },
    row: { paddingHorizontal: 12, paddingVertical: 8 },
    card: { paddingTop: 2, paddingBottom: 8 },
    input: {
      color: colors.text, fontSize: 16, lineHeight: LINE,
      paddingTop: 12, paddingBottom: 6, paddingHorizontal: 16,
      // Both allow for the padding above: a height is the box, not the text inside it.
      minHeight: LINE + 18, maxHeight: LINE * MAX_LINES + 18,
      // Android otherwise starts a multiline field's text in the middle of its own height.
      textAlignVertical: 'top',
    },
    controls: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8 },
    action: {
      width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    },
    // Dictation is the quiet way to say something, so it is drawn rather than filled: an outline
    // beside the one solid button, which is the one that acts on what is in the field.
    outlined: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.glassBorder },
    // What cancel and stop sit in while a recording is open: present, but not competing with the
    // one blue button that ends the turn.
    filled: { backgroundColor: colors.input },
    chip: {
      // Shrinks rather than pushing: the names run long in Bosnian, and the row it sits on has
      // the send and the mic at the other end of it.
      flexShrink: 1, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
      backgroundColor: colors.input,
    },
    chipText: { color: colors.muted, fontSize: 11.5, fontWeight: '700' },
    spacer: { flex: 1, minWidth: 8 },
  });

  const tap = (run: () => void) => () => {
    void Haptics.selectionAsync();
    run();
  };

  return (
    <Animated.View
      style={[styles.bar, lift]}
      onLayout={event => onHeight?.(event.nativeEvent.layout.height)}
    >
      {above}
      <View style={styles.row}>
        <GlassPanel radius={26} style={styles.card}>
          <TextInput
            ref={input}
            value={value}
            onChangeText={onChangeText}
            placeholder={t('ai.placeholder')}
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
            // Past six lines the card stops growing and the text moves inside it.
            scrollEnabled
            submitBehavior={Platform.OS === 'ios' ? 'newline' : undefined}
          />

          {taping && dictation ? (
            <View style={styles.controls}>
              {/* Throwing it away is its own button rather than the stop you have to undo:
                  a recording you did not mean to make should cost one press, not two. */}
              <Pressable
                onPress={tap(dictation.cancel)}
                disabled={dictation.state === 'sending'}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
                style={({ pressed }) => [styles.action, styles.filled, { opacity: pressed ? 0.6 : 1 }]}
              >
                <X size={18} color={colors.text} />
              </Pressable>

              <VoiceWave level={dictation.level} color={colors.text} />

              {/* Stop keeps the words and stops there: the transcript lands in the field, where
                  a misheard term can be fixed before anyone answers it. */}
              <Pressable
                onPress={tap(dictation.stop)}
                disabled={dictation.state === 'sending'}
                accessibilityRole="button"
                accessibilityLabel={t('ai.stopRecording')}
                style={({ pressed }) => [styles.action, styles.filled, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Square size={13} color={colors.text} fill={colors.text} />
              </Pressable>

              {/* The round button is the send for as long as the microphone is open — the call
                  is not what is being offered mid-recording. */}
              <Pressable
                onPress={tap(dictation.send)}
                disabled={dictation.state === 'sending'}
                accessibilityRole="button"
                accessibilityLabel={t('common.done')}
                style={({ pressed }) => [
                  styles.action,
                  { backgroundColor: colors.blue, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                {/* No spinner here. The wait between letting go and the words landing is short,
                    and swapping the arrow for a spinner mid-press reads as the press failing. */}
                <ArrowUp size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : (
            <View style={styles.controls}>
              <Pressable
                onPress={tap(onSkills)}
                accessibilityRole="button"
                accessibilityLabel={t('ai.skills')}
                style={({ pressed }) => [styles.action, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Plus size={22} color={colors.text} />
              </Pressable>

              {/* Who she is being, where a chat app puts the model it is talking to. */}
              <Pressable
                onPress={tap(onSkills)}
                accessibilityRole="button"
                accessibilityLabel={t('ai.skills')}
                style={styles.chip}
              >
                <Text style={styles.chipText} numberOfLines={1}>{skillLabel}</Text>
              </Pressable>

              <View style={styles.spacer} />

              {/* A turn said rather than typed, and still a turn: recorded, sent, answered in
                  the thread. The line itself is the round button's job, not this one's. */}
              {dictation ? (
                <Pressable
                  onPress={tap(dictation.start)}
                  accessibilityRole="button"
                  accessibilityLabel={t('ai.dictate')}
                  style={({ pressed }) => [styles.action, styles.outlined, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Mic size={19} color={colors.text} />
                </Pressable>
              ) : null}

              {/* One solid button, doing whatever the field leaves it to do: an empty field means
                  the only thing left is to say it, so it is the call until there is something
                  written, and the send the moment there is. */}
              <Pressable
                onPress={tap(calling ? onTalk : onSend)}
                disabled={busy || (!calling && !ready)}
                accessibilityRole="button"
                accessibilityLabel={calling ? t('simulator.voiceCall') : t('common.done')}
                style={({ pressed }) => [
                  styles.action,
                  { backgroundColor: live ? colors.blue : colors.input, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                {busy ? <ActivityIndicator size="small" color={colors.muted} />
                  : calling ? <AudioLines size={19} color="#FFFFFF" />
                  : <ArrowUp size={18} color={ready ? '#FFFFFF' : colors.muted} />}
              </Pressable>
            </View>
          )}
        </GlassPanel>
      </View>
    </Animated.View>
  );
});
