/**
 * Date helpers for the header's day control, taken from fitness's `utils/dateUtils` and cut to
 * what that control needs.
 *
 * A day is held as a `YYYY-MM-DD` string rather than a Date. A Date carries a time and a zone,
 * and both of those can move a day across midnight when all anyone meant was "the 14th".
 */

export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromDateString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function getTodayDate(): string {
  return toDateString(new Date());
}

export function addDays(dateString: string, days: number): string {
  const [year, month, day] = dateString.split('-').map(Number);
  return toDateString(new Date(year ?? 1970, (month ?? 1) - 1, (day ?? 1) + days));
}

/** The app's languages mapped to the tags `toLocaleDateString` wants. */
export function localeFor(language: string): string {
  if (language === 'bs') return 'bs-BA';
  if (language === 'de') return 'de-DE';
  return 'en-US';
}

/**
 * Relative where that reads better, the calendar date otherwise — the header's left slot is
 * short, so the shortest true label wins. Same rule as fitness's `formatDateLabel`.
 */
export function formatDateLabel(
  dateString: string,
  t: (key: string) => string,
  locale: string
): string {
  const today = getTodayDate();
  if (dateString === today) return t('date.today');
  if (dateString === addDays(today, -1)) return t('date.yesterday');
  if (dateString === addDays(today, 1)) return t('date.tomorrow');
  return fromDateString(dateString).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
  });
}
