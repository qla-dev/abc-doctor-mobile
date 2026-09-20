import {
  forwardRef,
  ReactNode,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import DateTimePicker, { useDefaultStyles } from 'react-native-ui-datepicker';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { fromDateString, toDateString } from '@/lib/dateLabel';
import {
  DATEPICKER_LOCALE,
  firstDayOfWeekFor,
  getCalendarMonthNames,
  getCalendarWeekdayShortNames,
} from '@/lib/calendarLocale';

/**
 * iOS draws the sheet inside its own UIWindow so it sits above the floating tab bar; without it
 * the last week of the month renders behind the bar. `containerComponent` exists only on
 * BottomSheetModal, which is why this is a modal. No-op on Android. From fitness's
 * `ui/sheetChrome`.
 */
const sheetContainer =
  Platform.OS === 'ios'
    ? ({ children }: { children?: ReactNode }) => <FullWindowOverlay>{children}</FullWindowOverlay>
    : undefined;

export interface DatePickerSheetRef {
  present: () => void;
  dismiss: () => void;
}

interface DatePickerSheetProps {
  /** The selected day, `YYYY-MM-DD`. */
  value: string;
  onChange: (date: string) => void;
  title: string;
  /** An Intl tag (`bs-BA`) for the names — not the picker's own locale. */
  locale: string;
}

/**
 * The calendar itself. Mounted inside the modal and keyed on the selected day, the way fitness
 * keys its CalendarContent: a changed day starts a fresh calendar view while the sheet stays
 * mounted, so it neither dismisses nor loses its lifecycle state.
 */
function CalendarContent({ value, onChange, title, locale }: DatePickerSheetProps) {
  const { colors, resolvedMode } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  // The package ships a full light and dark style set; ours only restates the few colours that
  // carry the app's identity rather than the package's.
  const base = useDefaultStyles(resolvedMode);
  const monthNames = useMemo(() => getCalendarMonthNames(locale), [locale]);
  const weekdayNames = useMemo(() => getCalendarWeekdayShortNames(locale), [locale]);

  // The month on screen is held here rather than left to the picker, because the header naming it
  // is ours — the library's own header would print an English month.
  const [visible, setVisible] = useState(() => {
    const date = fromDateString(value);
    return { month: date.getMonth(), year: date.getFullYear() };
  });

  const shiftMonth = useCallback((delta: number) => {
    setVisible(current => {
      const moved = new Date(current.year, current.month + delta, 1);
      return { month: moved.getMonth(), year: moved.getFullYear() };
    });
  }, []);

  const styles = StyleSheet.create({
    content: { paddingHorizontal: 16, paddingBottom: insets.bottom + 16, gap: 12 },
    title: { color: colors.text, fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
    header: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', paddingHorizontal: 4,
    },
    monthLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
    weekday: { color: colors.muted, fontSize: 12, textAlign: 'center' },
    monthCell: { color: colors.text, fontSize: 15, textAlign: 'center', paddingVertical: 6 },
  });

  return (
    <BottomSheetView style={styles.content}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.header}>
        <Pressable
          onPress={() => shiftMonth(-1)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('date.previousMonth')}
        >
          <ChevronLeft size={20} color={colors.blue} />
        </Pressable>
        <Text style={styles.monthLabel}>
          {monthNames[visible.month]} {visible.year}
        </Text>
        <Pressable
          onPress={() => shiftMonth(1)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('date.nextMonth')}
        >
          <ChevronRight size={20} color={colors.blue} />
        </Pressable>
      </View>

      <DateTimePicker
        mode="single"
        date={fromDateString(value)}
        month={visible.month}
        year={visible.year}
        onMonthChange={(month: number) => setVisible(current => ({ ...current, month }))}
        onYearChange={(year: number) => setVisible(current => ({ ...current, year }))}
        hideHeader
        locale={DATEPICKER_LOCALE}
        firstDayOfWeek={firstDayOfWeekFor(locale)}
        onChange={(params: { date?: unknown }) => {
          if (!params.date) return;
          onChange(toDateString(new Date(params.date as string)));
        }}
        components={{
          Weekday: (weekday: { index: number; name: { short: string } }) => (
            <View style={{ minWidth: 30 }}>
              <Text style={styles.weekday}>
                {weekdayNames[weekday.index] ?? weekday.name.short}
              </Text>
            </View>
          ),
          Month: (month: { index: number; name: { full: string } }) => (
            <Text style={styles.monthCell}>{monthNames[month.index] ?? month.name.full}</Text>
          ),
        }}
        styles={{
          ...base,
          today: { borderColor: colors.blue, borderWidth: 1, borderRadius: 999 },
          today_label: { color: colors.blue },
          selected: { backgroundColor: colors.blue, borderRadius: 999 },
          selected_label: { color: '#FFFFFF', fontWeight: '700' },
          day_label: { color: colors.text },
          outside_label: { color: colors.muted },
          disabled_label: { color: colors.muted },
          year_label: { color: colors.text },
        }}
      />
    </BottomSheetView>
  );
}

/**
 * A plain month calendar in a sheet — the control behind the header's day button.
 *
 * Opened imperatively through the ref, the way fitness opens its CalendarSheet: the modal stays
 * mounted and the screen calls `present()`. Deliberately NOT their RingCalendarSheet, which draws
 * activity rings per day and reads them from the API. The picked day is returned and otherwise
 * unused — wiring it to content is a later job.
 */
export const DatePickerSheet = forwardRef<DatePickerSheetRef, DatePickerSheetProps>(
  ({ value, onChange, title, locale }, ref) => {
    const { colors, resolvedMode } = useTheme();
    const insets = useSafeAreaInsets();
    const sheet = useRef<BottomSheetModal>(null);

    useImperativeHandle(ref, () => ({
      present: () => sheet.current?.present(),
      dismiss: () => sheet.current?.dismiss(),
    }));

    useEffect(() => {
      const current = sheet.current;
      return () => current?.dismiss();
    }, []);

    const renderBackdrop = useCallback(
      (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={resolvedMode === 'dark' ? 0.7 : 0.5}
        />
      ),
      [resolvedMode]
    );

    return (
      <BottomSheetModal
        ref={sheet}
        // The sheet takes the calendar's own height instead of a fixed fraction, which is what
        // left the last week of the month cut off.
        enableDynamicSizing
        enablePanDownToClose
        topInset={insets.top}
        backdropComponent={renderBackdrop}
        containerComponent={sheetContainer}
        backgroundStyle={{ backgroundColor: colors.card }}
        handleIndicatorStyle={{ backgroundColor: colors.muted }}
      >
        <CalendarContent
          key={value}
          value={value}
          title={title}
          locale={locale}
          onChange={date => {
            onChange(date);
            sheet.current?.dismiss();
          }}
        />
      </BottomSheetModal>
    );
  }
);

DatePickerSheet.displayName = 'DatePickerSheet';
