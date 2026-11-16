import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Crown, Check, MessageCircle, Mic, Shield } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { AppButton } from '@/components/common/AppButton';
import { AppCard } from '@/components/common/AppCard';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { useStorePrices, usePurchaseState, useInvalidatePurchaseState, priceLabel } from '@/hooks/usePurchases';
import { buySubscription, SUBSCRIPTION_PRODUCTS, PurchaseCancelledError, purchasesAvailable } from '@/lib/purchases';
import { createGlobalStyles } from '@/theme/styles';

type Tier = 'basic' | 'pro';
type Period = 'monthly' | 'annual';

const TIERS: { key: Tier; name: string; tagline: string; color: string }[] = [
  { key: 'basic', name: 'Basic', tagline: '300 poruka + 30 minuta/mj', color: '#007AFF' },
  { key: 'pro', name: 'Pro', tagline: '800 poruka + 60 minuta/mj', color: '#FF9500' },
];

const FEATURES: { tier: Tier; label: string; icon: typeof MessageCircle }[] = [
  { tier: 'basic', label: '300 poruka mjesečno', icon: MessageCircle },
  { tier: 'basic', label: '30 glasovnih minuta mjesečno', icon: Mic },
  { tier: 'pro', label: '800 poruka mjesečno', icon: MessageCircle },
  { tier: 'pro', label: '60 glasovnih minuta mjesečno', icon: Mic },
  { tier: 'pro', label: 'Prioritetna podrška', icon: Shield },
];

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'monthly', label: 'Mjesečno' },
  { value: 'annual', label: 'Godišnje' },
];

export default function SubscriptionScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const prices = useStorePrices();
  const { data: state } = usePurchaseState();
  const invalidate = useInvalidatePurchaseState();
  const g = createGlobalStyles(colors);

  const [tier, setTier] = useState<Tier>('pro');
  const [period, setPeriod] = useState<Period>('monthly');
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState('');

  const selectedProduct = SUBSCRIPTION_PRODUCTS.find(p => p.tier === tier && p.period === period)!;
  const monthlyEquiv = period === 'annual'
    ? `$${(selectedProduct.listPrice / 12).toFixed(2)}/mj`
    : null;

  const isCurrentPlan = state?.subscription_tier === tier;

  const handleBuy = async () => {
    setBuying(true);
    setError('');
    try {
      await buySubscription(selectedProduct.productId);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      invalidate();
      router.back();
    } catch (e) {
      if (e instanceof PurchaseCancelledError) return;
      setError(e instanceof Error ? e.message : 'Kupovina nije uspjela.');
    } finally {
      setBuying(false);
    }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={g.screen}
      contentContainerStyle={[g.scrollContent, { paddingTop: 8 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.hero}>
        <View style={[s.heroIcon, { backgroundColor: colors.orange + '18' }]}>
          <Crown size={28} color={colors.orange} />
        </View>
        <Text style={[s.heroTitle, { color: colors.text }]}>ABC Doctor Pro</Text>
        <Text style={[s.heroDesc, { color: colors.muted }]}>
          Pretplati se i dobij mjesečne poruke, glasovne minute i prioritetnu podršku.
        </Text>
      </View>

      {state?.subscription_tier && (
        <AppCard>
          <View style={s.currentPlan}>
            <Text style={[s.currentLabel, { color: colors.muted }]}>Trenutni plan</Text>
            <Text style={[s.currentValue, { color: colors.text }]}>
              {state.subscription_tier === 'pro' ? 'Pro' : 'Basic'}
            </Text>
            {state.subscription_expires_at && (
              <Text style={[s.currentExpiry, { color: colors.muted }]}>
                Obnavlja se {new Date(state.subscription_expires_at).toLocaleDateString('hr-HR')}
              </Text>
            )}
          </View>
        </AppCard>
      )}

      <View style={s.tierRow}>
        {TIERS.map((t) => {
          const active = tier === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => { void Haptics.selectionAsync(); setTier(t.key); }}
              style={[
                s.tierCard,
                { backgroundColor: colors.card, borderColor: active ? t.color : 'transparent' },
              ]}
            >
              <View style={[s.radio, { borderColor: active ? t.color : colors.muted }]}>
                {active && <View style={[s.radioFill, { backgroundColor: t.color }]} />}
              </View>
              <Text style={[s.tierName, { color: colors.text }]}>{t.name}</Text>
              <Text style={[s.tierTagline, { color: colors.muted }]}>{t.tagline}</Text>
            </Pressable>
          );
        })}
      </View>

      <SegmentedControl options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />

      <AppCard>
        <View style={s.priceSection}>
          <Text style={[s.priceBig, { color: colors.text }]}>
            {priceLabel(prices.data, selectedProduct.productId, selectedProduct.listPrice)}
          </Text>
          <Text style={[s.pricePeriod, { color: colors.muted }]}>
            /{period === 'monthly' ? 'mj' : 'god'}
          </Text>
        </View>
        {monthlyEquiv && (
          <Text style={[s.monthlyEquiv, { color: colors.green }]}>
            ≈ {monthlyEquiv} — uštedi {Math.round((1 - selectedProduct.listPrice / 12 / SUBSCRIPTION_PRODUCTS.find(p => p.tier === tier && p.period === 'monthly')!.listPrice) * 100)}%
          </Text>
        )}
      </AppCard>

      <AppCard>
        <Text style={[s.featuresTitle, { color: colors.text }]}>
          {tier === 'pro' ? 'Pro' : 'Basic'} plan uključuje
        </Text>
        {FEATURES.filter(f => f.tier === tier).map((f, i) => {
          const Icon = f.icon;
          const tierConfig = TIERS.find(t => t.key === tier)!;
          return (
            <View key={i} style={s.featureRow}>
              <Check size={16} color={tierConfig.color} />
              <Text style={[s.featureText, { color: colors.text }]}>{f.label}</Text>
            </View>
          );
        })}
      </AppCard>

      <View style={s.footer}>
        {error ? <Text style={{ color: colors.red, fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}>{error}</Text> : null}
        {!purchasesAvailable() ? <Text style={{ color: colors.orange, fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}>Kupovina nije dostupna u ovom okruženju.</Text> : null}
        <AppButton
          label={
            buying ? 'Kupovina…'
              : isCurrentPlan ? 'Već ste pretplaćeni'
                : `Pretplati se · ${priceLabel(prices.data, selectedProduct.productId, selectedProduct.listPrice)}/${period === 'monthly' ? 'mj' : 'god'}`
          }
          onPress={() => void handleBuy()}
          disabled={buying || isCurrentPlan || !purchasesAvailable()}
          icon={buying ? <ActivityIndicator color="#FFF" size="small" /> : undefined}
          full
        />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  hero: { alignItems: 'center', gap: 6, paddingVertical: 12 },
  heroIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  heroDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },
  currentPlan: { alignItems: 'center', gap: 2 },
  currentLabel: { fontSize: 12, fontWeight: '600' },
  currentValue: { fontSize: 20, fontWeight: '800' },
  currentExpiry: { fontSize: 12 },
  tierRow: { flexDirection: 'row', gap: 10 },
  tierCard: { flex: 1, padding: 14, borderRadius: 18, borderWidth: 2, alignItems: 'center', gap: 6 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioFill: { width: 12, height: 12, borderRadius: 6 },
  tierName: { fontSize: 18, fontWeight: '800' },
  tierTagline: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  priceSection: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' },
  priceBig: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  pricePeriod: { fontSize: 15, fontWeight: '600', marginLeft: 2 },
  monthlyEquiv: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  featuresTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  featureText: { fontSize: 14, fontWeight: '500' },
  footer: { paddingTop: 8 },
});
