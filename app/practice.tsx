import { modeLabels } from '@/lib/conversationMode';
import { useConversationPreferences } from '@/stores/conversationPreferences';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  Stethoscope, Play, MessageCircle, CheckCircle, XCircle, AlertTriangle,
  Award, ChevronRight, RefreshCw, Shuffle, ClipboardList, Search,
  Microscope, HeartPulse, Syringe, Star,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Practice, type Workflow, type Attempt } from '@/services/practice';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { AppCard } from '@/components/common/AppCard';
import { AppButton } from '@/components/common/AppButton';
import { Badge } from '@/components/common/Badge';
import { SectionHeader } from '@/components/common/SectionHeader';
import { createGlobalStyles } from '@/theme/styles';

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
  const { conversationId, workflowId } = useLocalSearchParams<{ conversationId?: string; workflowId?: string }>();
  const id = Number(conversationId);
  const selectedWorkflowId = Number(workflowId);
  const { colors } = useTheme();
  const { t } = useLanguage();
  const g = createGlobalStyles(colors);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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
      const c = await Practice.start(workflow);
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
      <Stack.Screen options={{ title: id ? 'Procedure' : 'Procedure' }} />

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
            <Text style={[s.heroTitle, { color: colors.text }]}>Procedure</Text>
            <Text style={[s.heroDesc, { color: colors.muted }]}>
              Odaberi procedure koje želiš vježbati. Pacijent je iznenađenje.
            </Text>
          </View>

          {!selectedWorkflowId ? <AppButton
            label={busy ? 'Starting…' : 'Surprise me'}
            icon={busy
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Shuffle size={18} color="#FFF" />}
            disabled={busy || !workflows.some(w => w.enabled)}
            onPress={() => void start()}
            full
          /> : null}

          {workflows.length > 0 && <SectionHeader title="Workflows" />}

          {selectedWorkflowId && workflows.length > 0 && !workflows.some(w => w.id === selectedWorkflowId) ? (
            <AppCard><Text style={[s.emptyText, { color: colors.muted }]}>{t('ai.workflowUnavailable')}</Text></AppCard>
          ) : null}

          {workflows.map((w, index) => {
            if (selectedWorkflowId && w.id !== selectedWorkflowId) return null;
            const ICONS = [ClipboardList, Stethoscope, Search, Microscope, HeartPulse, Syringe];
            const TINTS = [colors.blue, colors.green, colors.orange, colors.indigo, colors.red, colors.blue];
            const Icon = ICONS[index % ICONS.length];
            const tint = TINTS[index % TINTS.length];

            return (
              <AppCard key={w.id}>
                <View style={s.workflowHeader}>
                  <View style={[s.workflowIcon, { backgroundColor: tint + '22' }]}>
                    <Icon size={21} color={tint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[s.workflowName, { color: colors.text }]} numberOfLines={2}>
                        {w.name}
                      </Text>
                      <Badge label={`#${index + 1}`} tone={w.enabled ? 'blue' : 'muted'} />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                      {[1, 2, 3].map(star => (
                        <Star
                          key={star}
                          size={11}
                          color={colors.orange}
                          fill={star <= Math.min(3, index + 1) ? colors.orange : 'transparent'}
                        />
                      ))}
                    </View>
                  </View>
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
                <Pressable
                  onPress={() => { void Haptics.selectionAsync(); void start(w.id); }}
                  disabled={busy || !w.enabled}
                  style={[
                    s.workflowStartBtn,
                    { backgroundColor: w.enabled ? tint : colors.input },
                    (!w.enabled || busy) && { opacity: 0.5 },
                  ]}
                >
                  <Play size={15} color={w.enabled ? '#FFF' : colors.muted} />
                  <Text style={[s.workflowStartText, { color: w.enabled ? '#FFF' : colors.muted }]}>
                    Start
                  </Text>
                </Pressable>
              </AppCard>
            );
          })}

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
  hero: { alignItems: 'center', gap: 6, paddingVertical: 12 },
  heroIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  heroDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },
  workflowHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  workflowIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  workflowName: { fontWeight: '700', fontSize: 15.5 },
  workflowPurpose: { fontSize: 13, lineHeight: 19, marginTop: 6, marginLeft: 54 },
  workflowStartBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 10, paddingVertical: 10, borderRadius: 12,
  },
  workflowStartText: { fontSize: 13.5, fontWeight: '700' },
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
