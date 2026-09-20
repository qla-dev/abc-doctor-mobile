import { useLocalSearchParams } from 'expo-router';
import { NinaChat } from '@/components/nina/NinaChat';

/**
 * A conversation reached with its thread already chosen — out of history, from the mic on
 * another screen, or from a link. The Nina tab holds the same chat without leaving the tab, so
 * everything this screen knows how to do lives in the component rather than here.
 */
export default function NinaScreen() {
  const params = useLocalSearchParams<{
    conversationId?: string;
    autoVoice?: string;
    seed?: string;
    difficulty?: string;
    specialty?: string;
    gender?: string;
    ageBand?: string;
  }>();

  return <NinaChat {...params} />;
}
