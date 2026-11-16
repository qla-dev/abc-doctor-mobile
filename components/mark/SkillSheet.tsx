import { ModePicker } from './ModePicker';
import { resolveMode } from '@/lib/conversationMode';
import { useConversationPreferences } from '@/stores/conversationPreferences';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { Brain, Ear, Mic, Stethoscope } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { CustomBottomSheet } from '@/components/common/Sheets';
import type { Modality, MarkSkill } from '@/services/mark';

type Tone = 'indigo' | 'blue' | 'green' | 'orange' | 'red' | 'cyan';

/** Look per skill key. The server orders them; the patient simulator sits at position 1. */
const LOOK: Record<string, { icon: typeof Brain; tone: Tone }> = {
  patient_simulator: { icon: Stethoscope, tone: 'orange' },
  consultant: { icon: Brain, tone: 'indigo' },
  dictaphone: { icon: Mic, tone: 'green' },
  study_buddy: { icon: Brain, tone: 'blue' },
  whisperer: { icon: Ear, tone: 'cyan' },
};

export function SkillSheet({ open, onClose, skills, activeKey, onStart, starting }: {
  open: boolean;
  onClose: () => void;
  skills: MarkSkill[];
  activeKey?: string | null;
  onStart: (skill: MarkSkill, modality: Modality) => void;
  starting: boolean;
}) {
  const { colors } = useTheme();
  const mode = useConversationPreferences(state => state.mode);
  const { t } = useLanguage();

  const styles = StyleSheet.create({
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 11,
      borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11,
    },
    icon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    name: { color: colors.text, fontSize: 14, fontWeight: '700' },
    desc: { color: colors.muted, fontSize: 12, marginTop: 2 },
  });

  const tintFor = (tone: Tone) => ({
    indigo: colors.indigo, blue: colors.blue, green: colors.green,
    orange: colors.orange, red: colors.red, cyan: colors.cyan,
  })[tone];

  return (
    <CustomBottomSheet open={open} onClose={onClose} title={t('ai.skills')}>
      <BottomSheetScrollView contentContainerStyle={{ gap: 4, paddingBottom: 8 }}>
        <ModePicker />
        {skills.map(skill => {
          const look = LOOK[skill.key] ?? { icon: Brain, tone: 'blue' as Tone };
          const Icon = look.icon;
          const active = skill.key === activeKey;

          return (
            <Pressable
              key={skill.id}
              disabled={starting || !resolveMode(mode, skill).compatible}
              onPress={() => {
                void Haptics.selectionAsync();
                if (skill.key === 'patient_simulator') {
                  onClose();
                  router.push('/patient-simulator');
                  return;
                }
                onStart(skill, resolveMode(mode, skill).input);
                onClose();
              }}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: active || pressed ? colors.input : 'transparent' },
              ]}
            >
              <View style={[styles.icon, { backgroundColor: tintFor(look.tone) + '22' }]}>
                <Icon size={17} color={tintFor(look.tone)} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name} numberOfLines={1}>{skill.name}</Text>
                {skill.description ? (
                  <Text style={styles.desc} numberOfLines={2}>{skill.description}</Text>
                ) : null}
              </View>

              {!resolveMode(mode, skill).compatible ? <Text style={styles.desc}>Select a voice mode</Text> : null}
            </Pressable>
          );
        })}

        {skills.length === 0 ? <ActivityIndicator color={colors.blue} style={{ marginVertical: 24 }} /> : null}
      </BottomSheetScrollView>
    </CustomBottomSheet>
  );
}
