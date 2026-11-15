/** Browser sessions are confined to the current tab; native uses SecureStore. */
export const authStorage = {
  get: async (key: string): Promise<string | null> => typeof window === 'undefined' ? null : window.sessionStorage.getItem(key),
  set: async (key: string, value: string): Promise<void> => { window.sessionStorage.setItem(key, value); },
  remove: async (key: string): Promise<void> => { window.sessionStorage.removeItem(key); },
};
