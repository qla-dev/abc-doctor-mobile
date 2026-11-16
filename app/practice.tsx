import { modeLabels } from '@/lib/conversationMode';
import { useConversationPreferences } from '@/stores/conversationPreferences';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Stethoscope, Play, MessageCircle, CheckCircle, XCircle, AlertTriangle, Award, ChevronRight, RefreshCw, Shuffle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Practice, type Workflow, type Attempt } from '@/services/practice';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { AppCard } from '@/components/common/AppCard';
import { AppButton } from '@/components/common/AppButton';
import { SectionHeader } from '@/components/common/SectionHeader';
import { createGlobalStyles } from '@/theme/styles';
import { AGE_BANDS, type AgeBand, type GenderChoice } from '@/lib/caseGenerator';

const SECTION_LABELS: Record<string, string> = {
  strengths: 'Strengths',
  improvements: 'Areas for Improvement',
  critical_errors: 'Critical Errors',
};

const SECTION_COLORS: Record<string, (c: any) => string> = {
  strengths: (c) => c.green,
  improvements: (c) => c.orange,
  critical_errors: (c) => c.red,
};

export default function PracticeScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId?: string }>();
  const id = Number(conversationId);
  const { colors } = useTheme();
  const { t } = useLanguage();
  const g = createGlobalStyles(colors);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [gender, setGender] = useState<GenderChoice>('any');
  const [ageBand, setAgeBand] = useState<AgeBand>('35-54');
  const conversationMode = useConversationPreferences(s => s.mode);

  const refresh = useCallback(async () => {
    try {
      if (id) setAttempt(await Practice.attempt(id));
      else setWorkflows(await Practice.workflows());
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  useEffect(() => {
    if (attempt?.status !== 'evaluating') return;
    const timer = setInterval(() => void refresh(), 3000);
    return () => clearInterval(timer);
  }, [attempt?.status, refresh]);

  const run = async (task: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try { await task(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const start = (workflow?: number) =>
    run(async () => {
      const c = await Practice.start(workflow, gender, ageBand);
      router.push({ pathname: '/practice', params: { conversationId: String(c.id) } });
    });

  const finish = () =>
    run(async () => { await Practice.finish(id); await refresh(); });

  const report = attempt?.report;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={g.screen}
      contentContainerStyle={g.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: id ? 'Practice encounter' : 'Practice' }} />

      {error ? (
        <AppCard>
          <View style={s.errorRow}>
            <AlertTriangle size={18} color={colors.red} />
            <Text style={[s.errorText, { color: colors.red }]}>{error}</Text>
          </View>
          <AppButton label="Pokušaj ponovo" tone="danger" onPress={() => void refresh()} full />
        </AppCard>
      ) : null}

      <AppCard onPress={() => router.push('/conversation-mode')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={[s.modeLabel, { color: colors.muted }]}>CONVERSATION MODE</Text>
            <Text style={[s.modeValue, { color: colors.blue }]}>{modeLabels[conversationMode]}</Text>
          </View>
          <ChevronRight size={16} color={colors.muted} />
        </View>
      </AppCard>

      {/* ── Workflow selector ──────────────────────────────── */}
      {!id ? (
        <>
          <View style={s.hero}>
            <View style={[s.heroIcon, { backgroundColor: colors.blue + '18' }]}>
              <Stethoscope size={28} color={colors.blue} />
            </View>
            <Text style={[s.heroTitle, { color: colors.text }]}>Practice</Text>
            <Text style={[s.heroDesc, { color: colors.muted }]}>
              Enable the workflows you want. Your patient case is a surprise.
            </Text>
          </View>

          <AppCard>
            <View style={s.chipRow}>
              <Text style={[s.chipLabel, { color: colors.muted }]}>{t('setup.gender')}</Text>
              <View style={s.chipGroup}>
                {([['any', t('setup.anyGender')], ['M', t('setup.male')], ['F', t('setup.female')]] as const).map(([v, label]) => (
                  <Pressable key={v} onPress={() => { void Haptics.selectionAsync(); setGender(v as GenderChoice); }} style={[s.chip, { backgroundColor: gender === v ? colors.blue : colors.input }]}>
                    <Text style={[s.chipText, { color: gender === v ? '#FFF' : colors.text }]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={s.chipRow}>
              <Text style={[s.chipLabel, { color: colors.muted }]}>{t('setup.age')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ flex: 1 }}>
                {AGE_BANDS.map(band => (
                  <Pressable key={band} onPress={() => { void Haptics.selectionAsync(); setAgeBand(band); }} style={[s.chip, { backgroundColor: ageBand === band ? colors.blue : colors.input }]}>
                    <Text style={[s.chipText, { color: ageBand === band ? '#FFF' : colors.text }]}>{band}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </AppCard>

          <AppButton
            label={busy ? 'Starting…' : 'Surprise me'}
            icon={busy
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Shuffle size={18} color="#FFF" />}
            disabled={busy || !workflows.some(w => w.enabled)}
            onPress={() => void start()}
            full
          />

          {workflows.length > 0 && <SectionHeader title="Workflows" />}

          {workflows.map(w => (
            <AppCard key={w.id}>
              <View style={s.workflowHeader}>
                <Text style={[s.workflowName, { color: colors.text }]} numberOfLines={2}>
                  {w.name}
                </Text>
                <Switch
                  accessibilityLabel={`Enable ${w.name}`}
                  value={w.enabled}
                  disabled={busy}
                  trackColor={{ true: colors.blue, false: colors.input }}
                  onValueChange={(enabled) =>
                    void run(async () => {
                      const next = workflows.map(x => x.id === w.id ? { ...x, enabled } : x);
                      await Practice.preferences(next.filter(x => !x.enabled).map(x => x.id));
                      setWorkflows(next);
                    })
                  }
                />
              </View>
              <Text style={[s.workflowPurpose, { color: colors.muted }]}>{w.purpose}</Text>
              <View style={{ marginTop: 10 }}>
                <AppButton
                  label="Start workflow"
                  tone="secondary"
                  icon={<Play size={16} color={colors.text} />}
                  disabled={busy || !w.enabled}
                  onPress={() => { void Haptics.selectionAsync(); void start(w.id); }}
                  full
                />
              </View>
            </AppCard>
          ))}

          {!workflows.length && !error ? (
            <AppCard>
              <Text style={[s.emptyText, { color: colors.muted }]}>
                No published workflows yet. Your administrator can add and publish starter examples.
              </Text>
            </AppCard>
          ) : null}
        </>
      ) : null}

      {/* ── Active attempt ─────────────────────────────────── */}
      {attempt ? (
        <>
          <AppCard>
            <Text style={[s.briefText, { color: colors.text }]}>{attempt.brief}</Text>
          </AppCard>

          {attempt.status === 'active' ? (
            <>
              <AppButton
                label="Open conversation"
                icon={<MessageCircle size={18} color="#FFF" />}
                onPress={() => {
                  void Haptics.selectionAsync();
                  router.push({ pathname: '/mark', params: { conversationId: String(id), practice: '1' } });
                }}
                full
              />
              <AppButton
                label={busy ? 'Finishing…' : 'Finish and review'}
                tone="dark"
                icon={busy ? <ActivityIndicator size="small" /> : <CheckCircle size={18} color={colors.text} />}
                disabled={busy}
                onPress={() => void finish()}
                full
              />
            </>
          ) : null}

          {attempt.status === 'evaluating' ? (
            <AppCard>
              <View style={s.evaluatingRow}>
                <ActivityIndicator color={colors.blue} />
                <Text style={[s.evaluatingText, { color: colors.muted }]}>Preparing your feedback…</Text>
              </View>
            </AppCard>
          ) : null}

          {attempt.status === 'evaluation_failed' ? (
            <AppCard>
              <View style={s.errorRow}>
                <XCircle size={18} color={colors.red} />
                <Text style={[s.errorText, { color: colors.red }]}>
                  Feedback could not be generated. Your encounter is saved.
                </Text>
              </View>
              <View style={{ marginTop: 10 }}>
                <AppButton
                  label="Retry evaluation"
                  tone="danger"
                  icon={<RefreshCw size={16} color={colors.red} />}
                  disabled={busy}
                  onPress={() => void finish()}
                  full
                />
              </View>
            </AppCard>
          ) : null}
        </>
      ) : null}

      {/* ── Report / debrief ───────────────────────────────── */}
      {report ? (
        <>
          <AppCard>
            <View style={s.scoreHeader}>
              <View style={[s.scoreIcon, { backgroundColor: colors.green + '18' }]}>
                <Award size={24} color={colors.green} />
              </View>
              <Text style={[s.scoreTitle, { color: colors.text }]}>
                {report.provisional ? 'Provisional feedback' : 'Your feedback'}
              </Text>
              {report.score !== null && (
                <View style={[s.scoreBadge, { backgroundColor: colors.blue + '18' }]}>
                  <Text style={[s.scoreValue, { color: colors.blue }]}>{report.score}/100</Text>
                </View>
              )}
            </View>
            <Text style={[s.summaryText, { color: colors.text }]}>{report.summary}</Text>
          </AppCard>

          {(['strengths', 'improvements', 'critical_errors'] as const).map(key =>
            report[key].length ? (
              <View key={key}>
                <SectionHeader title={SECTION_LABELS[key]} />
                <AppCard>
                  {report[key].map((item, i) => (
                    <View key={i} style={s.bulletRow}>
                      <View style={[s.bulletDot, { backgroundColor: SECTION_COLORS[key](colors) }]} />
                      <Text style={[s.bulletText, { color: colors.text }]}>{item}</Text>
                    </View>
                  ))}
                </AppCard>
              </View>
            ) : null,
          )}

          {report.criteria.length > 0 && <SectionHeader title="Criteria" />}
          {report.criteria.map((c, i) => (
            <AppCard key={i}>
              <View style={s.criteriaHeader}>
                <Text style={[s.criteriaTitle, { color: colors.text }]}>{c.text}</Text>
                <View style={[s.statusBadge, {
                  backgroundColor: c.status === 'met' ? colors.green + '18'
                    : c.status === 'not_met' ? colors.red + '18'
                    : colors.orange + '18',
                }]}>
                  <Text style={[s.statusText, {
                    color: c.status === 'met' ? colors.green
                      : c.status === 'not_met' ? colors.red
                      : colors.orange,
                  }]}>
                    {c.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>
              <Text style={[s.criteriaFeedback, { color: colors.muted }]}>{c.feedback}</Text>
              {c.excerpts?.map((quote, q) => (
                <View key={q} style={[s.quoteBox, { backgroundColor: colors.input }]}>
                  <Text style={[s.quoteRole, { color: colors.secondaryText }]}>{quote.role}</Text>
                  <Text style={[s.quoteText, { color: colors.text }]}>"{quote.text}"</Text>
                </View>
              ))}
            </AppCard>
          ))}

          <AppButton
            label="View conversation evidence"
            tone="secondary"
            icon={<MessageCircle size={16} color={colors.text} />}
            onPress={() => router.push({ pathname: '/mark', params: { conversationId: String(id) } })}
            full
          />
          <AppButton
            label="Practice another case"
            icon={<RefreshCw size={16} color="#FFF" />}
            onPress={() => router.push('/practice')}
            full
          />
        </>
      ) : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  modeLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
  modeValue: { fontSize: 15, fontWeight: '600' },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  chipLabel: { width: 62, fontSize: 11.5, fontWeight: '700' },
  chipGroup: { flexDirection: 'row', gap: 6, flex: 1 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: '700' },
  hero: { alignItems: 'center', gap: 6, paddingVertical: 12 },
  heroIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  heroDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },
  workflowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  workflowName: { fontWeight: '700', fontSize: 17, flex: 1 },
  workflowPurpose: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  errorText: { fontSize: 14, fontWeight: '600', flex: 1 },
  briefText: { fontSize: 16, lineHeight: 24 },
  evaluatingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  evaluatingText: { fontSize: 14, fontWeight: '600' },
  scoreHeader: { alignItems: 'center', gap: 8, paddingBottom: 12 },
  scoreIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  scoreTitle: { fontSize: 18, fontWeight: '800' },
  scoreBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  scoreValue: { fontSize: 16, fontWeight: '800' },
  summaryText: { fontSize: 14, lineHeight: 21 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 5 },
  bulletDot: { width: 7, height: 7, borderRadius: 3.5, marginTop: 6 },
  bulletText: { fontSize: 14, lineHeight: 20, flex: 1 },
  criteriaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 },
  criteriaTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  criteriaFeedback: { fontSize: 13, lineHeight: 19 },
  quoteBox: { marginTop: 8, padding: 12, borderRadius: 12 },
  quoteRole: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  quoteText: { fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
});
