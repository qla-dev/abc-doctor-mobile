import { apiRequest } from '@/lib/api';

/** How a turn was spoken. A skill declares which of these it will take. */
export type Modality = 'text' | 'voice';

export type MarkSkill = {
  id: number;
  parent_id: number | null;
  key: string;
  name: string;
  description: string | null;
  /** Empty-thread lines, keyed by language. One is picked at random. */
  intro_texts: Record<string, string[]> | null;
  supports_text: boolean;
  supports_voice: boolean;
  /** Whether Mark speaks first — the patient is sitting there before anyone asks. */
  opens_conversation: boolean;
  position: number;
  is_active: boolean;
  children?: MarkSkill[];
};

export type MarkMessage = {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant' | 'system';
  body: string;
  modality: Modality;
  meta: Record<string, unknown> | null;
  sent_at: string;
};

export type MarkConversation = {
  id: number;
  mark_skill_id: number;
  /** Chosen when the thread opens and fixed for its life. */
  modality: Modality;
  /** The OpenAI voice this patient speaks in, resolved from their sex when the thread opened. */
  voice: string | null;
  /** What this thread is about beyond the skill — the simulator's setup, for instance. */
  context: string | null;
  title: string | null;
  last_message_at: string | null;
  skill?: MarkSkill;
  messages?: MarkMessage[];
};

export const Mark = {
  health: () => apiRequest<{ status: string; timestamp: string }>('/health'),

  skills: () => apiRequest<MarkSkill[]>('/mark/skills'),

  /**
   * A thread is opened in a skill, in one mode, and stays in both. It comes back with its
   * messages already, because a skill that opens has spoken by the time this returns.
   */
  startConversation: (skill: string, modality: Modality = 'text', title?: string, context?: string, sex?: string) =>
    apiRequest<MarkConversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ skill, modality, title, context, sex }),
    }),

  /**
   * A short-lived key for one spoken session. The account key stays on the server; this expires
   * in about a minute and can only start the session it was cut for.
   */
  realtimeSession: (conversationId: number) =>
    apiRequest<{ value: string; expires_at: number; model: string; voice: string; call_url: string }>(
      '/mark/realtime/session',
      { method: 'POST', body: JSON.stringify({ conversation_id: conversationId }) }
    ),

  /**
   * A key for a session that only listens: the words appear in the composer while a voice
   * message is still being spoken. The thread is optional and only lends its case to the
   * transcriber's prompt.
   */
  realtimeTranscription: (conversationId?: number) =>
    apiRequest<{ value: string; expires_at: number; model: string; url: string }>(
      '/mark/realtime/transcription',
      { method: 'POST', body: JSON.stringify({ conversation_id: conversationId ?? null }) }
    ),

  /** Newest first, with the skill loaded — what the history screen lists. */
  conversations: () => apiRequest<MarkConversation[]>('/conversations'),

  conversation: (id: number) => apiRequest<MarkConversation>(`/conversations/${id}`),

  messages: (conversationId: number) =>
    apiRequest<MarkMessage[]>(`/conversations/${conversationId}/messages`),

  /**
   * One side of a spoken turn, stored without asking the text model to answer it — it has already
   * been answered inside the call.
   */
  saveTranscript: (conversationId: number, role: 'user' | 'assistant', body: string) =>
    apiRequest<MarkMessage>('/mark/realtime/transcript', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId, role, body }),
    }),

  /**
   * A recording, as words. Nothing is stored by this: what comes back is a string, and whether
   * it becomes a turn is decided here rather than on the server.
   *
   * Base64 rather than multipart — the recording is a file on the device either way, and one
   * encoding is fewer moving parts than a multipart body assembled in React Native.
   */
  transcribe: (audio: string, format: string) =>
    apiRequest<{ text: string }>('/mark/transcribe', {
      method: 'POST',
      body: JSON.stringify({ audio, format }),
    }),

  /**
   * One turn in, one turn back — the API returns both, so nothing here has to poll to find out
   * when Mark has answered.
   */
  send: (conversationId: number, body: string, modality: Modality = 'text') =>
    apiRequest<{ sent: MarkMessage; reply: MarkMessage }>('/messages', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId, body, modality }),
    }),
};

/**
 * One of the skill's opening lines, in the app's language. Falls back to Bosnian, then to the
 * description — a skill added on the server with no intro should still say something.
 */
export function introFor(skill: MarkSkill | undefined, language: string): string {
  const lines = skill?.intro_texts?.[language] ?? skill?.intro_texts?.bs ?? [];

  return lines.length ? lines[Math.floor(Math.random() * lines.length)] : (skill?.description ?? '');
}

/** The three states the two booleans make, as one word for the UI. */
export function modesOf(skill: MarkSkill): 'text' | 'voice' | 'both' | 'none' {
  if (skill.supports_text && skill.supports_voice) return 'both';
  if (skill.supports_text) return 'text';
  if (skill.supports_voice) return 'voice';
  return 'none';
}
