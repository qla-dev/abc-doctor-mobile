import * as SecureStore from 'expo-secure-store';

/** Native credentials stay in the device keychain / keystore. */
export const authStorage = {
  get: (key: string) => SecureStore.getItemAsync(key),
  set: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  remove: (key: string) => SecureStore.deleteItemAsync(key),
};
