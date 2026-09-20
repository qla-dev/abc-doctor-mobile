/**
 * Calendar localisation for `react-native-ui-datepicker`, taken from fitness's
 * `utils/calendarLocalization`.
 *
 * The picker's own `locale` prop wants a dayjs locale, and we deliberately do NOT import
 * `dayjs/locale/bs` to feed it: dayjs is only a transitive dependency of the picker, and fitness
 * found that importing it top-level breaks Metro's resolution. So the picker stays on English and
 * every name the user actually reads is produced here through `Intl` and handed to the picker's
 * Weekday/Month component overrides. That also means the grid re-localises on a runtime language
 * switch, with no dayjs global state to get out of step.
 */

/** What the picker is told. Never shown — the overrides below cover every visible name. */
export const DATEPICKER_LOCALE = 'en';

/** 0 = Sunday … 6 = Saturday. Bosnian and German weeks start on Monday; English on Sunday. */
export function firstDayOfWeekFor(locale: string): number {
  return locale.toLowerCase().startsWith('en') ? 0 : 1;
}

/** Short weekday names indexed the way `Date.getDay()` counts — 0 is Sunday. */
export function getCalendarWeekdayShortNames(locale: string): string[] {
  const sunday = new Date(2026, 0, 4);
  const format = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  return Array.from({ length: 7 }, (_, i) =>
    format.format(new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i))
  );
}

/** Month names indexed by month number — 0 is January. */
export function getCalendarMonthNames(locale: string): string[] {
  const format = new Intl.DateTimeFormat(locale, { month: 'long' });
  return Array.from({ length: 12 }, (_, i) => format.format(new Date(2026, i, 1)));
}
