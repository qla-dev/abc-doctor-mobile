import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Mic, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { AppButton } from '@/components/common/AppButton';
import { useStorePrices, usePurchaseState, useInvalidatePurchaseState, priceLabel } from '@/hooks/usePurchases';
import { buyVoice, VOICE_PRODUCTS, PurchaseCancelledError, purchasesAvailable } from '@/lib/purchases';
import { createGlobalStyles } from '@/theme/styles';

const BEST_VALUE_ID = 'abc.qla.dev.voice180';

export default function VoiceScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const prices = useStorePrices();
  const { data: state } = usePurchaseState();
  const invalidate = useInvalidatePurchaseState();
  const g = createGlobalStyles(colors);

  const [selected, setSelected] = useState(VOICE_PRODUCTS[0].productId);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState('');
  const product = VOICE_PRODUCTS.find(p => p.productId === selected)!;

  const handleBuy = async () => {
    setBuying(true);
    setError('');
    try {
      await buyVoice(selected);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      invalidate();
      router.back();
    } catch (e) {
      if (e instanceof PurchaseCancelledError) return;
      const msg = e instanceof Error ? e.message : 'Kupovina nije uspjela.';
      setError(msg);
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
        <View style={[s.heroIcon, { backgroundColor: colors.green + '18' }]}>
          <Mic size={28} color={colors.green} />
        </View>
        <Text style={[s.heroTitle, { color: colors.text }]}>Dopuna minuta</Text>
        <Text style={[s.heroDesc, { color: colors.muted }]}>
          Minute za glasovne razgovore sa AI doktorom u realnom vremenu.
        </Text>
        {state != null && (
          <Text style={[s.balance, { color: colors.secondaryText }]}>
            Trenutno stanje: <Text style={{ fontWeight: '800', color: colors.green }}>{state.voice_minutes}</Text> minuta
          </Text>
        )}
      </View>

      {VOICE_PRODUCTS.map((p) => {
        const active = selected === p.productId;
        const isBest = p.productId === BEST_VALUE_ID;
        return (
          <View key={p.productId}>
            {isBest && (
              <View style={[s.bestBadge, { backgroundColor: colors.green }]}>
                <Sparkles size={12} color="#FFF" />
                <Text style={s.bestBadgeText}>Najbolja vrijednost</Text>
              </View>
            )}
            <Pressable
              onPress={() => { void Haptics.selectionAsync(); setSelected(p.productId); }}
              style={[
                s.card,
                { backgroundColor: colors.card, borderColor: active ? colors.green : isBest ? colors.green + '40' : 'transparent' },
              ]}
            >
              <View style={[s.radio, { borderColor: active ? colors.green : colors.muted }]}>
                {active && <View style={[s.radioFill, { backgroundColor: colors.green }]} />}
              </View>
              <View style={s.cardBody}>
                <Text style={[s.cardTitle, { color: colors.text }]}>{p.minutes} minuta</Text>
                <Text style={[s.cardTag, { color: colors.muted }]}>jednokratno</Text>
              </View>
              <Text style={[s.cardPrice, { color: colors.text }]}>
                {priceLabel(prices.data, p.productId, p.listPrice)}
              </Text>
            </Pressable>
          </View>
        );
      })}

      <View style={s.footer}>
        {error ? <Text style={{ color: colors.red, fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}>{error}</Text> : null}
        {!purchasesAvailable() ? <Text style={{ color: colors.orange, fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}>Kupovina nije dostupna u ovom okruženju.</Text> : null}
        <AppButton
          label={buying ? 'Kupovina…' : `Kupi ${product.minutes} minuta · ${priceLabel(prices.data, selected, product.listPrice)}`}
          onPress={() => void handleBuy()}
          disabled={buying || !purchasesAvailable()}
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
  heroTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  heroDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },
  balance: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  bestBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: -8, marginLeft: 14, zIndex: 1 },
  bestBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, borderWidth: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioFill: { width: 12, height: 12, borderRadius: 6 },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardTag: { fontSize: 12, fontWeight: '600' },
  cardPrice: { fontSize: 17, fontWeight: '800' },
  footer: { paddingTop: 8 },
});
