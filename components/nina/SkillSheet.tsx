import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { Brain, ChevronDown, Ear, Mic, Stethoscope } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { CustomBottomSheet } from '@/components/common/Sheets';
import { CaseForm } from '@/components/nina/CaseForm';
import type { CaseSetup } from '@/lib/caseGenerator';
import type { Modality, NinaSkill } from '@/services/nina';

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
 * What Nina can be, reached from the plus inside the composer.
 *
 * It opens over the conversation rather than replacing it, and the one skill with something to
 * configure — the simulated patient — unfolds its case here too. Both used to be screens you
 * navigated to; a choice about the next message belongs next to the message box.
 */
export function SkillSheet({ open, onClose, skills, activeKey, onStart, starting }: {
  open: boolean;
  onClose: () => void;
  skills: NinaSkill[];
  activeKey?: string | null;
  /** The case comes with it when the skill is the simulator, and never otherwise. */
  onStart: (skill: NinaSkill, modality: Modality, setup?: CaseSetup) => void;
  starting: boolean;
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [setup, setSetup] = useState<CaseSetup>({
    difficulty: 'medium', specialty: 'any', gender: 'any', ageBand: '35-54',
  });
  const [caseOpen, setCaseOpen] = useState(false);

  const styles = StyleSheet.create({
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 11,
      borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11,
    },
    icon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    name: { color: colors.text, fontSize: 14, fontWeight: '700' },
    desc: { color: colors.muted, fontSize: 12, marginTop: 2 },
    voice: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.input },
    form: { paddingHorizontal: 12, paddingBottom: 8 },
  });

  const tintFor = (tone: Tone) => ({
    indigo: colors.indigo, blue: colors.blue, green: colors.green,
    orange: colors.orange, red: colors.red, cyan: colors.cyan,
  })[tone];

  const start = (skill: NinaSkill, modality: Modality) => {
    void Haptics.selectionAsync();
    if (skill.key === 'patient_simulator') {
      onStart(skill, modality, setup);
    } else {
      onStart(skill, modality);
    }
    onClose();
  };

  return (
    <CustomBottomSheet open={open} onClose={onClose} title={t('ai.skills')}>
      <BottomSheetScrollView contentContainerStyle={{ gap: 4, paddingBottom: 8 }}>
        {skills.map(skill => {
          const look = LOOK[skill.key] ?? { icon: Brain, tone: 'blue' as Tone };
          const Icon = look.icon;
          const configurable = skill.key === 'patient_simulator';
          const active = skill.key === activeKey;

          return (
            <View key={skill.id}>
              <Pressable
                onPress={() => {
                  // The case is a choice before it is a conversation, so this one unfolds
                  // instead of starting.
                  if (configurable) { void Haptics.selectionAsync(); setCaseOpen(value => !value); return; }
                  start(skill, skill.supports_text ? 'text' : 'voice');
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

                {/* Spoken is a second way in, not a second skill, so it rides on the same row. */}
                {configurable ? (
                  <ChevronDown
                    size={16}
                    color={colors.muted}
                    style={{ transform: [{ rotate: caseOpen ? '180deg' : '0deg' }] }}
                  />
                ) : skill.supports_voice ? (
                  <Pressable
                    onPress={() => start(skill, 'voice')}
                    accessibilityRole="button"
                    accessibilityLabel={t('simulator.voiceCall')}
                    style={styles.voice}
                  >
                    <Mic size={15} color={colors.indigo} />
                  </Pressable>
                ) : null}
              </Pressable>

              {configurable && caseOpen ? (
                <View style={styles.form}>
                  <CaseForm
                    setup={setup}
                    onChange={next => setSetup(current => ({ ...current, ...next }))}
                    onStart={modality => start(skill, modality)}
                    starting={starting}
                  />
                </View>
              ) : null}
            </View>
          );
        })}

        {skills.length === 0 ? <ActivityIndicator color={colors.blue} style={{ marginVertical: 24 }} /> : null}
      </BottomSheetScrollView>
    </CustomBottomSheet>
  );
}
