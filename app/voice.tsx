import { useLocalSearchParams } from 'expo-router';
import { MarkChat } from '@/components/mark/MarkChat';
export default function VoiceScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId?: string }>();
  return <MarkChat conversationId={conversationId} />;
}
