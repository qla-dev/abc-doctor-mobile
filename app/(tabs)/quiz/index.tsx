import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { FallbackTabHeader, useTabScrollPadding } from '@/components/common/TabHeader';
import { useScreenHeader } from '@/hooks/useScreenHeader';
import { useDayControl } from '@/hooks/useDayControl';
import { Clock, Crosshair, GraduationCap, Shuffle, Sliders } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { createGlobalStyles } from '@/theme/styles';
import { AppCard } from '@/components/common/AppCard';
import { Badge } from '@/components/common/Badge';
import { SectionHeader } from '@/components/common/SectionHeader';
import { SectionIntro } from '@/components/common/SectionIntro';
import { StudyStats } from '@/components/common/StudyStats';
import { QUIZ_QUESTIONS_DATA } from '@/data/quizzesData';

export default function QuizScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const bottomPad = useTabScrollPadding();
  const day = useDayControl();
  const usesNativeHeader = useScreenHeader({ title: t('tabs.quiz'),
    leftText: day.leftText,
    right: [{ sfSymbol: 'gearshape', accessibilityLabel: t('common.settings'), identifier: 'settings', onPress: () => router.push('/settings') }],
  });
  const g = createGlobalStyles(colors);

  const modes = [
    { key: 'quick', label: t('quiz.quickFire'), icon: Shuffle, tint: colors.blue, count: 10 },
    { key: 'topic', label: t('quiz.byTopic'), icon: GraduationCap, tint: colors.indigo, count: 20 },
    { key: 'exam', label: t('quiz.examMode'), icon: Clock, tint: colors.orange, count: 40 },
    { key: 'weak', label: t('quiz.weakAreas'), icon: Crosshair, tint: colors.red, count: 15 },
    { key: 'custom', label: t('quiz.custom'), icon: Sliders, tint: colors.green, count: 0 },
  ];

  const styles = StyleSheet.create({
    modeRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
    iconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    modeLabel: { color: colors.text, fontSize: 15.5, fontWeight: '700' },
    modeSub: { color: colors.muted, fontSize: 12.5, marginTop: 2 },
    bankNote: { color: colors.muted, fontSize: 12.5, lineHeight: 18 },
  });

  return (
    <View style={g.screen} collapsable={false}>
      <FallbackTabHeader
        title={t('tabs.quiz')}
        dateLabel={day.dateLabel}
        onDatePress={day.onDatePress}
        chooseDateLabel={day.chooseDateLabel}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior={usesNativeHeader ? 'automatic' : 'never'}
        automaticallyAdjustsScrollIndicatorInsets={usesNativeHeader}
        contentContainerStyle={{ paddingBottom: bottomPad }} showsVerticalScrollIndicator={false}>
        <View style={g.scrollContent}>
          <SectionIntro subtitle={t('quiz.subtitle')} />
          <StudyStats />
          <SectionHeader title={t('quiz.start')} />
          {modes.map(mode => {
            const Icon = mode.icon;
            return (
              <AppCard key={mode.key} onPress={() => router.push('/quiz/player')}>
                <View style={styles.modeRow}>
                  <View style={[styles.iconWrap, { backgroundColor: mode.tint + '22' }]}>
                    <Icon size={21} color={mode.tint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modeLabel}>{mode.label}</Text>
                    <Text style={styles.modeSub}>
                      {mode.count > 0 ? `${mode.count} ${t('quiz.title').toLowerCase()}` : t('quiz.custom')}
                    </Text>
                  </View>
                  {mode.count > 0 ? <Badge label={String(mode.count)} tone="blue" /> : null}
                </View>
              </AppCard>
            );
          })}

          <SectionHeader title={t('progress.recentQuizzes')} />
          <AppCard>
            <Text style={styles.bankNote}>
              {QUIZ_QUESTIONS_DATA.length} vignettes in the bank across{' '}
              {new Set(QUIZ_QUESTIONS_DATA.map(q => q.category)).size} categories.
            </Text>
          </AppCard>
        </View>
      </ScrollView>
      {day.sheet}
    </View>
  );
}
