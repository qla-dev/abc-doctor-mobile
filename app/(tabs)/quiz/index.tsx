import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { FallbackTabHeader, useTabScrollPadding } from '@/components/common/TabHeader';
import { useScreenHeader } from '@/hooks/useScreenHeader';
import { useDayControl } from '@/hooks/useDayControl';
import { CheckCheck, Clock, Crosshair, GraduationCap, Layers, ListChecks, MessageSquareText, MessagesSquare, Settings, Shuffle, Sliders } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { createGlobalStyles } from '@/theme/styles';
import { AppCard } from '@/components/common/AppCard';
import { Badge } from '@/components/common/Badge';
import { SectionHeader } from '@/components/common/SectionHeader';
import { SectionIntro } from '@/components/common/SectionIntro';
import { StudyStats } from '@/components/common/StudyStats';
import { ChoiceCards, type Choice } from '@/components/common/ChoiceCards';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { AppButton } from '@/components/common/AppButton';
import { QUIZ_QUESTIONS_DATA } from '@/data/quizzesData';

type TestKind = 'flashcards' | 'multiple' | 'truefalse' | 'open';

export default function QuizScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const bottomPad = useTabScrollPadding();
  const day = useDayControl();
  const usesNativeHeader = useScreenHeader({ title: t('tabs.tests'),
    leftText: day.leftText,
    right: [
      { sfSymbol: 'bubble.left.and.bubble.right', accessibilityLabel: t('history.title'), identifier: 'history', onPress: () => router.push('/history') },
      { sfSymbol: 'gearshape', accessibilityLabel: t('common.settings'), identifier: 'settings', onPress: () => router.push('/settings') }],
  });
  const g = createGlobalStyles(colors);

  /**
   * A test is two choices, not one: what KIND of question it asks, and how the answer is given.
   * Both are picked before anything starts, the way the simulator picks its case.
   */
  const [kind, setKind] = useState<TestKind>('flashcards');
  const [answerBy, setAnswerBy] = useState<'text' | 'voice'>('text');

  const kinds: Choice<TestKind>[] = [
    { value: 'flashcards', label: t('quiz.flashcards'), hint: t('quiz.flashcardsHint'), tone: 'blue',
      icon: p => <Layers {...p} /> },
    { value: 'multiple', label: t('quiz.multipleChoice'), hint: t('quiz.multipleChoiceHint'), tone: 'indigo',
      icon: p => <ListChecks {...p} /> },
    { value: 'truefalse', label: t('quiz.trueFalse'), hint: t('quiz.trueFalseHint'), tone: 'green',
      icon: p => <CheckCheck {...p} /> },
    { value: 'open', label: t('quiz.openQuestion'), hint: t('quiz.openQuestionHint'), tone: 'orange',
      icon: p => <MessageSquareText {...p} /> },
  ];

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
        title={t('tabs.tests')}
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
        contentContainerStyle={{ paddingBottom: bottomPad }} showsVerticalScrollIndicator={false}>
        <View style={g.scrollContent}>
          <SectionIntro subtitle={t('quiz.subtitle')} />
          <StudyStats />

          <SectionHeader title={t('quiz.kind')} />
          <ChoiceCards options={kinds} value={kind} onChange={setKind} />

          {/* Only an open question can be spoken — there is nothing to say out loud about
              picking B over C, so the control appears when it means something. */}
          {kind === 'open' ? (
            <>
              <SectionHeader title={t('quiz.answerBy')} />
              <SegmentedControl<'text' | 'voice'>
                value={answerBy}
                onChange={setAnswerBy}
                options={[
                  { value: 'text', label: t('quiz.answerText') },
                  { value: 'voice', label: t('quiz.answerVoice') },
                ]}
              />
            </>
          ) : null}

          <SectionHeader title={t('quiz.start')} />
          {modes.map(mode => {
            const Icon = mode.icon;
            return (
              <AppCard
                key={mode.key}
                onPress={() => router.push(kind === 'flashcards'
                  ? { pathname: '/flashcards', params: { mode: mode.key } }
                  : { pathname: '/quiz/player', params: { mode: mode.key, kind, answerBy } })}
              >
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
