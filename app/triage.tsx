import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { createGlobalStyles } from '@/theme/styles';
import { AppCard } from '@/components/common/AppCard';
import { Badge } from '@/components/common/Badge';
import { SectionHeader } from '@/components/common/SectionHeader';
import { TRIAGE_SCENARIOS_DATA } from '@/data/triageScenariosData';

export default function TriageScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const g = createGlobalStyles(colors);

  const styles = StyleSheet.create({
    name: { color: colors.text, fontSize: 16.5, fontWeight: '700' },
    description: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 3 },
    typical: { color: colors.secondaryText, fontSize: 12.5, lineHeight: 18, marginTop: 7, fontStyle: 'italic' },
    flagRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 8 },
    flagText: { color: colors.text, fontSize: 13, lineHeight: 19, flex: 1 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  });

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={g.screen} contentContainerStyle={g.scrollContent} showsVerticalScrollIndicator={false}>
      <Stack.Screen options={{ title: t('triage.title') }} />
      <SectionHeader title={t('triage.subtitle')} />

      {TRIAGE_SCENARIOS_DATA.map((scenario) => (
        <AppCard key={scenario.id}>
          <View style={styles.headerRow}>
            <Text style={[styles.name, { flex: 1 }]}>{scenario.complaintName}</Text>
            <Badge label={`${scenario.redFlags.length} flags`} tone="red" />
          </View>
          <Text style={styles.description}>{scenario.description}</Text>
          <Text style={styles.typical}>{scenario.typicalCases}</Text>

          {scenario.redFlags.slice(0, 3).map((flag) => (
            <View key={flag.id} style={styles.flagRow}>
              <AlertTriangle size={15} color={colors.red} />
              <Text style={styles.flagText}>
                {flag.question}
              </Text>
            </View>
          ))}
        </AppCard>
      ))}
    </ScrollView>
  );
}
