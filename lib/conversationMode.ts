export const conversationModes = ['high_quality_voice', 'low_quality_voice', 'speech_text', 'text_speech', 'text_text'] as const;
export type ConversationMode = typeof conversationModes[number];
export type ModeSkill = { supports_voice: boolean; supports_text: boolean; reply_modality?: 'text' | 'voice' | null };
export function resolveMode(mode: ConversationMode, skill?: ModeSkill) {
  const input = mode === 'text_speech' || mode === 'text_text' ? 'text' : 'voice';
  const output = skill?.reply_modality ?? (mode === 'speech_text' || mode === 'text_text' ? 'text' : 'voice');
  return { input, output, realtime: mode === 'high_quality_voice', compatible: !skill || (input === 'voice' ? skill.supports_voice : skill.supports_text) } as const;
}
export const modeLabels: Record<ConversationMode, string> = {
  high_quality_voice: 'High-quality voice · more expensive',
  low_quality_voice: 'Low-quality voice · cheaper',
  speech_text: 'Speak → read', text_speech: 'Type → hear', text_text: 'Type → read',
};
