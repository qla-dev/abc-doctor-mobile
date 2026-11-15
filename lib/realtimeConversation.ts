export type RealtimeHistory = { id: number; role: 'user' | 'assistant'; body: string };
export type RealtimeEvent = {
  type?: string;
  item?: { id?: string; role?: string; type?: string };
  item_id?: string;
  transcript?: string;
  text?: string;
  error?: { message?: string };
};

/** A call may listen only after OpenAI acknowledges every restored message. */
export function restoreConversation({ history, opensConversation, send, timeoutMs = 15000 }: {
  history: RealtimeHistory[];
  opensConversation: boolean;
  send: (event: object) => void;
  timeoutMs?: number;
}) {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const ready = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  // Connection setup can still be awaiting microphone permission or SDP when an error arrives.
  void ready.catch(() => {});
  const pending = new Set(history.map(message => `history_${message.id}`));
  let timer: ReturnType<typeof setTimeout> | undefined;
  let started = false;
  let finished = false;
  const fail = (error: Error) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    reject(error);
  };
  const finish = () => {
    if (finished || pending.size > 0) return;
    try {
      if (opensConversation && history.length === 0) send({ type: 'response.create' });
      finished = true;
      clearTimeout(timer);
      resolve();
    } catch (error) { fail(error as Error); }
  };

  return {
    ready,
    fail,
    start() {
      if (started || finished) return;
      started = true;
      timer = setTimeout(() => fail(new Error('Obnova razgovora nije uspjela. Pokušajte ponovo.')), timeoutMs);
      try {
        for (const message of history) {
          send({
            type: 'conversation.item.create',
            item: {
              id: `history_${message.id}`,
              type: 'message',
              role: message.role,
              content: [{ type: message.role === 'user' ? 'input_text' : 'text', text: message.body }],
            },
          });
        }
        finish();
      } catch (error) { fail(error as Error); }
    },
    receive(event: RealtimeEvent) {
      if (!started || finished) return;
      if (event.type === 'error') fail(new Error(event.error?.message ?? 'Obnova razgovora nije uspjela.'));
      if (['conversation.item.added', 'conversation.item.created', 'conversation.item.done'].includes(event.type ?? '') && event.item?.id) {
        pending.delete(event.item.id);
        finish();
      }
    },
  };
}

/** Transcription is asynchronous: an assistant transcript can arrive before the user's. */
export function transcriptBuffer(emit: (role: 'user' | 'assistant', text: string, itemId?: string) => void) {
  const order: string[] = [];
  const known = new Set<string>();
  let transcriptionFailed = false;
  const completed = new Map<string, { role: 'user' | 'assistant'; text: string }>();
  const flush = () => {
    while (order.length && completed.has(order[0])) {
      const id = order.shift()!;
      const turn = completed.get(id)!;
      completed.delete(id);
      if (turn.text.trim()) emit(turn.role, turn.text, id);
    }
  };
  return {
    isComplete: () => order.length === 0 && !transcriptionFailed,
    receive(event: RealtimeEvent) {
      if (event.item_id?.startsWith('history_')) return;
      const item = event.item;
      if (['conversation.item.added', 'conversation.item.created'].includes(event.type ?? '')
        && item?.id && !item.id.startsWith('history_') && ['user', 'assistant'].includes(item.role ?? '') && !known.has(item.id)) {
        known.add(item.id);
        order.push(item.id);
      }
      const role = event.type === 'conversation.item.input_audio_transcription.completed' ? 'user'
        : ['response.output_audio_transcript.done', 'response.output_text.done'].includes(event.type ?? '') ? 'assistant' : null;
      const text = event.transcript ?? event.text;
      if (role && typeof text === 'string') {
        if (!event.item_id) { emit(role, text); return; }
        if (known.has(event.item_id) && !order.includes(event.item_id)) return;
        if (!known.has(event.item_id)) { known.add(event.item_id); order.push(event.item_id); }
        completed.set(event.item_id, { role, text });
      }
      if (event.type === 'conversation.item.input_audio_transcription.failed' && event.item_id) {
        transcriptionFailed = true;
        completed.set(event.item_id, { role: 'user', text: '' });
      }
      flush();
    },
    close() {
      // Keep completed turns even if an earlier transcription never finished before hang-up.
      for (const id of order) {
        const turn = completed.get(id);
        if (turn?.text.trim()) emit(turn.role, turn.text, id);
      }
      order.length = 0;
      completed.clear();
    },
  };
}
