import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { FallbackTabHeader, useTabScrollPadding } from '@/components/common/TabHeader';
import { useScreenHeader } from '@/hooks/useScreenHeader';
import { Brain, Flame, Layers, Settings, Siren, TrendingUp } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { createGlobalStyles } from '@/theme/styles';
import { AppCard } from '@/components/common/AppCard';
import { AppButton } from '@/components/common/AppButton';
import { Badge } from '@/components/common/Badge';
import { SectionHeader } from '@/components/common/SectionHeader';
import { ProgressRing } from '@/components/common/ProgressRing';
import { TOPICS_DATA } from '@/data/topicsData';
import { FLASHCARDS_DATA } from '@/data/flashcardsData';
import { Progress, Reviews, Streak } from '@/services/storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const bottomPad = useTabScrollPadding();
  const usesNativeHeader = useScreenHeader({ title: t('tabs.home'),
    right: [{ sfSymbol: 'gearshape', accessibilityLabel: t('common.settings'), identifier: 'settings', onPress: () => router.push('/settings') }],
  });
  const g = createGlobalStyles(colors);

  // Re-read on focus: coming back from a review session must show the new counts, and these
  // are synchronous MMKV reads so there is no loading state to manage.
  const [stats, setStats] = useState(() => ({
    due: Reviews.dueCount(FLASHCARDS_DATA.map(card => card.id)),
    streak: Streak.read().days,
    progress: Progress.all(),
  }));
  useFocusEffect(useCallback(() => {
    setStats({
      due: Reviews.dueCount(FLASHCARDS_DATA.map(card => card.id)),
      streak: Streak.read().days,
      progress: Progress.all(),
    });
  }, []));
  const dueCount = stats.due;
  const inProgress = TOPICS_DATA.filter(topic => topic.completionPercentage > 0 && topic.completionPercentage < 100);
  const resume = inProgress[0] ?? TOPICS_DATA[0];
  const highYield = TOPICS_DATA.filter(topic => topic.highYieldRating >= 4).slice(0, 3);

  const styles = StyleSheet.create({
    greeting: { color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
    greetingSub: { color: colors.muted, fontSize: 14, marginTop: 2, marginBottom: 6 },
    statRow: { flexDirection: 'row', gap: 12 },
    stat: { flex: 1, alignItems: 'center', gap: 7, paddingVertical: 14, paddingHorizontal: 6, minHeight: 116, justifyContent: 'center' },
    statValue: { color: colors.text, fontSize: 22, fontWeight: '800' },
    statLabel: { color: colors.muted, fontSize: 10.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center' },
    resumeTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 8 },
    resumeSub: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 3, marginBottom: 12 },
    quickRow: { flexDirection: 'row', gap: 12 },
    quick: { flex: 1, alignItems: 'flex-start', gap: 9, padding: 14 },
    quickLabel: { color: colors.text, fontSize: 13.5, fontWeight: '700' },
    topicTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
    topicSub: { color: colors.muted, fontSize: 12.5, marginTop: 2 },
    topicRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  });

  return (
    <View style={g.screen} collapsable={false}>
      <FallbackTabHeader
        title={t('tabs.home')}
        right={[{
          icon: <Settings size={21} color={colors.blue} />,
          accessibilityLabel: t('common.settings'),
          onPress: () => router.push('/settings'),
        }]}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior={usesNativeHeader ? 'automatic' : 'never'}
        automaticallyAdjustsScrollIndicatorInsets={usesNativeHeader}
        contentContainerStyle={{ paddingBottom: bottomPad }} showsVerticalScrollIndicator={false}>

        <View style={g.scrollContent}>
          <View>
            <Text style={styles.greeting}>{t('home.greeting')}</Text>
            <Text style={styles.greetingSub}>{t('home.subtitle')}</Text>
          </View>
          <View style={styles.statRow}>
            <AppCard padded={false}>
              <View style={styles.stat}>
                <ProgressRing progress={Object.values(stats.progress).reduce((sum, value) => sum + value, 0) / (TOPICS_DATA.length * 100)} size={56} stroke={5} />
                <Text style={styles.statLabel}>{t('progress.studied')}</Text>
              </View>
            </AppCard>
            <AppCard padded={false}>
              <View style={styles.stat}>
                <Flame size={26} color={colors.orange} />
                <Text style={styles.statValue}>{stats.streak}</Text>
                <Text style={styles.statLabel}>{t('home.streak', { count: stats.streak })}</Text>
              </View>
            </AppCard>
            <AppCard padded={false}>
              <View style={styles.stat}>
                <Layers size={26} color={colors.blue} />
                <Text style={styles.statValue}>{dueCount}</Text>
                <Text style={styles.statLabel}>{t('home.dueToday')}</Text>
              </View>
            </AppCard>
          </View>

          <SectionHeader title={t('home.continueStudying')} />
          <AppCard onPress={() => router.push(`/topic/${resume.id}`)}>
            <Badge label={resume.category} tone="indigo" />
            <Text style={styles.resumeTitle}>{resume.title}</Text>
            <Text style={styles.resumeSub}>{resume.subtitle}</Text>
            <ProgressRing progress={(stats.progress[resume.id] ?? resume.completionPercentage) / 100} size={44} stroke={4} />
          </AppCard>

          <SectionHeader title={t('home.quickActions')} />
          <View style={styles.quickRow}>
            <AppCard style={styles.quick} onPress={() => router.push('/flashcards')}>
              <Layers size={21} color={colors.blue} />
              <Text style={styles.quickLabel}>{t('flashcards.title')}</Text>
            </AppCard>
            <AppCard style={styles.quick} onPress={() => router.push('/triage')}>
              <Siren size={21} color={colors.red} />
              <Text style={styles.quickLabel}>{t('triage.title')}</Text>
            </AppCard>
            <AppCard style={styles.quick} onPress={() => router.push('/progress')}>
              <TrendingUp size={21} color={colors.green} />
              <Text style={styles.quickLabel}>{t('progress.title')}</Text>
            </AppCard>
          </View>

          <SectionHeader title={t('home.highYield')} />
          {highYield.map(topic => (
            <AppCard key={topic.id} onPress={() => router.push(`/topic/${topic.id}`)}>
              <View style={styles.topicRow}>
                <Brain size={20} color={colors.indigo} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.topicTitle}>{topic.title}</Text>
                  <Text style={styles.topicSub}>{t('handbook.readTime', { minutes: topic.readTimeMinutes })}</Text>
                </View>
                <Badge label={'★'.repeat(topic.highYieldRating)} tone="orange" />
              </View>
            </AppCard>
          ))}

          <AppButton label={t('home.reviewNow')} onPress={() => router.push('/flashcards')} full />
        </View>
      </ScrollView>
    </View>
  );
}
