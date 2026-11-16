import { currentMode } from '@/stores/conversationPreferences';
import { resolveMode } from '@/lib/conversationMode';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import { FallbackTabHeader, useTabBarClearance } from '@/components/common/TabHeader';
import { useScreenHeader } from '@/hooks/useScreenHeader';
import { useDayControl } from '@/hooks/useDayControl';
import {
  Brain, ChevronRight, ClipboardList, Ear, MessageSquareText, MessagesSquare, Mic,
  Search, Settings, Stethoscope, X,
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { createGlobalStyles } from '@/theme/styles';
import { AppCard } from '@/components/common/AppCard';
import { Mark, type Modality, type MarkSkill } from '@/services/mark';
import { ApiError } from '@/lib/api';
import { Practice, type Workflow } from '@/services/practice';
import { SectionHeader } from '@/components/common/SectionHeader';
import { matchesCatalogSearch } from '@/lib/catalogSearch';

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
 * Search filters the available modes and practice workflows. A conversation opens only when
 * the learner chooses a mode; workflows open their setup before anything starts.
 */
export default function AiScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const g = createGlobalStyles(colors);
  const clearance = useTabBarClearance();

  const [skills, setSkills] = useState<MarkSkill[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [skillsError, setSkillsError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [query, setQuery] = useState('');
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [workflowsError, setWorkflowsError] = useState<string | null>(null);
  const [loadingWorkflows, setLoadingWorkflows] = useState(true);

  useEffect(() => {
    let alive = true;
    Mark.skills()
      .then(list => { if (alive) setSkills(list); })
      .catch((e: ApiError) => { if (alive) setSkillsError(e.message); })
      .finally(() => { if (alive) setLoadingSkills(false); });
    return () => { alive = false; };
  }, []);

  useFocusEffect(useCallback(() => {
    let alive = true;
    setLoadingWorkflows(true);
    Practice.workflows()
      .then(list => { if (alive) { setWorkflows(list); setWorkflowsError(null); } })
      .catch((e: ApiError) => { if (alive) setWorkflowsError(e.message); })
      .finally(() => { if (alive) setLoadingWorkflows(false); });
    return () => { alive = false; };
  }, []));

  const searching = Boolean(query.trim());
  const filteredSkills = skills.filter(skill => matchesCatalogSearch(query, skill.name, skill.description, skill.key, t('ai.modes')));
  const filteredWorkflows = workflows.filter(workflow => matchesCatalogSearch(query, workflow.name, workflow.purpose, t('ai.workflows'), t('ai.practiceTitle')));

  /**
   * Every way in comes through here: the thread is opened first, so the chat screen is a
   * conversation from its first frame rather than a spinner that becomes one.
   */
  const begin = async (
    key: string,
    modality: Modality,
  ) => {
    if (starting) return;
    setStarting(true);
    setSkillsError(null);
    try {
      const thread = await Mark.startConversation(key, modality);
      router.push({
        pathname: '/mark',
        params: {
          conversationId: String(thread.id),
          // A spoken thread arrives with the line already open; a written one does not.
          ...(currentMode() === 'high_quality_voice' ? { autoVoice: '1' } : {}),
        },
      });
    } catch (e) {
      setSkillsError((e as ApiError).message);
    } finally {
      setStarting(false);
    }
  };

  const open = (skill: MarkSkill) => {
    if (skill.key === 'patient_simulator') {
      router.push('/patient-simulator');
      return;
    }
    if (!resolveMode(currentMode(), skill).compatible) { setSkillsError('This role requires voice input. Select a voice mode.'); return; }
    void begin(skill.key, resolveMode(currentMode(), skill).input);
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
    search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.input, borderRadius: 16, paddingHorizontal: 14 },
    searchInput: { flex: 1, minWidth: 0, minHeight: 48, color: colors.text, fontSize: 15 },
  });

  return (
    <View style={g.screen} collapsable={false}>
      {usesNativeHeader ? <Stack.SearchBar
        placeholder={t('ai.searchPlaceholder')}
        autoFocus={false}
        autoCapitalize="none"
        hideWhenScrolling={false}
        onChangeText={event => setQuery(event.nativeEvent.text)}
        onCancelButtonPress={() => setQuery('')}
        onSearchButtonPress={() => Keyboard.dismiss()}
      /> : null}
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
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={g.scrollContent}>
          {!usesNativeHeader ? (
            <View style={styles.search}>
              <Search size={18} color={colors.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('ai.searchPlaceholder')}
                accessibilityLabel={t('ai.searchPlaceholder')}
                placeholderTextColor={colors.muted}
                autoFocus={false}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={() => Keyboard.dismiss()}
                style={styles.searchInput}
              />
              {query ? (
                <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel={t('ai.clearSearch')} hitSlop={10}>
                  <X size={18} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {skillsError ? <Text style={styles.skillError}>{skillsError}</Text> : null}
          {loadingSkills ? <ActivityIndicator color={colors.blue} /> : null}

          {searching && filteredSkills.length > 0 ? <SectionHeader title={t('ai.modes')} /> : null}
          {filteredSkills.flatMap(skill => {
            const look = LOOK[skill.key] ?? { icon: Brain, tone: 'blue' as Tone };
            const Icon = look.icon;

            const card = (
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
                  <ChevronRight size={16} color={colors.muted} />
                </View>
              </AppCard>
            );

            if (searching || skill.key !== 'patient_simulator') return [card];

            return [card, (
              <AppCard key="practice" onPress={() => router.push('/practice')}>
                <View style={styles.skillRow}>
                  <View style={[styles.iconWrap, { backgroundColor: colors.red + '22' }]}>
                    <ClipboardList size={20} color={colors.red} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.skillLabel}>{t('ai.practiceTitle')}</Text>
                    <Text style={styles.skillDesc} numberOfLines={2}>{t('ai.practiceDescription')}</Text>
                  </View>
                  <ChevronRight size={16} color={colors.muted} />
                </View>
              </AppCard>
            )];
          })}
          {searching ? (
            <>
              {workflowsError ? <Text accessibilityRole="alert" style={styles.skillError}>{workflowsError}</Text> : null}
              {loadingWorkflows ? <ActivityIndicator color={colors.blue} /> : null}
              {filteredWorkflows.length > 0 ? <SectionHeader title={t('ai.workflows')} /> : null}
              {filteredWorkflows.map(workflow => (
                <AppCard key={`workflow-${workflow.id}`} onPress={() => router.push({ pathname: '/practice', params: { workflowId: String(workflow.id) } })}>
                  <View style={styles.skillRow}>
                    <View style={[styles.iconWrap, { backgroundColor: colors.blue + '22' }]}>
                      <ClipboardList size={20} color={colors.blue} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.skillLabel}>{workflow.name}</Text>
                      <Text style={styles.skillDesc} numberOfLines={2}>{workflow.purpose}</Text>
                    </View>
                    <ChevronRight size={16} color={colors.muted} />
                  </View>
                </AppCard>
              ))}
              {!loadingSkills && !loadingWorkflows && !skillsError && !workflowsError && filteredSkills.length === 0 && filteredWorkflows.length === 0 ? (
                <Text style={styles.skillDesc}>{t('ai.noSearchResults')}</Text>
              ) : null}
            </>
          ) : null}
        </View>
      </ScrollView>
      {day.sheet}
    </View>
  );
}
