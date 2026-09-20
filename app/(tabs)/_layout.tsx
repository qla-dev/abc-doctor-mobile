import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import * as Haptics from 'expo-haptics';
import { BookOpen, Home, ListChecks, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { useNativeIOSTabsActive } from '@/lib/nativeTabBarPreference';

const TAB_SCREEN_LISTENERS = { tabPress: () => void Haptics.selectionAsync() };

function IosTabs() {
  const { colors, resolvedMode } = useTheme();
  const { t } = useLanguage();
  return (
    <NativeTabs
        key={resolvedMode}
        tintColor={colors.blue}
        backgroundColor={colors.card}
        iconColor={{ default: colors.muted, selected: colors.blue }}
        labelStyle={{ default: { color: colors.muted }, selected: { color: colors.blue } }}
        blurEffect={resolvedMode === 'dark' ? 'systemMaterialDark' : 'systemMaterialLight'}
        labelVisibilityMode="labeled"
        disableTransparentOnScrollEdge
        screenListeners={TAB_SCREEN_LISTENERS}
      >
        {/* `(home)` is a group, not a folder name: that is what keeps this tab's index at `/`,
            so the launch URL resolves instead of falling through to Unmatched Route. */}
        <NativeTabs.Trigger name="(home)">
          <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' } as any} />
          <NativeTabs.Trigger.Label>{t('tabs.home')}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="quiz">
          <NativeTabs.Trigger.Icon sf={{ default: 'checklist', selected: 'checklist' } as any} />
          <NativeTabs.Trigger.Label>{t('tabs.tests')}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="handbook">
          <NativeTabs.Trigger.Icon sf={{ default: 'book', selected: 'book.fill' } as any} />
          <NativeTabs.Trigger.Label>{t('tabs.handbook')}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        {/* Nina is the search tab, and `role="search"` is what sets her apart from the rest:
            iOS 26 gives a search tab its own place at the end of the bar and, as the bar
            minimises, turns it into the search field itself. Asking her something IS the search
            here, so that field opens a consultation — see the ai tab's Stack.SearchBar. */}
        <NativeTabs.Trigger name="ai" role="search">
          <NativeTabs.Trigger.Icon sf={{ default: 'sparkles', selected: 'sparkles' } as any} />
          <NativeTabs.Trigger.Label>{t('tabs.ai')}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
    </NativeTabs>
  );
}

/**
 * The bar Android draws, and the one iOS falls back to — either because the device predates the
 * glass APIs or because the user turned the toggle off. fitness splits the same way, in
 * TabsLayout's NativeTabsLayout / FallbackTabsLayout pair.
 */
function FallbackTabs() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  return (
    <Tabs
      screenListeners={TAB_SCREEN_LISTENERS}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.separator },
      }}
    >
      <Tabs.Screen name="(home)" options={{ title: t('tabs.home'), tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tabs.Screen name="quiz" options={{ title: t('tabs.tests'), tabBarIcon: ({ color, size }) => <ListChecks color={color} size={size} /> }} />
      <Tabs.Screen name="handbook" options={{ title: t('tabs.handbook'), tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} /> }} />
      {/* Last here too: this bar has no separate slot to give her, and the order is the only
          thing that can say the same. */}
      <Tabs.Screen name="ai" options={{ title: t('tabs.ai'), tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} /> }} />
    </Tabs>
  );
}

/**
 * Which bar is on is a property of the device and the preference, not of the platform: iOS
 * before the glass APIs, and iOS 26 with the toggle off, both take the fallback. Switching on
 * `Platform.OS === 'ios'` alone left the glass tab bar under the fallback headers.
 */
export default function TabsLayout() {
  const usesNativeTabs = useNativeIOSTabsActive();
  return usesNativeTabs ? <IosTabs /> : <FallbackTabs />;
}
