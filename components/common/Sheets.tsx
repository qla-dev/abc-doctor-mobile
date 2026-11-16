import { ReactNode, useCallback, useContext, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetFooter, BottomSheetScrollView, BottomSheetView, type BottomSheetFooterProps } from '@gorhom/bottom-sheet';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { AppButton } from './AppButton';

/**
 * A sheet that sizes itself to its content. Dismissing it is always possible by dragging or by
 * tapping the backdrop; a sheet that can only be closed by a button strands people who opened
 * it by accident.
 */
export function CustomBottomSheet({ open, onClose, title, children, footer, scrollable = false }: {
  open: boolean; onClose: () => void; title?: string; children: ReactNode;
  /** Kept at the foot of the sheet while the body scrolls. */
  footer?: ReactNode;
  scrollable?: boolean;
}) {
  const { colors } = useTheme();
  const sheet = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['45%', '85%'], []);

  const handleChange = useCallback((index: number) => {
    if (index === -1) onClose();
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    []
  );

  const renderFooter = useCallback((props: BottomSheetFooterProps) => (
    <BottomSheetFooter {...props}>{footer}</BottomSheetFooter>
  ), [footer]);

  if (!open) return null;

  const styles = StyleSheet.create({
    background: { backgroundColor: colors.card },
    handle: { backgroundColor: colors.muted },
    content: { padding: 16, gap: 12 },
    title: { color: colors.text, fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  });

  return (
    <BottomSheet
      ref={sheet}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={scrollable || footer ? false : undefined}
      enablePanDownToClose
      onChange={handleChange}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
      footerComponent={footer ? renderFooter : undefined}
    >
      {scrollable ? (
        <BottomSheetScrollView
          contentContainerStyle={styles.content}
          enableFooterMarginAdjustment={Boolean(footer)}
        >
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {children}
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView style={styles.content}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {children}
        </BottomSheetView>
      )}
    </BottomSheet>
  );
}

export type SheetAction = {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'secondary' | 'danger';
};

/** A sheet of choices. Destructive options are tinted, never placed first. */
export function ActionBottomSheet({ open, onClose, title, actions, cancelLabel }: {
  open: boolean; onClose: () => void; title?: string; actions: SheetAction[]; cancelLabel: string;
}) {
  return (
    <CustomBottomSheet open={open} onClose={onClose} title={title}>
      <View style={{ gap: 9 }}>
        {actions.map(action => (
          <AppButton
            key={action.label}
            label={action.label}
            tone={action.tone ?? 'secondary'}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              action.onPress();
              onClose();
            }}
            full
          />
        ))}
        <AppButton label={cancelLabel} tone="ghost" onPress={onClose} full />
      </View>
    </CustomBottomSheet>
  );
}

/**
 * A pinned call to action. It sits above the home indicator with the screen's own background
 * behind it, so content scrolling underneath never shows through a transparent strip.
 */
export function FooterCta({ children, inset, surface = 'screen' }: {
  children: ReactNode; inset?: number; surface?: 'screen' | 'sheet';
}) {
  const { colors } = useTheme();
  const safeArea = useContext(SafeAreaInsetsContext);
  const bottomInset = inset ?? safeArea?.bottom ?? 0;
  return (
    <View style={{
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: Math.max(bottomInset, 12) + 5,
      backgroundColor: surface === 'sheet' ? colors.card : colors.background,
      gap: 8,
    }}>
      {children}
    </View>
  );
}
