import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Activity, HeartPulse, Mic, Wind } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { createGlobalStyles } from '@/theme/styles';
import { AppCard } from '@/components/common/AppCard';
import { AppButton } from '@/components/common/AppButton';
import { Badge } from '@/components/common/Badge';
import { SectionHeader } from '@/components/common/SectionHeader';
import { PATIENT_CASES_DATA } from '@/data/patientCasesData';

const TRIAGE_TONE = { red: 'red', orange: 'orange', yellow: 'orange', green: 'green' } as const;

export default function SimulatorScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const g = createGlobalStyles(colors);

  const styles = StyleSheet.create({
    header: { paddingTop: insets.top + 12, paddingHorizontal: 16 },
    title: { color: colors.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.9 },
    sub: { color: colors.muted, fontSize: 14, marginTop: 3 },
    patientRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.input },
    avatarText: { color: colors.text, fontSize: 14, fontWeight: '800' },
    name: { color: colors.text, fontSize: 16, fontWeight: '700' },
    complaint: { color: colors.muted, fontSize: 13, marginTop: 2 },
    vitals: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
    vital: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9, backgroundColor: colors.input },
    vitalText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  });

  return (
    <ScrollView style={g.screen} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('simulator.title')}</Text>
        <Text style={styles.sub}>{t('simulator.chiefComplaint')}</Text>
      </View>
      <View style={[g.scrollContent, { paddingTop: 14 }]}>
        <SectionHeader title={t('simulator.start')} />
        {PATIENT_CASES_DATA.slice(0, 5).map((patient) => (
          <AppCard key={patient.id}>
            <View style={styles.patientRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{patient.age}{patient.gender}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{patient.patientName}</Text>
                <Text style={styles.complaint} numberOfLines={2}>{patient.chiefComplaint}</Text>
              </View>
              <Badge label={patient.triageColor} tone={TRIAGE_TONE[patient.triageColor]} />
            </View>
            <View style={styles.vitals}>
              <View style={styles.vital}>
                <HeartPulse size={13} color={colors.red} />
                <Text style={styles.vitalText}>{patient.vitals.hr}</Text>
              </View>
              <View style={styles.vital}>
                <Activity size={13} color={colors.blue} />
                <Text style={styles.vitalText}>{patient.vitals.bp}</Text>
              </View>
              <View style={styles.vital}>
                <Wind size={13} color={colors.green} />
                <Text style={styles.vitalText}>{patient.vitals.spo2}</Text>
              </View>
            </View>
            <AppButton label={t('simulator.voiceCall')} tone="primary" icon={<Mic size={16} color="#FFFFFF" />} full />
          </AppCard>
        ))}
      </View>
    </ScrollView>
  );
}
