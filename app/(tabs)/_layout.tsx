import { Platform } from 'react-native';
import { Stack, Tabs, router } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import * as Haptics from 'expo-haptics';
import { BookOpen, Home, ListChecks, MessagesSquare, Settings, Stethoscope } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { playClickSound } from '@/lib/sound';

const TAB_SCREEN_LISTENERS = { tabPress: () => void Haptics.selectionAsync() };

function openSettings() {
  void playClickSound();
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  router.push('/settings');
}

function IosTabs() {
  const { colors, resolvedMode } = useTheme();
  const { t } = useLanguage();
  return (
    <>
      {/*
        The toolbar button lives on the Stack screen that hosts the tabs, not inside each tab:
        iOS renders one navigation bar above the whole tab navigator, so declaring it per tab
        would fight over the same slot. Stack.Toolbar.Button takes an SF Symbol name only —
        never a component — so a custom mark would have to be pre-rasterised to an image.
      */}
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: '',
        }}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel={t('common.settings')}
          icon="gearshape"
          onPress={openSettings}
        />
      </Stack.Toolbar>
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
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' } as any} />
          <NativeTabs.Trigger.Label>{t('tabs.home')}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        {/* role="search" gives Handbook the system's own search presentation on iOS 26. */}
        <NativeTabs.Trigger name="handbook" role="search">
          <NativeTabs.Trigger.Icon sf={{ default: 'book', selected: 'book.fill' } as any} />
          <NativeTabs.Trigger.Label>{t('tabs.handbook')}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="quiz">
          <NativeTabs.Trigger.Icon sf={{ default: 'checklist', selected: 'checklist' } as any} />
          <NativeTabs.Trigger.Label>{t('tabs.quiz')}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="simulator">
          <NativeTabs.Trigger.Icon sf={{ default: 'stethoscope', selected: 'stethoscope' } as any} />
          <NativeTabs.Trigger.Label>{t('tabs.simulator')}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="ai">
          <NativeTabs.Trigger.Icon sf={{ default: 'bubble.left.and.bubble.right', selected: 'bubble.left.and.bubble.right.fill' } as any} />
          <NativeTabs.Trigger.Label>{t('tabs.ai')}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </>
  );
}

function AndroidTabs() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const headerRight = () => (
    <Settings
      size={21}
      color={colors.text}
      onPress={openSettings}
      accessibilityLabel={t('common.settings')}
    />
  );
  return (
    <Tabs
      screenListeners={TAB_SCREEN_LISTENERS}
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text },
        headerShadowVisible: false,
        headerRightContainerStyle: { paddingRight: 16 },
        headerRight,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.separator },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tabs.Screen name="handbook" options={{ title: t('tabs.handbook'), tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} /> }} />
      <Tabs.Screen name="quiz" options={{ title: t('tabs.quiz'), tabBarIcon: ({ color, size }) => <ListChecks color={color} size={size} /> }} />
      <Tabs.Screen name="simulator" options={{ title: t('tabs.simulator'), tabBarIcon: ({ color, size }) => <Stethoscope color={color} size={size} /> }} />
      <Tabs.Screen name="ai" options={{ title: t('tabs.ai'), tabBarIcon: ({ color, size }) => <MessagesSquare color={color} size={size} /> }} />
    </Tabs>
  );
}

export default function TabsLayout() {
  return Platform.OS === 'ios' ? <IosTabs /> : <AndroidTabs />;
}
