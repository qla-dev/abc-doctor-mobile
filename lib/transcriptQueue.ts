/** Serial uploads preserve turn order. Failed saves are retried before a new call can start. */
export class TranscriptQueue<T> {
  private tail: Promise<unknown> = Promise.resolve();
  private pending = new Map<string, { conversationId: number; save: () => Promise<T>; done: boolean; value?: T }>();

  save(conversationId: number, key: string, save: () => Promise<T>): Promise<T> {
    const entry = this.pending.get(key) ?? { conversationId, save, done: false, value: undefined as T | undefined };
    this.pending.set(key, entry);
    const result = this.tail.then(async () => {
      if (entry.done) return entry.value as T;
      // An earlier failed upload must land before this one, otherwise a retry would reverse
      // the conversation when the backend orders its saved messages.
      for (const [pendingKey, candidate] of this.pending) {
        if (candidate.conversationId !== conversationId) continue;
        candidate.value = await candidate.save();
        candidate.done = true;
        this.pending.delete(pendingKey);
        if (candidate === entry) return candidate.value;
      }
      return entry.value as T;
    });
    this.tail = result.catch(() => {});
    return result;
  }

  async flush(conversationId: number): Promise<void> {
    await this.tail;
    for (const [key, entry] of this.pending) {
      if (entry.conversationId === conversationId) {
        await this.save(conversationId, key, entry.save);
      }
    }
  }
}
