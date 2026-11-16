import { apiRequest } from '@/lib/api';
import type { User } from '@/context/AuthContext';

export type SignInMethod = { provider: 'google' | 'apple'; email: string | null };

export type AccountInfo = {
  id: number;
  name: string;
  email: string;
  sign_in_methods: SignInMethod[];
};

export type SocialAuthResponse = {
  user: User;
  token: string;
  is_new_user: boolean;
};

export const Auth = {
  login: (email: string, password: string) =>
    apiRequest<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  google: (idToken: string) =>
    apiRequest<SocialAuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken }),
    }),

  apple: (identityToken: string, fullName?: string) =>
    apiRequest<SocialAuthResponse>('/auth/apple', {
      method: 'POST',
      body: JSON.stringify({ identity_token: identityToken, full_name: fullName || undefined }),
    }),

  logout: () => apiRequest<null>('/auth/logout', { method: 'POST' }),

  me: () => apiRequest<AccountInfo>('/auth/me'),

  updateProfile: (fields: { name?: string }) =>
    apiRequest<AccountInfo>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(fields),
    }),

  linkMethod: (provider: 'google' | 'apple', credentials: Record<string, string>) =>
    apiRequest<AccountInfo>(`/auth/sign-in-methods/${provider}`, {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  unlinkMethod: (provider: 'google' | 'apple') =>
    apiRequest<AccountInfo>(`/auth/sign-in-methods/${provider}`, {
      method: 'DELETE',
    }),
};
