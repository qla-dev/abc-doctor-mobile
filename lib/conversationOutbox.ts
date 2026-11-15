import { conversationKey, conversationStorage } from '@/stores/conversationPreferences';
import { apiRequest } from '@/lib/api';
import { createDurableOutbox, type OutboxEntry } from './durableOutbox';
export type { OutboxEntry } from './durableOutbox';
const outbox = createDurableOutbox({
  read: scope => JSON.parse(conversationStorage.getString(scope) ?? '[]') as OutboxEntry[],
  write: (scope, entries) => conversationStorage.set(scope, JSON.stringify(entries)),
}, entry => apiRequest(entry.path, { method: 'POST', body: JSON.stringify(entry.payload) }), () => conversationKey('outbox'));
export const readOutbox = outbox.read;
export const enqueue = outbox.enqueue;
export const deliverEntry = outbox.submit;
export const flushOutbox = outbox.flush;
