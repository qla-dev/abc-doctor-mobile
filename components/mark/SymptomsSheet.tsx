import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { Activity, HeartPulse, Search, Stethoscope, Wind } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { CustomBottomSheet } from '@/components/common/Sheets';
import type { PatientPresentation } from '@/services/mark';

export function SymptomsSheet({ open, onClose, patient, onExamine, onInvestigate }: {
  open: boolean;
  onClose: () => void;
  patient: PatientPresentation;
  onExamine: () => void;
  onInvestigate: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const vitals = patient.source.vitals;

  const press = (run: () => void) => () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    run();
    onClose();
  };

  const styles = StyleSheet.create({
    meta: { color: colors.muted, fontSize: 13, marginBottom: 4 },
    section: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: colors.muted, marginTop: 14, marginBottom: 6 },
    vitalsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    vital: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.input,
    },
    vitalText: { color: colors.text, fontSize: 13, fontWeight: '700' },
    actions: { flexDirection: 'row', gap: 10, marginTop: 6 },
    action: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      paddingVertical: 13, borderRadius: 14, backgroundColor: colors.input,
    },
    actionText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  });

  return (
    <CustomBottomSheet open={open} onClose={onClose} title={patient.name}>
      <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 16 }}>
        <Text style={styles.meta}>
          {patient.age}{patient.gender} · {patient.specialty} · {t('setup.' + patient.difficulty)}
        </Text>

        <Text style={styles.section}>{t('sim.vitals').toUpperCase()}</Text>
        <View style={styles.vitalsRow}>
          <View style={styles.vital}><HeartPulse size={14} color={colors.red} /><Text style={styles.vitalText}>{vitals.hr}</Text></View>
          <View style={styles.vital}><Activity size={14} color={colors.blue} /><Text style={styles.vitalText}>{vitals.bp}</Text></View>
          <View style={styles.vital}><Wind size={14} color={colors.green} /><Text style={styles.vitalText}>{vitals.spo2}</Text></View>
          <View style={styles.vital}><Text style={styles.vitalText}>T {vitals.temp}</Text></View>
          <View style={styles.vital}><Text style={styles.vitalText}>RR {vitals.rr}</Text></View>
        </View>

        <Text style={styles.section}>{t('sim.examine').toUpperCase()}</Text>
        <View style={styles.actions}>
          <Pressable onPress={press(onExamine)} style={styles.action} accessibilityRole="button">
            <Stethoscope size={17} color={colors.text} />
            <Text style={styles.actionText}>{t('sim.examine')}</Text>
          </Pressable>
          <Pressable onPress={press(onInvestigate)} style={styles.action} accessibilityRole="button">
            <Search size={17} color={colors.text} />
            <Text style={styles.actionText}>{t('sim.investigations')}</Text>
          </Pressable>
        </View>
      </BottomSheetScrollView>
    </CustomBottomSheet>
  );
}
