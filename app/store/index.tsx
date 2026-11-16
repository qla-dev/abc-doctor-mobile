import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MessageCircle, Mic, Crown, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { AppCard } from '@/components/common/AppCard';
import { usePurchaseState } from '@/hooks/usePurchases';
import { createGlobalStyles } from '@/theme/styles';

export default function StoreIndex() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data: state } = usePurchaseState();
  const g = createGlobalStyles(colors);

  const tierLabel = state?.subscription_tier
    ? state.subscription_tier === 'pro' ? 'Pro' : 'Basic'
    : null;

  const cards: {
    title: string;
    subtitle: string;
    icon: typeof MessageCircle;
    iconColor: string;
    badge: string;
    price: string;
    route: '/store/messages' | '/store/voice' | '/store/subscription';
  }[] = [
    {
      title: 'Poruke',
      subtitle: 'AI tekstualni razgovori',
      icon: MessageCircle,
      iconColor: colors.blue,
      badge: state ? `${state.messages}` : '—',
      price: 'od $2.99',
      route: '/store/messages',
    },
    {
      title: 'Glasovne minute',
      subtitle: 'AI glasovni razgovori',
      icon: Mic,
      iconColor: colors.green,
      badge: state ? `${state.voice_minutes}` : '—',
      price: 'od $5.99',
      route: '/store/voice',
    },
    {
      title: 'Pretplata',
      subtitle: tierLabel ? `${tierLabel} plan aktivan` : 'Nadogradi svoj račun',
      icon: Crown,
      iconColor: colors.orange,
      badge: tierLabel ?? 'Besplatno',
      price: 'od $9.99/mj',
      route: '/store/subscription',
    },
  ];

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={g.screen}
      contentContainerStyle={g.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {state && (
        <AppCard>
          <Text style={[s.balanceTitle, { color: colors.text }]}>Stanje računa</Text>
          <View style={s.balanceRow}>
            <View style={s.balanceStat}>
              <Text style={[s.balanceValue, { color: colors.blue }]}>{state.messages}</Text>
              <Text style={[s.balanceLabel, { color: colors.muted }]}>poruka</Text>
            </View>
            <View style={[s.balanceDivider, { backgroundColor: colors.separator }]} />
            <View style={s.balanceStat}>
              <Text style={[s.balanceValue, { color: colors.green }]}>{state.voice_minutes}</Text>
              <Text style={[s.balanceLabel, { color: colors.muted }]}>minuta</Text>
            </View>
            <View style={[s.balanceDivider, { backgroundColor: colors.separator }]} />
            <View style={s.balanceStat}>
              <Text style={[s.balanceValue, { color: colors.orange }]}>{tierLabel ?? '—'}</Text>
              <Text style={[s.balanceLabel, { color: colors.muted }]}>plan</Text>
            </View>
          </View>
        </AppCard>
      )}

      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <AppCard key={card.route} onPress={() => router.push(card.route)}>
            <View style={s.cardInner}>
              <View style={[s.iconCircle, { backgroundColor: card.iconColor + '18' }]}>
                <Icon size={22} color={card.iconColor} />
              </View>
              <View style={s.cardText}>
                <View style={s.cardTitleRow}>
                  <Text style={[s.cardTitle, { color: colors.text }]}>{card.title}</Text>
                  <View style={[s.badgePill, { backgroundColor: colors.input }]}>
                    <Text style={[s.badgeText, { color: colors.text }]}>{card.badge}</Text>
                  </View>
                </View>
                <Text style={[s.cardSubtitle, { color: colors.muted }]}>{card.subtitle}</Text>
                <Text style={[s.cardPrice, { color: colors.secondaryText }]}>{card.price}</Text>
              </View>
              <ChevronRight size={18} color={colors.muted} />
            </View>
          </AppCard>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  balanceTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' },
  balanceStat: { alignItems: 'center', gap: 2 },
  balanceValue: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  balanceLabel: { fontSize: 12, fontWeight: '600' },
  balanceDivider: { width: StyleSheet.hairlineWidth, height: 36 },
  cardInner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconCircle: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1, gap: 2 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  badgePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  cardSubtitle: { fontSize: 13 },
  cardPrice: { fontSize: 12, fontWeight: '600', marginTop: 2 },
});
