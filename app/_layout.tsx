import { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as SystemUI from 'expo-system-ui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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

  useEffect(() => {
    // Without this the window behind the navigator flashes white on a cold start in dark mode.
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  return (
    <>
      <StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          // Chevron only: the route group name is an implementation detail.
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          headerTintColor: colors.blue,
          headerTitleStyle: { color: colors.text },
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Chat and voice live outside the tab navigator, as freightbook does with app/lena.tsx:
            an immersive full-bleed surface, not a themed screen with a tab bar under it. */}
        <Stack.Screen name="chat" options={{ headerShown: false, animation: "slide_from_bottom", animationDuration: 280 }} />
        <Stack.Screen name="settings" options={{ presentation: "modal" }} />
        <Stack.Screen name="simulation" options={{ headerShown: false, animation: "slide_from_bottom", animationDuration: 280 }} />
        <Stack.Screen name="voice" options={{ headerShown: false, presentation: "fullScreenModal", animation: "fade" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <LanguageProvider>
              <AuthProvider>
                <ErrorBoundary>
                  <RootStack />
                </ErrorBoundary>
              </AuthProvider>
            </LanguageProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
