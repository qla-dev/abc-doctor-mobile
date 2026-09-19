import { create } from 'zustand';
import { createMMKV } from 'react-native-mmkv';

const store = createMMKV({ id: 'abc-doctor-prefs' });
const KEY = 'liquidGlassTabBarEnabled';

type AppPreferencesState = {
  /**
   * Whether the iOS native chrome is used: the large-title header with system bar-button items,
   * and the glass tab bar.
   *
   * fitness defaults this to false because it ships a screen-owned header as its baseline. Ours
   * defaults to true: the native large title is the behaviour we want — hidden at rest, tucking
   * up into the bar as content scrolls — and it is the only path that gets real system buttons.
   */
  liquidGlassTabBarEnabled: boolean;
  setLiquidGlassTabBarEnabled: (enabled: boolean) => void;
};

function readInitial(): boolean {
  try {
    const stored = store.getString(KEY);
    return stored === undefined ? true : stored === 'true';
  } catch {
    return true;
  }
}

export const useAppPreferencesStore = create<AppPreferencesState>(set => ({
  liquidGlassTabBarEnabled: readInitial(),
  setLiquidGlassTabBarEnabled: (enabled: boolean) => {
    try {
      store.set(KEY, String(enabled));
    } catch {
      // A failed write only costs the preference on next launch.
    }
    set({ liquidGlassTabBarEnabled: enabled });
  },
}));
