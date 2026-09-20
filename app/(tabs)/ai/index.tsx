import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { FallbackTabHeader, useTabBarClearance } from '@/components/common/TabHeader';
import { useScreenHeader } from '@/hooks/useScreenHeader';
import { useDayControl } from '@/hooks/useDayControl';
import {
  Brain, ChevronDown, ChevronRight, Ear, MessageSquareText, MessagesSquare, Mic, Settings,
  Stethoscope,
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { createGlobalStyles } from '@/theme/styles';
import { AppCard } from '@/components/common/AppCard';
import { TypingText } from '@/components/common/TypingText';
import { CaseForm } from '@/components/nina/CaseForm';
import { Nina, type Modality, type NinaSkill } from '@/services/nina';
import { API_BACKEND, API_BASE_URL, ApiError } from '@/lib/api';
import { type CaseSetup } from '@/lib/caseGenerator';

type Tone = 'indigo' | 'blue' | 'green' | 'orange' | 'red' | 'cyan';

/** Look per skill key. The server orders them; the patient simulator sits at position 1. */
const LOOK: Record<string, { icon: typeof Brain; tone: Tone }> = {
  patient_simulator: { icon: Stethoscope, tone: 'orange' },
  consultant: { icon: Brain, tone: 'indigo' },
  dictaphone: { icon: Mic, tone: 'green' },
  study_buddy: { icon: Brain, tone: 'blue' },
  whisperer: { icon: Ear, tone: 'cyan' },
};

/**
 * Where a conversation is chosen, not where it is held.
 *
 * The field in the tab bar — this is the search tab, and on iOS 26 the bar becomes that field —
 * starts a consultation from whatever is typed into it. The cards below say what else Nina can
 * be, and the one that needs deciding first, the simulated patient, unfolds its case here
 * rather than on a screen of its own. Every one of them opens the same chat screen, already
 * holding a thread and ready to be spoken to.
 */
export default function AiScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const g = createGlobalStyles(colors);
  const clearance = useTabBarClearance();

  const [skills, setSkills] = useState<NinaSkill[]>([]);
  const [skillsError, setSkillsError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  /**
   * The case. The simulator used to be a screen of its own to hold these four choices; they are
   * four rows, and a whole screen to reach them made the one skill you have to configure the one
   * skill you could not simply start.
   */
  const [setup, setSetup] = useState<CaseSetup>({
    difficulty: 'medium', specialty: 'any', gender: 'any', ageBand: '35-54',
  });
  const [caseOpen, setCaseOpen] = useState(false);
  const patch = (next: Partial<CaseSetup>) => setSetup(current => ({ ...current, ...next }));

  useEffect(() => {
    Nina.skills().then(setSkills).catch((e: ApiError) => setSkillsError(e.message));
  }, []);

  /**
   * Every way in comes through here: the thread is opened first, so the chat screen is a
   * conversation from its first frame rather than a spinner that becomes one.
   */
  const begin = async (
    key: string,
    modality: Modality,
    extra: Record<string, string> = {},
    context?: string,
    sex?: string,
  ) => {
    if (starting) return;
    setStarting(true);
    setSkillsError(null);
    try {
      const thread = await Nina.startConversation(key, modality, undefined, context, sex);
      router.push({
        pathname: '/nina',
        params: {
          conversationId: String(thread.id),
          // A spoken thread arrives with the line already open; a written one does not.
          ...(modality === 'voice' ? { autoVoice: '1' } : {}),
          ...extra,
        },
      });
    } catch (e) {
      setSkillsError((e as ApiError).message);
    } finally {
      setStarting(false);
    }
  };

  /** A question typed into the tab's field. Nina is not a list to search, so it opens one. */
  const ask = (text: string) => {
    const question = text.trim();
    if (question) void begin('consultant', 'text', { seed: question });
  };

  /** A skill card. The simulator opens its four choices in place; the rest just start. */
  const open = (skill: NinaSkill) => {
    if (skill.key === 'patient_simulator') {
      setCaseOpen(current => !current);

      return;
    }
    void begin(skill.key, skill.supports_text ? 'text' : 'voice');
  };

  /**
   * The setup only matters if it reaches the patient, so it goes over as the thread's context —
   * Nina plays the case that was asked for rather than inventing one — and rides along as params
   * for the vitals and the two actions the chat keeps with its composer.
   */
  const startCase = (modality: Modality) => {
    const context = [
      `Pacijent: ${setup.ageBand} godina`,
      setup.gender === 'any' ? null : setup.gender === 'M' ? 'muškarac' : 'žena',
      setup.specialty === 'any' ? null : `oblast: ${setup.specialty}`,
      `težina slučaja: ${t('setup.' + setup.difficulty)}`,
    ].filter(Boolean).join(', ') + '.';

    void begin('patient_simulator', modality, { ...setup }, context, setup.gender);
  };

  const day = useDayControl();
  const usesNativeHeader = useScreenHeader({ title: t('tabs.ai'),
    leftText: day.leftText,
    right: [
      { sfSymbol: 'bubble.left.and.bubble.right', accessibilityLabel: t('history.title'), identifier: 'history', onPress: () => router.push('/history') },
      { sfSymbol: 'gearshape', accessibilityLabel: t('common.settings'), identifier: 'settings', onPress: () => router.push('/settings') }],
  });

  const tintFor = (tone: Tone) => ({
    indigo: colors.indigo, blue: colors.blue, green: colors.green,
    orange: colors.orange, red: colors.red, cyan: colors.cyan,
  })[tone];

  const styles = StyleSheet.create({
    skillRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    skillLabel: { color: colors.text, fontSize: 15, fontWeight: '700' },
    skillDesc: { color: colors.muted, fontSize: 12.5, marginTop: 2 },
    skillError: { color: colors.red, fontSize: 13.5 },
    modeIcons: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    greeting: { color: colors.text, fontSize: 15.5, lineHeight: 21 },
    backend: { color: colors.muted, fontSize: 11 },
  });

  return (
    <View style={g.screen} collapsable={false}>
      {/* The tab bar is the field: iOS 26 turns a search tab's bar into one, and it is focused
          the moment you get here, so asking Nina something is a tap and then typing. */}
      <Stack.SearchBar
        placeholder={t('ai.placeholder')}
        autoFocus
        onSearchButtonPress={event => ask(event.nativeEvent.text)}
      />
      <FallbackTabHeader
        title={t('tabs.ai')}
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
        contentContainerStyle={{ paddingBottom: clearance }}
        showsVerticalScrollIndicator={false}
      >
        <View style={g.scrollContent}>
          <TypingText text={t('ai.greeting')} style={styles.greeting} />
          {skillsError ? <Text style={styles.skillError}>{skillsError}</Text> : null}

          {skills.map(skill => {
            const look = LOOK[skill.key] ?? { icon: Brain, tone: 'blue' as Tone };
            const Icon = look.icon;

            return (
              <AppCard key={skill.id} onPress={() => open(skill)}>
                <View style={styles.skillRow}>
                  <View style={[styles.iconWrap, { backgroundColor: tintFor(look.tone) + '22' }]}>
                    <Icon size={20} color={tintFor(look.tone)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.skillLabel}>{skill.name}</Text>
                    {skill.description ? (
                      <Text style={styles.skillDesc} numberOfLines={2}>{skill.description}</Text>
                    ) : null}
                  </View>
                  <View style={styles.modeIcons}>
                    {skill.supports_text ? <MessageSquareText size={17} color={colors.blue} /> : null}
                    {skill.supports_voice ? <Mic size={17} color={colors.indigo} /> : null}
                  </View>
                  {/* The simulator opens its choices in place, so it points down at them. */}
                  {skill.key === 'patient_simulator' && caseOpen
                    ? <ChevronDown size={16} color={colors.muted} />
                    : <ChevronRight size={16} color={colors.muted} />}
                </View>
              </AppCard>
            );
          })}

          {/* Choosing the simulator is one more step, not one more screen. */}
          {caseOpen ? (
            <AppCard>
              <CaseForm setup={setup} onChange={patch} onStart={startCase} starting={starting} />
            </AppCard>
          ) : null}

          {/* The first question when nothing answers is which backend it was talking to. */}
          <Text style={styles.backend}>{API_BACKEND} · {API_BASE_URL}</Text>
        </View>
      </ScrollView>
      {day.sheet}
    </View>
  );
}
