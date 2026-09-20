import { useCallback, useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useSelectedDayStore } from '@/stores/selectedDayStore';
import { formatDateLabel, localeFor } from '@/lib/dateLabel';
import { DatePickerSheet, type DatePickerSheetRef } from '@/components/common/DatePickerSheet';

/**
 * The day button every tab carries, and the calendar behind it.
 *
 * Returns the pieces rather than rendering them, because they land in three different places: the
 * native bar takes a text item, the fallback bar takes a label and a handler, and the sheet is a
 * sibling of the screen's scroll view. Returning an element from a hook is the shape fitness's own
 * `useScreenHeader` uses for the same reason.
 *
 * The day itself lives in the store, so it is the same day on every tab.
 */
export function useDayControl() {
  const { t, language } = useLanguage();
  const day = useSelectedDayStore(state => state.day);
  const setDay = useSelectedDayStore(state => state.setDay);
  const sheet = useRef<DatePickerSheetRef>(null);

  const locale = localeFor(language);
  const dateLabel = formatDateLabel(day, t, locale);
  const onDatePress = useCallback(() => sheet.current?.present(), []);
  const chooseDateLabel = t('date.choose');

  return {
    /** For the fallback bar. */
    dateLabel,
    onDatePress,
    chooseDateLabel,
    /** For the native bar, which takes a label or a symbol but never a component. */
    leftText: {
      label: dateLabel,
      accessibilityLabel: chooseDateLabel,
      identifier: 'date',
      onPress: onDatePress,
    },
    /** Render this last in the screen, after the scroll view. */
    sheet: (
      <DatePickerSheet
        ref={sheet}
        title={chooseDateLabel}
        value={day}
        onChange={setDay}
        locale={locale}
      />
    ),
  };
}
