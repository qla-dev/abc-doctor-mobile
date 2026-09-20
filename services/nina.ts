import { apiRequest } from '@/lib/api';

/** How a turn was spoken. A skill declares which of these it will take. */
export type Modality = 'text' | 'voice';

export type NinaSkill = {
  id: number;
  parent_id: number | null;
  key: string;
  name: string;
  description: string | null;
  supports_text: boolean;
  supports_voice: boolean;
  position: number;
  is_active: boolean;
  children?: NinaSkill[];
};

export type NinaMessage = {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant' | 'system';
  body: string;
  modality: Modality;
  meta: Record<string, unknown> | null;
  sent_at: string;
};

export type NinaConversation = {
  id: number;
  nina_skill_id: number;
  title: string | null;
  last_message_at: string | null;
  skill?: NinaSkill;
  messages?: NinaMessage[];
};

export const Nina = {
  health: () => apiRequest<{ status: string; timestamp: string }>('/health'),

  skills: () => apiRequest<NinaSkill[]>('/nina/skills'),

  /** A thread is opened in a skill and stays in it. */
  startConversation: (skill: string, title?: string) =>
    apiRequest<NinaConversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ skill, title }),
    }),

  conversation: (id: number) => apiRequest<NinaConversation>(`/conversations/${id}`),

  messages: (conversationId: number) =>
    apiRequest<NinaMessage[]>(`/conversations/${conversationId}/messages`),

  /**
   * One turn in, one turn back — the API returns both, so nothing here has to poll to find out
   * when Nina has answered.
   */
  send: (conversationId: number, body: string, modality: Modality = 'text') =>
    apiRequest<{ sent: NinaMessage; reply: NinaMessage }>('/messages', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId, body, modality }),
    }),
};

/** The three states the two booleans make, as one word for the UI. */
export function modesOf(skill: NinaSkill): 'text' | 'voice' | 'both' | 'none' {
  if (skill.supports_text && skill.supports_voice) return 'both';
  if (skill.supports_text) return 'text';
  if (skill.supports_voice) return 'voice';
  return 'none';
}
