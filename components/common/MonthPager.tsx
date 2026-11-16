import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeProvider';

export interface MonthKey {
  year: number;
  month: number;
}

export const monthKey = (entry: MonthKey) => `${entry.year}-${entry.month}`;

const pad = (value: number) => String(value).padStart(2, '0');

export const dayString = (year: number, month: number, day: number) =>
  `${year}-${pad(month + 1)}-${pad(day)}`;

export function monthsAround(anchor: string, back: number, forward = 0): MonthKey[] {
  const [year, month] = anchor.split('-').map(Number);
  return Array.from({ length: back + forward + 1 }, (_, index) => {
    const date = new Date(year!, (month ?? 1) - 1 + forward - index, 1);
    return { year: date.getFullYear(), month: date.getMonth() };
  });
}

interface WeekdayHeaderProps {
  names: string[];
  firstDayOfWeek: number;
  cellWidth: number;
}

export function WeekdayHeader({ names, firstDayOfWeek, cellWidth }: WeekdayHeaderProps) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 8, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.separator }}>
      {Array.from({ length: 7 }, (_, index) => {
        const label = names[(firstDayOfWeek + index) % 7] ?? '';
        return (
          <Text
            key={`${label}-${index}`}
            style={{ width: cellWidth, textAlign: 'center', fontSize: 12, fontWeight: '600', color: colors.muted, textTransform: 'uppercase' }}
          >
            {label}
          </Text>
        );
      })}
    </View>
  );
}

export interface CalendarMonthGridProps extends MonthKey {
  today: string;
  selectedDate: string;
  firstDayOfWeek: number;
  cellWidth: number;
  pageWidth: number;
  onSelect: (date: string) => void;
  dimFuture?: boolean;
  disableFuture?: boolean;
}

const DAY_CELL_PADDING = 6;
const LABEL_SIZE = 36;

export const CalendarMonthGrid = memo(function CalendarMonthGrid({
  year,
  month,
  today,
  selectedDate,
  firstDayOfWeek,
  cellWidth,
  pageWidth,
  onSelect,
  dimFuture = false,
  disableFuture = false,
}: CalendarMonthGridProps) {
  const { colors } = useTheme();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (new Date(year, month, 1).getDay() - firstDayOfWeek + 7) % 7;

  return (
    <View style={{ paddingHorizontal: 8, paddingBottom: 8, width: pageWidth }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {Array.from({ length: leading }, (_, index) => (
          <View key={`blank-${index}`} style={{ width: cellWidth }} />
        ))}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = dayString(year, month, index + 1);
          const isToday = day === today;
          const isSelected = day === selectedDate;
          const isFuture = day > today;
          const disabled = disableFuture && isFuture;
          return (
            <Pressable
              key={day}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled }}
              disabled={disabled}
              onPress={() => onSelect(day)}
              style={{
                width: cellWidth,
                paddingVertical: DAY_CELL_PADDING,
                alignItems: 'center',
                opacity: dimFuture && isFuture ? 0.35 : 1,
              }}
            >
              <View
                style={{
                  minWidth: LABEL_SIZE,
                  height: LABEL_SIZE,
                  paddingHorizontal: 4,
                  borderRadius: LABEL_SIZE / 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isSelected
                    ? colors.blue
                    : isToday
                      ? colors.blue + '18'
                      : 'transparent',
                }}
              >
                <Text
                  style={{
                    color: isSelected ? '#FFFFFF' : isToday ? colors.blue : colors.text,
                    fontWeight: isToday || isSelected ? '700' : '500',
                    fontSize: 15,
                  }}
                >
                  {index + 1}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

export interface MonthPagerRef {
  goTo: (index: number) => void;
}

interface MonthPagerProps {
  months: MonthKey[];
  initialIndex?: number;
  width: number;
  renderMonth: (info: { item: MonthKey; index: number; active: boolean }) => React.ReactNode;
  onIndexChange?: (index: number) => void;
}

export const MonthPager = forwardRef<MonthPagerRef, MonthPagerProps>(
  function MonthPager({ months, initialIndex = 0, width, renderMonth, onIndexChange }, ref) {
    const listRef = useRef<FlatList<MonthKey>>(null);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [activeMonths, setActiveMonths] = useState<Set<string>>(
      () => new Set(months[initialIndex] ? [monthKey(months[initialIndex])] : [])
    );

    const settle = useCallback(
      (index: number) => {
        const entry = months[index];
        if (!entry) return;
        setCurrentIndex(previous => {
          if (previous !== index) void Haptics.selectionAsync();
          return index;
        });
        setActiveMonths(previous =>
          previous.has(monthKey(entry)) ? previous : new Set(previous).add(monthKey(entry))
        );
      },
      [months]
    );

    const onIndexChangeRef = useRef(onIndexChange);
    useEffect(() => { onIndexChangeRef.current = onIndexChange; });
    useEffect(() => { onIndexChangeRef.current?.(currentIndex); }, [currentIndex]);

    useImperativeHandle(ref, () => ({
      goTo: (index: number) => {
        if (index < 0 || index >= months.length) return;
        listRef.current?.scrollToIndex({ index, animated: true });
        settle(index);
      },
    }));

    const [pageHeights, setPageHeights] = useState<Record<number, number>>({});
    const handlePageLayout = useCallback((index: number, height: number) => {
      setPageHeights(previous =>
        previous[index] === height ? previous : { ...previous, [index]: height }
      );
    }, []);
    const visibleHeight = pageHeights[currentIndex];

    const getItemLayout = useCallback(
      (_: ArrayLike<MonthKey> | null | undefined, index: number) => ({
        length: width, offset: width * index, index,
      }),
      [width]
    );

    return (
      <FlatList
        ref={listRef}
        data={months}
        keyExtractor={monthKey}
        horizontal
        pagingEnabled
        inverted
        initialScrollIndex={initialIndex > 0 ? initialIndex : undefined}
        showsHorizontalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        getItemLayout={getItemLayout}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        contentContainerStyle={{ alignItems: 'flex-start' }}
        style={visibleHeight ? { height: visibleHeight } : undefined}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={5}
        onMomentumScrollEnd={event =>
          settle(Math.round(event.nativeEvent.contentOffset.x / width))
        }
        renderItem={({ item, index }) => (
          <View onLayout={event => handlePageLayout(index, event.nativeEvent.layout.height)}>
            {renderMonth({ item, index, active: activeMonths.has(monthKey(item)) })}
          </View>
        )}
      />
    );
  }
);

export const cellWidthFor = (pageWidth: number) => Math.floor((pageWidth - 16) / 7);
