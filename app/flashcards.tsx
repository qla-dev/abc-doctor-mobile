import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { createGlobalStyles } from '@/theme/styles';
import { FlashcardFlipCard } from '@/components/common/FlashcardFlipCard';
import { EmptyState } from '@/components/common/EmptyState';
import { Badge } from '@/components/common/Badge';
import { FLASHCARDS_DATA } from '@/data/flashcardsData';
import { newCard, previewIntervals, review, type ReviewState } from '@/lib/scheduler';
import type { FlashcardRating } from '@/types';

const RATINGS: { key: FlashcardRating; tone: 'red' | 'orange' | 'blue' | 'green' }[] = [
  { key: 'again', tone: 'red' },
  { key: 'hard', tone: 'orange' },
  { key: 'good', tone: 'blue' },
  { key: 'easy', tone: 'green' },
];

export default function FlashcardsScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const g = createGlobalStyles(colors);

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [state, setState] = useState<ReviewState>(() => newCard());
  const [done, setDone] = useState(0);

  const card = FLASHCARDS_DATA[index];
  const intervals = useMemo(() => previewIntervals(state), [state]);

  const tint = { red: colors.red, orange: colors.orange, blue: colors.blue, green: colors.green };

  const styles = StyleSheet.create({
    body: { padding: 16, gap: 16 },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    counter: { color: colors.muted, fontSize: 12.5, fontWeight: '700', marginLeft: 'auto' },
    ratings: { flexDirection: 'row', gap: 8 },
    rating: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, gap: 3 },
    ratingLabel: { fontSize: 13, fontWeight: '800' },
    ratingInterval: { fontSize: 11, fontWeight: '600', opacity: 0.85 },
    prompt: { color: colors.muted, fontSize: 13, textAlign: 'center' },
  });

  if (!card) {
    return (
      <View style={g.screen}>
        <Stack.Screen options={{ title: t('flashcards.title') }} />
        <EmptyState
          icon={<CheckCircle2 size={38} color={colors.green} />}
          title={t('flashcards.allDone')}
          body={t('flashcards.allDoneBody')}
        />
      </View>
    );
  }

  const rate = (rating: FlashcardRating) => {
    setState((current) => review(current, rating));
    setDone((n) => n + 1);
    setFlipped(false);
    setIndex((n) => n + 1);
  };

  return (
    <ScrollView style={g.screen} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <Stack.Screen options={{ title: t('flashcards.title') }} />
      <View style={styles.meta}>
        <Badge label={card.category} tone="indigo" />
        <Badge label={`${t('flashcards.due')} ${done}/${FLASHCARDS_DATA.length}`} tone="muted" />
        <Text style={styles.counter}>{index + 1}/{FLASHCARDS_DATA.length}</Text>
      </View>

      <FlashcardFlipCard
        front={card.frontPrompt}
        back={card.backAnswer}
        hint={card.clinicalHint}
        hintLabel={t('flashcards.hint')}
        flipped={flipped}
        onFlip={() => setFlipped((value) => !value)}
      />

      {flipped ? (
        <View style={styles.ratings}>
          {RATINGS.map((rating) => (
            <Pressable
              key={rating.key}
              onPress={() => rate(rating.key)}
              style={({ pressed }) => [
                styles.rating,
                { backgroundColor: tint[rating.tone] + '22', opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={[styles.ratingLabel, { color: tint[rating.tone] }]}>
                {t(`flashcards.${rating.key}`)}
              </Text>
              <Text style={[styles.ratingInterval, { color: tint[rating.tone] }]}>
                {intervals[rating.key]}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={styles.prompt}>{t('flashcards.tapToReveal')}</Text>
      )}
    </ScrollView>
  );
}
