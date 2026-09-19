import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { Lightbulb } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { createGlobalStyles } from '@/theme/styles';
import { AppCard } from '@/components/common/AppCard';
import { AppButton } from '@/components/common/AppButton';
import { Badge } from '@/components/common/Badge';
import { QuizOptionRow } from '@/components/common/QuizOptionRow';
import { ProgressRing } from '@/components/common/ProgressRing';
import { QUIZ_QUESTIONS_DATA } from '@/data/quizzesData';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export default function QuizPlayerScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const g = createGlobalStyles(colors);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);

  const question = QUIZ_QUESTIONS_DATA[index];
  const total = Math.min(QUIZ_QUESTIONS_DATA.length, 10);

  const styles = StyleSheet.create({
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
    counter: { color: colors.muted, fontSize: 13, fontWeight: '700' },
    vignette: { color: colors.text, fontSize: 14.5, lineHeight: 21 },
    question: { color: colors.text, fontSize: 16, fontWeight: '700', lineHeight: 22, marginTop: 4 },
    options: { gap: 9, marginTop: 4 },
    explanation: { color: colors.text, fontSize: 14, lineHeight: 20 },
    pearlRow: { flexDirection: 'row', gap: 9 },
    pearl: { color: colors.text, fontSize: 13.5, lineHeight: 20, flex: 1 },
    verdict: { fontSize: 17, fontWeight: '800', marginBottom: 6 },
  });

  if (!question) return null;

  const isCorrect = question.options.find((option) => option.id === selected)?.isCorrect ?? false;

  const submit = () => {
    setRevealed(true);
    if (isCorrect) setScore((value) => value + 1);
  };

  const next = () => {
    setRevealed(false);
    setSelected(null);
    setIndex((value) => (value + 1) % QUIZ_QUESTIONS_DATA.length);
  };

  return (
    <ScrollView style={g.screen} contentContainerStyle={g.scrollContent} showsVerticalScrollIndicator={false}>
      <Stack.Screen options={{ title: t('quiz.title') }} />

      <View style={styles.progressRow}>
        <ProgressRing progress={(index + 1) / total} size={44} stroke={4} label={`${index + 1}`} />
        <View style={{ flex: 1 }}>
          <Text style={styles.counter}>{t('quiz.question', { current: index + 1, total })}</Text>
          <Text style={styles.counter}>{t('quiz.score')}: {score}</Text>
        </View>
        <Badge label={question.difficulty} tone={question.difficulty === 'hard' ? 'red' : question.difficulty === 'medium' ? 'orange' : 'green'} />
      </View>

      <AppCard>
        <Text style={styles.vignette}>{question.vignette}</Text>
        <Text style={styles.question}>{question.question}</Text>
      </AppCard>

      <View style={styles.options}>
        {question.options.map((option, optionIndex) => (
          <QuizOptionRow
            key={option.id}
            letter={LETTERS[optionIndex] ?? '?'}
            text={option.text}
            selected={selected === option.id}
            revealed={revealed}
            correct={option.isCorrect}
            onPress={() => setSelected(option.id)}
          />
        ))}
      </View>

      {revealed ? (
        <>
          <AppCard>
            <Text style={[styles.verdict, { color: isCorrect ? colors.green : colors.red }]}>
              {isCorrect ? t('quiz.correct') : t('quiz.incorrect')}
            </Text>
            <Text style={styles.explanation}>
              {question.options.find((option) => option.isCorrect)?.explanation}
            </Text>
          </AppCard>
          <AppCard>
            <View style={styles.pearlRow}>
              <Lightbulb size={17} color={colors.yellow} />
              <Text style={styles.pearl}>{question.highYieldPearl}</Text>
            </View>
          </AppCard>
          <AppButton label={t('quiz.next')} onPress={next} full />
        </>
      ) : (
        <AppButton label={t('quiz.submit')} onPress={submit} disabled={!selected} full />
      )}
    </ScrollView>
  );
}
