import { setConversationUser } from '@/stores/conversationPreferences';
import { apiRequest, setAccessToken, setUnauthorizedHandler } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { authStorage } from '@/lib/authStorage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setApiAuthToken } from '@/lib/api';

export type User = {
  id: number;
  name: string;
  email: string;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  /** False until the stored token has been read, so screens do not flash a signed-out state. */
  ready: boolean;
  authenticated: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'abc_doctor_token';
const USER_KEY = 'abc_doctor_user';

/**
 * Holds the Sanctum session: device keychain on native, tab session storage on web.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setConversationUser(null); setToken(null); setUser(null); queryClient.clear();
      void authStorage.remove(TOKEN_KEY); void authStorage.remove(USER_KEY);
    });
    return () => setUnauthorizedHandler(null);
  }, [queryClient]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          authStorage.get(TOKEN_KEY),
          authStorage.get(USER_KEY),
        ]);
        if (!active) return;
        if (storedToken) {
          setAccessToken(storedToken);
          setToken(storedToken);
          setApiAuthToken(storedToken);
        }
        if (storedUser) { const restored = JSON.parse(storedUser) as User; setConversationUser(restored.id); setUser(restored); }
      } catch {
        // A keychain read can fail on a restored device; treat it as signed out rather than
        // blocking the app behind an error it cannot resolve.
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => { active = false; };
  }, []);

  const signIn = useCallback(async (nextToken: string, nextUser: User) => {
    await Promise.all([
      authStorage.set(TOKEN_KEY, nextToken),
      authStorage.set(USER_KEY, JSON.stringify(nextUser)),
    ]);
    setConversationUser(nextUser.id);
    setAccessToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
    setApiAuthToken(nextToken);
  }, []);

  const signOut = useCallback(async () => {
    try { await apiRequest('/auth/logout', { method: 'POST' }); } catch (e) { if ((e as {status?:number}).status !== 401) throw e; }
    setConversationUser(null);
    setAccessToken(null);
    queryClient.clear();
    setToken(null);
    setUser(null);
    setApiAuthToken(null);
    await Promise.all([
      authStorage.remove(TOKEN_KEY),
      authStorage.remove(USER_KEY),
    ]);
  }, [queryClient]);

  const value = useMemo(
    () => ({ user, token, ready, authenticated: Boolean(token), signIn, signOut }),
    [user, token, ready, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
