export type OutboxEntry = { key: string; conversation_id: number; path: string; payload: Record<string, unknown> };
/** Serialize each thread, retaining failures on disk before allowing any later turn through. */
export function createDurableOutbox(storage: { read: (scope: string) => OutboxEntry[]; write: (scope: string, entries: OutboxEntry[]) => void }, send: (entry: OutboxEntry) => Promise<unknown>, currentScope: () => string) {
  const running = new Map<string, Promise<unknown>>();
  const read = () => storage.read(currentScope());
  const enqueue = (entry: OutboxEntry) => {
    const scope = currentScope();
    const entries = storage.read(scope);
    if (!entries.some(e => e.key === entry.key)) storage.write(scope, [...entries, entry]);
  };
  const deliver = async (entry: OutboxEntry, scope: string): Promise<unknown> => {
    if (scope !== currentScope()) throw new Error('Account changed. Reopen this conversation to retry.');
    const key = `${scope}:${entry.key}`;
    const existing = running.get(key);
    if (existing) return existing;
    const work = send(entry).then(result => {
      storage.write(scope, storage.read(scope).filter(e => e.key !== entry.key));
      return result;
    }).finally(() => running.delete(key));
    running.set(key, work);
    return work;
  };
  return {
    read, enqueue,
    async submit<T>(entry: OutboxEntry): Promise<T> {
      const scope = currentScope();
      // Capture the prefix before awaiting: subsequent submissions wait for this same work.
      const prefix = storage.read(scope).filter(e => e.conversation_id === entry.conversation_id);
      for (const previous of prefix) {
        const result = await deliver(previous, scope);
        if (previous.key === entry.key) return result as T;
      }
      return deliver(entry, scope) as Promise<T>;
    },
    async flush(id: number) {
      const scope = currentScope();
      for (const entry of storage.read(scope).filter(e => e.conversation_id === id)) await deliver(entry, scope);
    },
  };
}
