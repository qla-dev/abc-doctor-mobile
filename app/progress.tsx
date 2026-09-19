import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { createGlobalStyles } from '@/theme/styles';
import { AppCard } from '@/components/common/AppCard';
import { ProgressRing } from '@/components/common/ProgressRing';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Badge } from '@/components/common/Badge';
import { TOPICS_DATA } from '@/data/topicsData';
import { QUIZ_QUESTIONS_DATA } from '@/data/quizzesData';

export default function ProgressScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const g = createGlobalStyles(colors);

  const byCategory = TOPICS_DATA.reduce<Record<string, { total: number; done: number }>>((acc, topic) => {
    const entry = acc[topic.category] ?? { total: 0, done: 0 };
    entry.total += 1;
    entry.done += topic.completionPercentage / 100;
    acc[topic.category] = entry;
    return acc;
  }, {});

  const overall = TOPICS_DATA.reduce((sum, topic) => sum + topic.completionPercentage, 0) / (TOPICS_DATA.length * 100);

  const styles = StyleSheet.create({
    statRow: { flexDirection: 'row', gap: 12 },
    stat: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14 },
    statValue: { color: colors.text, fontSize: 21, fontWeight: '800' },
    statLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
    catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
    catName: { color: colors.text, fontSize: 14.5, fontWeight: '600', flex: 1 },
    bar: { height: 7, borderRadius: 4, backgroundColor: colors.input, overflow: 'hidden', flex: 1 },
    fill: { height: 7, borderRadius: 4, backgroundColor: colors.blue },
  });

  return (
    <ScrollView style={g.screen} contentContainerStyle={g.scrollContent} showsVerticalScrollIndicator={false}>
      <Stack.Screen options={{ title: t('progress.title') }} />

      <SectionHeader title={t('progress.thisWeek')} />
      <View style={styles.statRow}>
        <AppCard padded={false}>
          <View style={styles.stat}>
            <ProgressRing progress={overall} size={58} stroke={5} />
            <Text style={styles.statLabel}>{t('progress.studied')}</Text>
          </View>
        </AppCard>
        <AppCard padded={false}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>78%</Text>
            <Text style={styles.statLabel}>{t('progress.accuracy')}</Text>
          </View>
        </AppCard>
        <AppCard padded={false}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{QUIZ_QUESTIONS_DATA.length}</Text>
            <Text style={styles.statLabel}>{t('progress.reviews')}</Text>
          </View>
        </AppCard>
      </View>

      <SectionHeader title={t('progress.byCategory')} />
      <AppCard>
        {Object.entries(byCategory).map(([category, entry]) => {
          const ratio = entry.done / entry.total;
          return (
            <View key={category} style={styles.catRow}>
              <Text style={styles.catName} numberOfLines={1}>{category}</Text>
              <View style={styles.bar}>
                <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%` }]} />
              </View>
              <Badge label={`${Math.round(ratio * 100)}%`} tone="blue" />
            </View>
          );
        })}
      </AppCard>
    </ScrollView>
  );
}
