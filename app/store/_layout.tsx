import { Stack } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';

export default function StoreLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTintColor: colors.blue,
        headerTitleStyle: { color: colors.text },
        headerStyle: { backgroundColor: colors.card },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Trgovina' }} />
      <Stack.Screen name="messages" options={{ title: 'Dopuna poruka' }} />
      <Stack.Screen name="voice" options={{ title: 'Dopuna minuta' }} />
      <Stack.Screen name="subscription" options={{ title: 'Pretplata' }} />
    </Stack>
  );
}
