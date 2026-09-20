import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Activity, HeartPulse, Search, Stethoscope, Wind } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import type { GeneratedCase } from '@/lib/caseGenerator';

/**
 * What a consultation with a simulated patient needs and a written one does not: who is sitting
 * there, what their numbers are, and the two things a doctor does besides talk.
 *
 * It sits above the composer of the ordinary chat instead of in a room of its own. The simulator
 * used to be a second screen carrying its own thread, composer and bubbles — the same
 * conversation built twice, and only one of the two ever got the call bar, the typing and the
 * optimistic turns. Handing the case over as props is what let the other one go.
 */
export function SimulatorTools({ patient, onExamine, onInvestigate }: {
  patient: GeneratedCase;
  onExamine: () => void;
  onInvestigate: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const vitals = patient.source.vitals;

  const styles = StyleSheet.create({
    wrap: { paddingHorizontal: 16, gap: 8 },
    name: { color: colors.text, fontSize: 14, fontWeight: '700' },
    meta: { color: colors.muted, fontSize: 12, marginTop: 1 },
    vitalsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    vital: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9, backgroundColor: colors.input,
    },
    vitalText: { color: colors.text, fontSize: 11.5, fontWeight: '700' },
    actions: { flexDirection: 'row', gap: 8 },
    action: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      paddingVertical: 10, borderRadius: 13, backgroundColor: colors.input,
    },
    actionText: { color: colors.text, fontSize: 12.5, fontWeight: '700' },
  });

  const press = (run: () => void) => () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    run();
  };

  return (
    <View style={styles.wrap}>
      <View>
        <Text style={styles.name}>{patient.name}</Text>
        <Text style={styles.meta}>
          {patient.age}{patient.gender} · {patient.specialty} · {t('setup.' + patient.difficulty)}
        </Text>
      </View>

      {/* The numbers are on screen from the first turn, the way they would be on the monitor
          behind the bed — nobody asks a patient for their own heart rate. */}
      <View style={styles.vitalsRow}>
        <View style={styles.vital}><HeartPulse size={12} color={colors.red} /><Text style={styles.vitalText}>{vitals.hr}</Text></View>
        <View style={styles.vital}><Activity size={12} color={colors.blue} /><Text style={styles.vitalText}>{vitals.bp}</Text></View>
        <View style={styles.vital}><Wind size={12} color={colors.green} /><Text style={styles.vitalText}>{vitals.spo2}</Text></View>
        <View style={styles.vital}><Text style={styles.vitalText}>T {vitals.temp}</Text></View>
        <View style={styles.vital}><Text style={styles.vitalText}>RR {vitals.rr}</Text></View>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={press(onExamine)} style={styles.action} accessibilityRole="button">
          <Stethoscope size={15} color={colors.text} />
          <Text style={styles.actionText}>{t('sim.examine')}</Text>
        </Pressable>
        <Pressable onPress={press(onInvestigate)} style={styles.action} accessibilityRole="button">
          <Search size={15} color={colors.text} />
          <Text style={styles.actionText}>{t('sim.investigations')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
