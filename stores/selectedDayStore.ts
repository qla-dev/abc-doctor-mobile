import { create } from 'zustand';
import { addDays, getTodayDate } from '@/lib/dateLabel';

type SelectedDayState = {
  day: string;
  setDay: (day: string) => void;
  goToToday: () => void;
  goToPreviousDay: () => void;
  goToNextDay: () => void;
  syncTodayRollover: () => void;
};

export const useSelectedDayStore = create<SelectedDayState>((set, get) => ({
  day: getTodayDate(),
  setDay: (day: string) => set({ day }),
  goToToday: () => set({ day: getTodayDate() }),
  goToPreviousDay: () => set({ day: addDays(get().day, -1) }),
  goToNextDay: () => {
    const next = addDays(get().day, 1);
    if (next <= getTodayDate()) set({ day: next });
  },
  syncTodayRollover: () => {
    const today = getTodayDate();
    if (get().day > today) set({ day: today });
  },
}));
