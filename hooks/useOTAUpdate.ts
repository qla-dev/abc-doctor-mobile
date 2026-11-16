import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';

export function useOTAUpdate() {
  useEffect(() => {
    if (__DEV__) return;

    const checkUpdate = async () => {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {}
    };

    void checkUpdate();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkUpdate();
    });
    return () => sub.remove();
  }, []);
}
