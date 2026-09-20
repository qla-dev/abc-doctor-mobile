import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import type { Theme } from 'expo-router';
import * as SystemUI from 'expo-system-ui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { LanguageProvider } from '@/context/LanguageContext';
import { AuthProvider } from '@/context/AuthContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import '@/i18n';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 2 } },
});

function RootStack() {
  const { colors, resolvedMode } = useTheme();
  const isDark = resolvedMode === 'dark';

  /**
   * react-navigation's own theme, which expo-router reads in the places our ThemeProvider cannot
   * reach: the native tab scene paints itself from `colors.background` (ScreenContent in
   * NativeTabsView.shared) and the header from `colors.card` (useHeaderConfigProps). Left unset it
   * is the LIGHT default — that is the white that showed through mid-transition on a dark screen,
   * and the light chrome on the header buttons.
   *
   * `card` is set to the background rather than to our card colour on purpose: iOS 26's glass
   * samples it during tab and header transitions, so it has to be solid and in step with what is
   * behind it. fitness's App.tsx keeps the two equal for exactly this reason.
   */
  const navigationTheme = useMemo<Theme>(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: isDark,
      colors: {
        ...base.colors,
        primary: colors.blue,
        background: colors.background,
        card: colors.background,
        text: colors.text,
        border: colors.separator,
        notification: colors.blue,
      },
    };
  }, [isDark, colors]);

  useEffect(() => {
    // Without this the window behind the navigator flashes white on a cold start in dark mode.
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          // Chevron only: the route group name is an implementation detail.
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          headerTintColor: colors.blue,
          headerTitleStyle: { color: colors.text },
          contentStyle: { backgroundColor: colors.background },
          /**
           * No painted bar. A tab's header is transparent because a large title forces it to be,
           * and a pushed screen has to be told — otherwise the app is glass everywhere except the
           * screens you push, which is exactly where the seam shows.
           *
           * Screens under this stack scroll with `contentInsetAdjustmentBehavior="automatic"`, so
           * iOS insets them below the bar and lets the content pass under it.
           */
          headerTransparent: true,
          headerStyle: { backgroundColor: 'transparent' },
        }}
        /**
         * The back chevron is drawn by the OS and has no press handler to hang a haptic on, so the
         * start of the dismiss animation stands in for the tap — the earliest signal there is.
         * fitness does the same in its popScreenListeners.
         */
        screenListeners={{
          transitionStart: (event: { data?: { closing?: boolean } }) => {
            if (event.data?.closing) void Haptics.selectionAsync();
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Chat and voice live outside the tab navigator, as freightbook does with app/lena.tsx:
            an immersive full-bleed surface, not a themed screen with a tab bar under it. */}
        <Stack.Screen name="chat" options={{ headerShown: false, animation: "slide_from_bottom", animationDuration: 280 }} />
        <Stack.Screen name="settings" options={{ presentation: "modal" }} />
        <Stack.Screen name="voice" options={{ headerShown: false, presentation: "fullScreenModal", animation: "fade" }} />
      </Stack>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <LanguageProvider>
                <AuthProvider>
                  {/* Sheet content renders into this provider's portal, so the provider has to sit
                      BELOW every context that content reads — ours are React contexts, and a portal
                      host above them puts the sheet outside their reach. */}
                  <BottomSheetModalProvider>
                    <ErrorBoundary>
                      <RootStack />
                    </ErrorBoundary>
                  </BottomSheetModalProvider>
                </AuthProvider>
              </LanguageProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
