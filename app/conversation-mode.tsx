import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { createGlobalStyles } from '@/theme/styles';
import { conversationModes, modeLabels, type ConversationMode } from '@/lib/conversationMode';
import { useConversationPreferences } from '@/stores/conversationPreferences';
import { AppCard } from '@/components/common/AppCard';

const MODE_DESCRIPTIONS: Record<ConversationMode, string> = {
  high_quality_voice: 'Real-time voice with natural turn-taking. Best quality, highest cost.',
  low_quality_voice: 'Speech-to-text then text-to-speech. Lower cost, slight delay.',
  speech_text: 'You speak, AI replies in text. Good for noisy environments.',
  text_speech: 'You type, AI speaks the reply. Hands-free listening.',
  text_text: 'Classic text chat. Lowest cost, fastest responses.',
};

export default function ConversationModeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const g = createGlobalStyles(colors);
  const { mode, select } = useConversationPreferences();

  const pick = (value: ConversationMode) => {
    void Haptics.selectionAsync();
    select(value);
    router.back();
  };

  return (
    <View style={g.screen}>
      <Stack.Screen options={{ title: 'Conversation mode' }} />
      <View style={g.scrollContent}>
        <AppCard>
          {conversationModes.map((value, i) => {
            const selected = mode === value;
            return (
              <View key={value}>
                {i > 0 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 14 }} />}
                <Pressable
                  onPress={() => pick(value)}
                  style={({ pressed }) => [s.row, { opacity: pressed ? 0.65 : 1 }]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.title, { color: colors.text }]}>{modeLabels[value]}</Text>
                    <Text style={[s.desc, { color: colors.muted }]}>{MODE_DESCRIPTIONS[value]}</Text>
                  </View>
                  {selected && <Check size={20} color={colors.blue} />}
                </Pressable>
              </View>
            );
          })}
        </AppCard>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, minHeight: 52 },
  title: { fontSize: 15, fontWeight: '600' },
  desc: { fontSize: 12.5, lineHeight: 17, marginTop: 2 },
});
