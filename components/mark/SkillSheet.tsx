import { resolveMode } from '@/lib/conversationMode';
import { useConversationPreferences } from '@/stores/conversationPreferences';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { Brain, Ear, Mic, Check } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { CustomBottomSheet } from '@/components/common/Sheets';
import type { Modality, MarkSkill } from '@/services/mark';

type Tone = 'indigo' | 'blue' | 'green' | 'orange' | 'red' | 'cyan';
type Category = 'symptoms' | 'interpretation';

const LOOK: Record<string, { icon: typeof Brain; tone: Tone }> = {
  consultant: { icon: Brain, tone: 'indigo' },
  dictaphone: { icon: Mic, tone: 'green' },
  study_buddy: { icon: Brain, tone: 'blue' },
  whisperer: { icon: Ear, tone: 'cyan' },
};

const CATEGORY: Record<string, Category> = {
  consultant: 'symptoms',
  whisperer: 'symptoms',
  study_buddy: 'interpretation',
  dictaphone: 'interpretation',
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
  const [category, setCategory] = useState<Category>('symptoms');

  const filtered = skills.filter(s => s.key !== 'patient_simulator' && CATEGORY[s.key] === category);

  const tintFor = (tone: Tone) => ({
    indigo: colors.indigo, blue: colors.blue, green: colors.green,
    orange: colors.orange, red: colors.red, cyan: colors.cyan,
  })[tone];

  const styles = StyleSheet.create({
    pills: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 10 },
    pill: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
    pillText: { fontSize: 14, fontWeight: '700' },
    card: {
      marginHorizontal: 12, marginBottom: 10, borderRadius: 16, padding: 14,
      backgroundColor: colors.card, gap: 10,
      borderWidth: 1, borderColor: 'transparent',
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
    icon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    name: { color: colors.text, fontSize: 15, fontWeight: '700' },
    desc: { color: colors.muted, fontSize: 13, lineHeight: 18 },
    tick: { position: 'absolute', top: 10, right: 10 },
  });

  return (
    <CustomBottomSheet open={open} onClose={onClose} title={t('ai.skills')}>
      <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 8 }}>
        <View style={styles.pills}>
          {([
            { key: 'symptoms' as Category, label: 'Simptomi' },
            { key: 'interpretation' as Category, label: 'Interpretacija' },
          ]).map(cat => {
            const on = category === cat.key;
            return (
              <Pressable
                key={cat.key}
                onPress={() => { void Haptics.selectionAsync(); setCategory(cat.key); }}
                style={[styles.pill, { backgroundColor: on ? colors.blue : colors.input }]}
              >
                <Text style={[styles.pillText, { color: on ? '#FFF' : colors.text }]}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {filtered.map(skill => {
          const look = LOOK[skill.key] ?? { icon: Brain, tone: 'blue' as Tone };
          const Icon = look.icon;
          const tint = tintFor(look.tone);
          const active = skill.key === activeKey;
          const compatible = resolveMode(mode, skill).compatible;

          return (
            <Pressable
              key={skill.id}
              disabled={starting || !compatible}
              onPress={() => {
                void Haptics.selectionAsync();
                onStart(skill, resolveMode(mode, skill).input);
                onClose();
              }}
              style={({ pressed }) => [
                styles.card,
                active && { borderColor: tint, backgroundColor: tint + '1A' },
                pressed && { opacity: 0.75 },
                !compatible && { opacity: 0.45 },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.icon, { backgroundColor: tint + '22' }]}>
                  <Icon size={19} color={tint} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.name} numberOfLines={1}>{skill.name}</Text>
                </View>
              </View>
              {skill.description ? (
                <Text style={styles.desc} numberOfLines={3}>{skill.description}</Text>
              ) : null}
              {!compatible ? (
                <Text style={[styles.desc, { color: colors.red }]}>Select a voice mode</Text>
              ) : null}
              {active ? <Check size={16} color={tint} style={styles.tick} /> : null}
            </Pressable>
          );
        })}

        {filtered.length === 0 && skills.length > 0 ? (
          <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'center', paddingVertical: 24 }}>
            No skills in this category
          </Text>
        ) : null}
        {skills.length === 0 ? <ActivityIndicator color={colors.blue} style={{ marginVertical: 24 }} /> : null}
      </BottomSheetScrollView>
    </CustomBottomSheet>
  );
}
