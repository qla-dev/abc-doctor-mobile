import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Flame, Layers } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { AppCard } from './AppCard';
import { ProgressRing } from './ProgressRing';
import { TOPICS_DATA } from '@/data/topicsData';
import { FLASHCARDS_DATA } from '@/data/flashcardsData';
import { Progress, Reviews, Streak } from '@/services/storage';

/**
 * The three numbers that say where the studying stands: how much of the handbook is covered, how
 * many days in a row, how many cards fall due today.
 *
 * It reads storage itself rather than taking the numbers as props, so a screen can show the row
 * without also owning the reads. The reads are synchronous MMKV, so there is no loading state to
 * manage, and they repeat on focus because coming back from a review session must show the new
 * counts rather than the ones from when the screen mounted.
 */
export function StudyStats() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [stats, setStats] = useState(read);
  useFocusEffect(useCallback(() => setStats(read()), []));

  const styles = StyleSheet.create({
    row: { flexDirection: 'row', gap: 12 },
    card: { flex: 1 },
    stat: {
      flex: 1, alignItems: 'center', gap: 7,
      paddingVertical: 14, paddingHorizontal: 6,
      minHeight: 116, justifyContent: 'center',
    },
    value: { color: colors.text, fontSize: 22, fontWeight: '800' },
    label: {
      color: colors.muted, fontSize: 10.5, fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center',
    },
  });

  const covered =
    Object.values(stats.progress).reduce((sum, value) => sum + value, 0) /
    (TOPICS_DATA.length * 100);

  return (
    <View style={styles.row}>
      {/* The card is what sits in the row, so the card is what flexes — flex on the inner view
          alone leaves each card sized by its own longest label. */}
      <AppCard padded={false} style={styles.card}>
        <View style={styles.stat}>
          <ProgressRing progress={covered} size={56} stroke={5} />
          <Text style={styles.label}>{t('progress.studied')}</Text>
        </View>
      </AppCard>
      <AppCard padded={false} style={styles.card}>
        <View style={styles.stat}>
          <Flame size={26} color={colors.orange} />
          <Text style={styles.value}>{stats.streak}</Text>
          <Text style={styles.label}>{t('home.streak', { count: stats.streak })}</Text>
        </View>
      </AppCard>
      <AppCard padded={false} style={styles.card}>
        <View style={styles.stat}>
          <Layers size={26} color={colors.blue} />
          <Text style={styles.value}>{stats.due}</Text>
          <Text style={styles.label}>{t('home.dueToday')}</Text>
        </View>
      </AppCard>
    </View>
  );
}

function read() {
  return {
    due: Reviews.dueCount(FLASHCARDS_DATA.map(card => card.id)),
    streak: Streak.read().days,
    progress: Progress.all(),
  };
}
