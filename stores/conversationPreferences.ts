import { create } from 'zustand';
import { createMMKV } from 'react-native-mmkv';
import { conversationModes, type ConversationMode } from '@/lib/conversationMode';
export const conversationStorage = createMMKV({ id: 'conversation-preferences' });
export const useConversationPreferences = create<{ userId: number | null; mode: ConversationMode; select: (mode: ConversationMode) => void }>((set, get) => ({
  userId: null, mode: 'high_quality_voice',
  select: mode => {
    conversationStorage.set(`mode:${get().userId}`, mode);
    set({ mode });
  },
}));
export function setConversationUser(userId: number | null) {
  const stored = conversationStorage.getString(`mode:${userId}`);
  useConversationPreferences.setState({ userId, mode: conversationModes.includes(stored as ConversationMode) ? stored as ConversationMode : 'high_quality_voice' });
}
export function currentMode() { return useConversationPreferences.getState().mode; }
export function conversationKey(key: string) { return `${useConversationPreferences.getState().userId}:${key}`; }
