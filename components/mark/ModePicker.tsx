import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { conversationModes, modeLabels, resolveMode, type ModeSkill } from '@/lib/conversationMode';
import { useConversationPreferences } from '@/stores/conversationPreferences';
export function ModePicker({ skill, disabled = false, beforeChange }: { skill?: ModeSkill; disabled?: boolean; beforeChange?: () => Promise<void> }) {
  const { colors } = useTheme();
  const { mode, select } = useConversationPreferences();
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  disabled = disabled || changing;
  const [expanded, setExpanded] = useState(false);
  const effective = resolveMode(mode, skill);
  return <View style={{ padding: 10, gap: 8 }}>
    <Pressable accessibilityRole="button" disabled={disabled} onPress={() => setExpanded(!expanded)}>
      <Text style={{ color: colors.blue }}>{modeLabels[mode]} ▾{skill?.reply_modality === 'text' ? ' · Written replies' : ''}</Text>
    </Pressable>
    {error && <Text accessibilityRole="alert" style={{ color: colors.red }}>{error}</Text>}
    {!effective.compatible && <Text style={{ color: colors.red }}>This role requires a different input. Select a compatible mode.</Text>}
    {expanded && conversationModes.map(value => {
      const allowed = resolveMode(value, skill).compatible;
      return <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: mode === value, disabled: !allowed || disabled }} disabled={!allowed || disabled} onPress={async () => { setChanging(true); setError(null); try { await beforeChange?.(); select(value); setExpanded(false); } catch (e) { setError((e as Error).message); } finally { setChanging(false); } }}>
        <Text style={{ color: allowed ? colors.text : colors.muted, paddingVertical: 6 }}>{mode === value ? '● ' : '○ '}{modeLabels[value]}{!allowed ? ' · Input unavailable for this role' : ''}</Text>
      </Pressable>;
    })}
  </View>;
}
