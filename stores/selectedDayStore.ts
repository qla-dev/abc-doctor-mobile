import { create } from 'zustand';
import { getTodayDate } from '@/lib/dateLabel';

type SelectedDayState = {
  /** The day every tab's header names, `YYYY-MM-DD`. */
  day: string;
  setDay: (day: string) => void;
};

/**
 * One day for the whole app, not one per screen: the header control appears on every tab, and a
 * day picked on one tab that did not follow to the next would read as a bug.
 *
 * Deliberately not persisted, unlike the preferences store. A day is a thing you are looking at
 * now, and an app reopened tomorrow should say Today rather than resume on whatever was last
 * tapped.
 */
export const useSelectedDayStore = create<SelectedDayState>(set => ({
  day: getTodayDate(),
  setDay: (day: string) => set({ day }),
}));
