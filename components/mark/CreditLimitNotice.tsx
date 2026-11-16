import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ShoppingCart } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeProvider';

type LimitKind = 'messages' | 'voice' | 'both';

const COPY: Record<LimitKind, { title: string; body: string }> = {
  messages: {
    title: 'Nemate više poruka',
    body: 'Kupite dodatne poruke ili pretplatu da nastavite razgovor.',
  },
  voice: {
    title: 'Nemate glasovnih minuta',
    body: 'Kupite dodatne minute ili pretplatu da koristite glasovni razgovor.',
  },
  both: {
    title: 'Nemate kredita',
    body: 'Kupite poruke, glasovne minute ili pretplatu da nastavite.',
  },
};

export function CreditLimitNotice({ kind }: { kind: LimitKind }) {
  const { colors } = useTheme();
  const router = useRouter();
  const copy = COPY[kind];

  return (
    <View style={[s.root, { backgroundColor: colors.orange + '14' }]}>
      <Text style={[s.title, { color: colors.orange }]}>{copy.title}</Text>
      <Text style={[s.body, { color: colors.muted }]}>{copy.body}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => { void Haptics.selectionAsync(); router.push('/store'); }}
        style={({ pressed }) => [s.button, { backgroundColor: colors.orange, opacity: pressed ? 0.8 : 1 }]}
      >
        <ShoppingCart size={14} color="#fff" />
        <Text style={s.buttonText}>Kupite kredite</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: { marginHorizontal: 12, marginBottom: 8, borderRadius: 14, padding: 14, gap: 6 },
  title: { fontSize: 14, fontWeight: '800' },
  body: { fontSize: 12, lineHeight: 17 },
  button: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
