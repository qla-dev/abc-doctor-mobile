import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Activity, ChevronLeft, HeartPulse, Search, Send, Stethoscope, Wind } from 'lucide-react-native';
import { darkColors } from '@/theme/colors';
import { useLanguage } from '@/context/LanguageContext';
import { GlassPanel } from '@/components/common/GlassPanel';
import { playClickSound } from '@/lib/sound';
import {
  answerQuestion, generateCase,
  type AgeBand, type Difficulty, type GenderChoice,
} from '@/lib/caseGenerator';

type Turn = { id: string; from: 'patient' | 'doctor' | 'system'; text: string };

const c = darkColors;

export default function SimulationScreen() {
  const params = useLocalSearchParams<{ difficulty?: string; specialty?: string; gender?: string; ageBand?: string }>();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const scroller = useRef<ScrollView>(null);

  // Generated once per mount: re-rolling the patient on every keystroke would be absurd.
  const patient = useMemo(() => generateCase({
    difficulty: (params.difficulty as Difficulty) ?? 'medium',
    specialty: params.specialty ?? 'any',
    gender: (params.gender as GenderChoice) ?? 'any',
    ageBand: (params.ageBand as AgeBand) ?? '35-54',
  }), [params.difficulty, params.specialty, params.gender, params.ageBand]);

  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(true);

  // The patient speaks first, after a beat. A consultation opens with the complaint, not with a
  // blank box waiting on the student.
  useEffect(() => {
    const timer = setTimeout(() => {
      setTyping(false);
      setTurns([{ id: 'opening', from: 'patient', text: patient.source.chiefComplaint }]);
    }, 1400);
    return () => clearTimeout(timer);
  }, [patient]);

  const push = (turn: Turn) => {
    setTurns(current => [...current, turn]);
    requestAnimationFrame(() => scroller.current?.scrollToEnd({ animated: true }));
  };

  const ask = () => {
    const question = draft.trim();
    if (!question) return;
    void playClickSound();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    push({ id: 'd' + Date.now(), from: 'doctor', text: question });
    setDraft('');
    setTyping(true);

    // A pause before the reply, because an instant answer reads as a lookup, not a person.
    setTimeout(() => {
      const found = answerQuestion(patient.source, question);
      setTyping(false);
      push({ id: 'p' + Date.now(), from: 'patient', text: found ? found.answer : t('sim.noAnswer') });
    }, 900);
  };

  const examine = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const finding = patient.source.physicalExamFindings.find(item => item.isAbnormal)
      ?? patient.source.physicalExamFindings[0];
    if (finding) push({ id: 'e' + Date.now(), from: 'system', text: finding.system + ': ' + finding.findings });
  };

  const investigate = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const test = patient.source.investigations[0] as { name?: string; result?: string } | undefined;
    if (test) push({ id: 'i' + Date.now(), from: 'system', text: (test.name ?? 'Result') + ': ' + (test.result ?? '-') });
  };

  const vitals = patient.source.vitals;

  const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    header: { paddingTop: insets.top + 6, paddingHorizontal: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
    back: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: c.input },
    name: { color: c.text, fontSize: 16.5, fontWeight: '700' },
    meta: { color: c.muted, fontSize: 12, marginTop: 1 },
    vitalsRow: { flexDirection: 'row', gap: 7, paddingHorizontal: 14, paddingBottom: 10, flexWrap: 'wrap' },
    vital: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9, backgroundColor: c.input },
    vitalText: { color: c.text, fontSize: 11.5, fontWeight: '700' },
    thread: { padding: 16, gap: 11, paddingBottom: 20 },
    patientBubble: { alignSelf: 'flex-start', maxWidth: '88%', backgroundColor: c.card, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderBottomLeftRadius: 6 },
    doctorBubble: { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: c.blue, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderBottomRightRadius: 6 },
    systemBubble: { alignSelf: 'center', maxWidth: '94%', borderWidth: StyleSheet.hairlineWidth, borderColor: c.separator, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 13 },
    patientText: { color: c.text, fontSize: 15, lineHeight: 21 },
    doctorText: { color: '#FFFFFF', fontSize: 15, lineHeight: 21 },
    systemText: { color: c.muted, fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
    typing: { color: c.muted, fontSize: 13, fontStyle: 'italic', marginLeft: 6 },
    actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 8 },
    action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 13, backgroundColor: c.input },
    actionText: { color: c.text, fontSize: 12.5, fontWeight: '700' },
    composerWrap: { paddingHorizontal: 12, paddingBottom: insets.bottom + 10 },
    composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 9 },
    input: { flex: 1, color: c.text, fontSize: 15.5, maxHeight: 110, paddingTop: 8, paddingBottom: 8 },
    send: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: c.blue },
  });

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable onPress={() => { void playClickSound(); router.back(); }} style={styles.back} accessibilityRole="button">
          <ChevronLeft size={21} color={c.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{patient.name}</Text>
          <Text style={styles.meta}>
            {patient.age}{patient.gender} · {patient.specialty} · {t('setup.' + patient.difficulty)}
          </Text>
        </View>
      </View>

      <View style={styles.vitalsRow}>
        <View style={styles.vital}><HeartPulse size={12} color={c.red} /><Text style={styles.vitalText}>{vitals.hr}</Text></View>
        <View style={styles.vital}><Activity size={12} color={c.blue} /><Text style={styles.vitalText}>{vitals.bp}</Text></View>
        <View style={styles.vital}><Wind size={12} color={c.green} /><Text style={styles.vitalText}>{vitals.spo2}</Text></View>
        <View style={styles.vital}><Text style={styles.vitalText}>T {vitals.temp}</Text></View>
        <View style={styles.vital}><Text style={styles.vitalText}>RR {vitals.rr}</Text></View>
      </View>

      <ScrollView ref={scroller} contentContainerStyle={styles.thread} showsVerticalScrollIndicator={false}>
        {turns.map(turn => (
          <View
            key={turn.id}
            style={turn.from === 'doctor' ? styles.doctorBubble : turn.from === 'patient' ? styles.patientBubble : styles.systemBubble}
          >
            <Text style={turn.from === 'doctor' ? styles.doctorText : turn.from === 'patient' ? styles.patientText : styles.systemText}>
              {turn.text}
            </Text>
          </View>
        ))}
        {typing ? <Text style={styles.typing}>{t('sim.typing')}</Text> : null}
      </ScrollView>

      <View style={styles.actions}>
        <Pressable onPress={examine} style={styles.action} accessibilityRole="button">
          <Stethoscope size={15} color={c.text} /><Text style={styles.actionText}>{t('sim.examine')}</Text>
        </Pressable>
        <Pressable onPress={investigate} style={styles.action} accessibilityRole="button">
          <Search size={15} color={c.text} /><Text style={styles.actionText}>{t('sim.investigations')}</Text>
        </Pressable>
      </View>

      <View style={styles.composerWrap}>
        <GlassPanel radius={24}>
          <View style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={t('sim.placeholder')}
              placeholderTextColor={c.muted}
              style={styles.input}
              multiline
            />
            <Pressable onPress={ask} disabled={!draft.trim()} accessibilityRole="button" style={[styles.send, { opacity: draft.trim() ? 1 : 0.35 }]}>
              <Send size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </GlassPanel>
      </View>
    </KeyboardAvoidingView>
  );
}
