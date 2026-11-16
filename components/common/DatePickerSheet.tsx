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
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { getTodayDate } from '@/lib/dateLabel';
import {
  firstDayOfWeekFor,
  getCalendarMonthNames,
  getCalendarWeekdayShortNames,
} from '@/lib/calendarLocale';
import {
  CalendarMonthGrid,
  MonthPager,
  WeekdayHeader,
  cellWidthFor,
  monthsAround,
  type MonthPagerRef,
} from './MonthPager';

const MONTHS_BACK = 12;

const sheetContainer =
  Platform.OS === 'ios'
    ? ({ children }: { children?: ReactNode }) => <FullWindowOverlay>{children}</FullWindowOverlay>
    : undefined;

export interface DatePickerSheetRef {
  present: () => void;
  dismiss: () => void;
}

interface DatePickerSheetProps {
  value: string;
  onChange: (date: string) => void;
  title: string;
  locale: string;
}

function CalendarContent({ value, onChange, title, locale, onDismiss }: DatePickerSheetProps & { onDismiss: () => void }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pagerRef = useRef<MonthPagerRef>(null);

  const today = getTodayDate();
  const months = useMemo(() => monthsAround(today, MONTHS_BACK), [today]);
  const monthNames = useMemo(() => getCalendarMonthNames(locale), [locale]);
  const weekdayNames = useMemo(() => getCalendarWeekdayShortNames(locale), [locale]);
  const firstDay = firstDayOfWeekFor(locale);
  const cellWidth = cellWidthFor(width);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleSelect = useCallback(
    (date: string) => {
      void Haptics.selectionAsync();
      onChange(date);
      onDismiss();
    },
    [onChange, onDismiss]
  );

  const handleGoToToday = useCallback(() => {
    void Haptics.selectionAsync();
    onChange(today);
    onDismiss();
  }, [onChange, onDismiss, today]);

  const visibleMonth = months[currentIndex] ?? months[0];
  const headerTitle = visibleMonth
    ? `${monthNames[visibleMonth.month] ?? ''} ${String(visibleMonth.year)}`
    : title;

  const isToday = value === today;

  const styles = StyleSheet.create({
    content: { paddingBottom: insets.bottom + 16, gap: 8 },
    headerRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingTop: 4,
    },
    title: { color: colors.text, fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
    monthLabel: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
    todayBtn: {
      paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
      backgroundColor: colors.blue + '18',
    },
    todayText: { color: colors.blue, fontSize: 13, fontWeight: '700' },
  });

  return (
    <BottomSheetView style={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{headerTitle}</Text>
        {!isToday ? (
          <Pressable onPress={handleGoToToday} style={styles.todayBtn} hitSlop={8}>
            <Text style={styles.todayText}>{t('date.today')}</Text>
          </Pressable>
        ) : null}
      </View>

      <WeekdayHeader names={weekdayNames} firstDayOfWeek={firstDay} cellWidth={cellWidth} />

      <MonthPager
        ref={pagerRef}
        months={months}
        width={width}
        onIndexChange={setCurrentIndex}
        renderMonth={({ item }) => (
          <CalendarMonthGrid
            year={item.year}
            month={item.month}
            today={today}
            selectedDate={value}
            firstDayOfWeek={firstDay}
            cellWidth={cellWidth}
            pageWidth={width}
            onSelect={handleSelect}
            dimFuture
            disableFuture
          />
        )}
      />
    </BottomSheetView>
  );
}

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

    const dismiss = useCallback(() => sheet.current?.dismiss(), []);

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
          onDismiss={dismiss}
        />
      </BottomSheetModal>
    );
  }
);

DatePickerSheet.displayName = 'DatePickerSheet';
