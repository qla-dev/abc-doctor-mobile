import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { FallbackTabHeader, useTabScrollPadding } from '@/components/common/TabHeader';
import { useScreenHeader } from '@/hooks/useScreenHeader';
import { useDayControl } from '@/hooks/useDayControl';
import { SpecialtySearchField, SpecialtyCards } from '@/components/common/SpecialtyRow';
import { SectionIntro } from '@/components/common/SectionIntro';
import { Brain, Layers, MessagesSquare, Settings, Siren, TrendingUp } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { createGlobalStyles } from '@/theme/styles';
import { AppCard } from '@/components/common/AppCard';
import { AppButton } from '@/components/common/AppButton';
import { Badge } from '@/components/common/Badge';
import { SectionHeader } from '@/components/common/SectionHeader';
import { ProgressRing } from '@/components/common/ProgressRing';
import { TOPICS_DATA } from '@/data/topicsData';
import { Progress } from '@/services/storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const bottomPad = useTabScrollPadding();
  // The bar starts empty. The greeting is this screen's own heading, and the product name only
  // slides into the bar once that heading has scrolled away — there is no large title to tuck up,
  // because the large title and the collapsed bar title are one string natively and these two
  // differ. fitness's SettingsScreen builds the same effect from a nativeTitle and a threshold.
  const [showBarTitle, setShowBarTitle] = useState(false);
  // The day is the store's, not this screen's: the control is on every tab and the day has to be
  // the same one on all of them. Nothing reads it yet — the calendar is a control without a
  // consumer, on purpose, until there is day-scoped content for it to move.
  const day = useDayControl();
  const usesNativeHeader = useScreenHeader({ title: t('common.appName'),
    nativeTitle: showBarTitle ? t('common.appName') : '',
    leftText: day.leftText,
    right: [
      { sfSymbol: 'bubble.left.and.bubble.right', accessibilityLabel: t('history.title'), identifier: 'history', onPress: () => router.push('/history') },
      { sfSymbol: 'gearshape', accessibilityLabel: t('common.settings'), identifier: 'settings', onPress: () => router.push('/settings') }],
    nativeOptions: {
      headerLargeTitleEnabled: false,
      headerLargeTitleShadowVisible: false,
      headerTransparent: true,
      headerShadowVisible: false,
    },
  });
  const g = createGlobalStyles(colors);

  // Re-read on focus: coming back from a review session must show the new counts, and these
  // are synchronous MMKV reads so there is no loading state to manage.
  const [progress, setProgress] = useState(Progress.all);
  useFocusEffect(useCallback(() => setProgress(Progress.all()), []));
  const inProgress = TOPICS_DATA.filter(topic => topic.completionPercentage > 0 && topic.completionPercentage < 100);
  const resume = inProgress[0] ?? TOPICS_DATA[0];
  const highYield = TOPICS_DATA.filter(topic => topic.highYieldRating >= 4).slice(0, 3);

  const styles = StyleSheet.create({
    greetingBlock: { paddingTop: 5 },
    greeting: { color: colors.text, fontSize: 34, fontWeight: '700' },
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
        title={t('common.appName')}
        dateLabel={day.dateLabel}
        onDatePress={day.onDatePress}
        chooseDateLabel={day.chooseDateLabel}
        right={[{
          icon: <MessagesSquare size={21} color={colors.blue} />,
          accessibilityLabel: t('history.title'),
          onPress: () => router.push('/history'),
        }, {
          icon: <Settings size={21} color={colors.blue} />,
          accessibilityLabel: t('common.settings'),
          onPress: () => router.push('/settings'),
        }]}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior={usesNativeHeader ? 'automatic' : 'never'}
        automaticallyAdjustsScrollIndicatorInsets={usesNativeHeader}
        scrollEventThrottle={16}
        onScroll={({ nativeEvent }) => {
          // Once iOS has applied its own inset, contentOffset.y rests at -contentInset.top, so the
          // two are added for the threshold to mean "moved away from the top" rather than "past 16".
          const offset = nativeEvent.contentOffset.y + nativeEvent.contentInset.top;
          setShowBarTitle(offset > 16);
        }}
        contentContainerStyle={{ paddingBottom: bottomPad }} showsVerticalScrollIndicator={false}>

        <View style={g.scrollContent}>
          <View style={styles.greetingBlock}>
            <Text style={styles.greeting}>{t('home.greeting')}</Text>
            <SectionIntro subtitle={t('home.subtitle')} style={{ marginTop: 10, marginBottom: 6 }} />
          </View>
          <View style={{ marginTop: -2 }}>
            <SpecialtySearchField
              placeholder={t('handbook.search')}
              onPress={() => router.push('/handbook')}
            />
          </View>

          <SpecialtyCards
            onSelect={category => router.push({ pathname: '/handbook', params: { q: category } })}
          />

          <SectionHeader title={t('home.continueStudying')} />
          <AppCard onPress={() => router.push(`/topic/${resume.id}`)}>
            <Badge label={resume.category} tone="indigo" />
            <Text style={styles.resumeTitle}>{resume.title}</Text>
            <Text style={styles.resumeSub}>{resume.subtitle}</Text>
            <ProgressRing progress={(progress[resume.id] ?? resume.completionPercentage) / 100} size={44} stroke={4} />
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
      {day.sheet}
    </View>
  );
}
