import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import ReanimatedAnimated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { BrainCircuit } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';

/**
 * What the wait looks like: a line that says what is happening, lit by a band travelling across
 * it, changing as the wait goes on.
 *
 * Lena's, ported. Two halves there and two here. The shimmer is the native one from
 * freightbook's `LenaThinkingIndicator`: the text is a mask, the light moves underneath it, and
 * the band animates a `left` percentage — which the native driver cannot take, and does not need
 * to, since nothing else is moving on screen while it runs.
 *
 * The phases are from the web one's `lenaThinkingTimeline`: it opens on "thinking", names the
 * skill the answer is coming from, then loops the rest. One thing is deliberately not carried
 * over. Lena asks the server which skills a reply used and HOLDS the finished answer back until
 * each has had its seconds on screen — it has to, or nobody would ever see them. Here the skill
 * was chosen before the thread opened and is on the chip the whole time, so delaying an answer
 * that is already written would buy nothing and cost the wait.
 */

/** How long each phrase holds before the next one takes over. Lena's seven seconds. */
const PHRASE_MS = 7000;
/** The opening phrase is short: the skill is the interesting part and should not be waited for. */
const FIRST_MS = 1500;
/** And once named, it stays long enough to be read. */
const SKILL_MS = 5000;

type Phase = { key: string; text: string; skill: boolean };

export function MarkThinking({ skill }: {
  /** The skill the answer is coming from, named once early on. Absent before a thread exists. */
  skill?: string | null;
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const phrases = useMemo(() => [
    t('ai.actThinking'), t('ai.actAnalysing'), t('ai.actReviewing'), t('ai.actPatience'),
  ], [t]);

  /** Where the wait is, in milliseconds since it started. */
  const started = useRef(Date.now());
  const [now, setNow] = useState(() => Date.now());

  const phase = useMemo((): Phase => {
    const elapsed = now - started.current;
    if (elapsed < FIRST_MS) return { key: 'first', text: phrases[0], skill: false };
    if (skill && elapsed < FIRST_MS + SKILL_MS) {
      return { key: 'skill', text: `${t('ai.usingSkill')} ${skill}`, skill: true };
    }
    // Everything after the skill is the phrase loop, starting from the second one so the wait
    // does not open and continue on the same word.
    const since = elapsed - FIRST_MS - (skill ? SKILL_MS : 0);
    const index = 1 + Math.floor(since / PHRASE_MS) % Math.max(1, phrases.length - 1);

    return { key: 'phrase-' + index, text: phrases[index], skill: false };
  }, [now, phrases, skill, t]);

  // Re-render exactly when the current phase runs out rather than on a ticking interval: a chat
  // waiting on an answer should not be re-rendering four times a second to hold one line still.
  useEffect(() => {
    const elapsed = Date.now() - started.current;
    const until = elapsed < FIRST_MS
      ? FIRST_MS - elapsed
      : skill && elapsed < FIRST_MS + SKILL_MS
        ? FIRST_MS + SKILL_MS - elapsed
        : PHRASE_MS - ((elapsed - FIRST_MS - (skill ? SKILL_MS : 0)) % PHRASE_MS);
    const timer = setTimeout(() => setNow(Date.now()), Math.max(16, until) + 16);

    return () => clearTimeout(timer);
  }, [now, skill]);

  /** The band, travelling left to right for as long as the wait lasts. */
  const sweep = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: false,
      }),
    );
    loop.start();

    return () => loop.stop();
  }, [sweep]);
  const left = sweep.interpolate({ inputRange: [0, 1], outputRange: ['-60%', '100%'] });

  /** A phase does not cut to the next one; it comes up. */
  const enter = useSharedValue(1);
  useEffect(() => {
    enter.value = 0;
    enter.value = withTiming(1, { duration: 260 });
  }, [enter, phase.key]);
  const entering = useAnimatedStyle(() => ({ opacity: enter.value }));

  const label = `${t('ai.title')} ${phase.text}`;
  const text = { color: colors.text, fontSize: 14.5, lineHeight: 20 } as const;

  return (
    <ReanimatedAnimated.View style={[{ alignSelf: 'flex-start', paddingVertical: 2 }, entering]}>
      <MaskedView
        maskElement={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            {phase.skill ? <BrainCircuit size={14} color="#000000" /> : null}
            <Text accessibilityRole="progressbar" accessibilityLabel={label} style={text}>
              {label}
            </Text>
          </View>
        }
      >
        {/* The mask decides the shape; everything below only supplies colour. The copy of the
            text is what gives the block its size — it is invisible, and it is load-bearing. */}
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, opacity: 0 }}>
            {phase.skill ? <BrainCircuit size={14} color="#000000" /> : null}
            <Text style={text}>{label}</Text>
          </View>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.muted }]} />
          <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, width: '60%', left }}>
            <LinearGradient
              colors={['transparent', colors.text, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
        </View>
      </MaskedView>
    </ReanimatedAnimated.View>
  );
}
