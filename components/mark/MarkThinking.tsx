import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { BrainCircuit } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';

const ICON_SIZE = 18;
const FONT_SIZE = 18;
const LINE_HEIGHT = 27;

const PHRASE_MS = 7000;
const FIRST_MS = 1500;
const SKILL_MS = 5000;

function SkillIcon({ sweep, muted, foreground }: {
  sweep: SharedValue<number>;
  muted: string;
  foreground: string;
}) {
  const lit = useAnimatedStyle(() => ({
    opacity: Math.max(0, 1 - Math.abs(sweep.value) / 0.3),
  }));
  return (
    <View style={{ width: ICON_SIZE, height: LINE_HEIGHT, marginRight: 6, justifyContent: 'center' }}>
      <BrainCircuit size={ICON_SIZE} color={muted} />
      <Animated.View style={[{ position: 'absolute', top: (LINE_HEIGHT - ICON_SIZE) / 2 }, lit]}>
        <BrainCircuit size={ICON_SIZE} color={foreground} />
      </Animated.View>
    </View>
  );
}

function Letter({ letter, index, length, sweep, muted, foreground }: {
  letter: string;
  index: number;
  length: number;
  sweep: SharedValue<number>;
  muted: string;
  foreground: string;
}) {
  const style = useAnimatedStyle(() => {
    const distance = Math.abs(index / Math.max(1, length - 1) - sweep.value);
    return {
      color: interpolateColor(
        Math.max(0, 1 - distance / 0.3),
        [0, 1],
        [muted, foreground]
      ),
    };
  });
  return (
    <Animated.Text style={[{ fontSize: FONT_SIZE, lineHeight: LINE_HEIGHT }, style]}>
      {letter}
    </Animated.Text>
  );
}

type Phase = { key: string; text: string; skill: boolean };

export function MarkThinking({ skill }: {
  skill?: string | null;
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const muted = colors.muted;
  const foreground = colors.text;

  const phrases = useMemo(() => [
    t('ai.actThinking'), t('ai.actAnalysing'), t('ai.actReviewing'), t('ai.actPatience'),
  ], [t]);

  const started = useRef(Date.now());
  const [now, setNow] = useState(() => Date.now());

  const phase = useMemo((): Phase => {
    const elapsed = now - started.current;
    if (elapsed < FIRST_MS) return { key: 'first', text: phrases[0], skill: false };
    if (skill && elapsed < FIRST_MS + SKILL_MS) {
      return { key: 'skill', text: `${t('ai.usingSkill')} ${skill}`, skill: true };
    }
    const since = elapsed - FIRST_MS - (skill ? SKILL_MS : 0);
    const index = 1 + Math.floor(since / PHRASE_MS) % Math.max(1, phrases.length - 1);
    return { key: 'phrase-' + index, text: phrases[index], skill: false };
  }, [now, phrases, skill, t]);

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

  const sweep = useSharedValue(-0.3);
  useEffect(() => {
    sweep.value = withRepeat(
      withTiming(1.3, { duration: 2400, easing: Easing.linear }),
      -1
    );
    return () => cancelAnimation(sweep);
  }, [sweep]);

  const label = `${t('ai.title')} ${phase.text}`;
  const letters = Array.from(label);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={{ alignSelf: 'flex-start', paddingVertical: 4 }}
    >
      <Animated.View
        key={phase.key}
        entering={FadeIn.duration(260)}
        style={{ flexDirection: 'row', flexWrap: 'wrap' }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {phase.skill ? (
          <SkillIcon sweep={sweep} muted={muted} foreground={foreground} />
        ) : null}
        {letters.map((letter, index) => (
          <Letter
            key={index}
            letter={letter}
            index={index}
            length={letters.length}
            sweep={sweep}
            muted={muted}
            foreground={foreground}
          />
        ))}
      </Animated.View>
    </View>
  );
}
