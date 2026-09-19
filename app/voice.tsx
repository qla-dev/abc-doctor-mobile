import { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing, cancelAnimation, interpolate, useAnimatedStyle,
  useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Mic, MicOff, X } from 'lucide-react-native';
import { darkColors } from '@/theme/colors';
import { useLanguage } from '@/context/LanguageContext';
import { playClickSound } from '@/lib/sound';

const c = darkColors;

/** One breath of the orb. Slow enough to read as listening, not as a loading spinner. */
const BREATH_MS = 2200;
/** The halo trails the core so the two never peak together, which would read as a single flash. */
const HALO_MS = 2600;

export default function VoiceScreen() {
  const { skill, patient } = useLocalSearchParams<{ skill?: string; patient?: string }>();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [muted, setMuted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const breath = useSharedValue(0);
  const halo = useSharedValue(0);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => { if (active) setReduceMotion(enabled); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    // Reduce-motion keeps the orb, loses the animation: the shape carries the meaning, the
    // movement only carries the liveness.
    if (reduceMotion || muted) {
      cancelAnimation(breath);
      cancelAnimation(halo);
      breath.value = withTiming(0, { duration: 200 });
      halo.value = withTiming(0, { duration: 200 });
      return;
    }
    breath.value = withRepeat(withTiming(1, { duration: BREATH_MS, easing: Easing.inOut(Easing.ease) }), -1, true);
    halo.value = withRepeat(withTiming(1, { duration: HALO_MS, easing: Easing.out(Easing.ease) }), -1, false);
  }, [reduceMotion, muted, breath, halo]);

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(breath.value, [0, 1], [1, 1.12]) }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(halo.value, [0, 1], [1, 1.9]) }],
    opacity: interpolate(halo.value, [0, 0.55, 1], [0.32, 0.12, 0]),
  }));

  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(breath.value, [0, 1], [1, 0.9]) }],
    opacity: interpolate(breath.value, [0, 1], [0.85, 0.55]),
  }));

  const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
    close: {
      position: 'absolute', top: insets.top + 8, right: 16,
      width: 38, height: 38, borderRadius: 19,
      alignItems: 'center', justifyContent: 'center', backgroundColor: c.input,
    },
    orbWrap: { width: 260, height: 260, alignItems: 'center', justifyContent: 'center' },
    halo: { position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: c.blue },
    core: { width: 170, height: 170, borderRadius: 85, backgroundColor: c.blue, alignItems: 'center', justifyContent: 'center' },
    inner: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#FFFFFF' },
    caption: { color: c.text, fontSize: 19, fontWeight: '700', marginTop: 28, textAlign: 'center' },
    subcaption: { color: c.muted, fontSize: 13.5, lineHeight: 19, marginTop: 7, textAlign: 'center', paddingHorizontal: 40 },
    controls: { position: 'absolute', bottom: insets.bottom + 44, flexDirection: 'row', gap: 22 },
    control: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
    hangUp: { backgroundColor: c.red },
  });

  const title = patient ?? (skill ? String(skill) : t('ai.title'));

  return (
    <View style={styles.screen}>
      <Pressable
        onPress={() => { void playClickSound(); router.back(); }}
        style={styles.close}
        accessibilityRole="button"
        accessibilityLabel={t('common.cancel')}
      >
        <X size={19} color={c.text} />
      </Pressable>

      <View style={styles.orbWrap} accessibilityRole="image" accessibilityLabel={t('ai.thinking')}>
        <Animated.View style={[styles.halo, haloStyle]} pointerEvents="none" />
        <Animated.View style={[styles.core, coreStyle]}>
          <Animated.View style={[styles.inner, innerStyle]} />
        </Animated.View>
      </View>

      <Text style={styles.caption}>{title}</Text>
      <Text style={styles.subcaption}>
        {muted ? t('common.retry') : t('ai.thinking')}
      </Text>

      <View style={styles.controls}>
        <Pressable
          onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMuted((value) => !value); }}
          accessibilityRole="button"
          accessibilityLabel={t('simulator.voiceCall')}
          style={({ pressed }) => [styles.control, { backgroundColor: c.input, opacity: pressed ? 0.6 : 1 }]}
        >
          {muted ? <MicOff size={23} color={c.red} /> : <Mic size={23} color={c.text} />}
        </Pressable>
        <Pressable
          onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); router.back(); }}
          accessibilityRole="button"
          accessibilityLabel={t('common.done')}
          style={({ pressed }) => [styles.control, styles.hangUp, { opacity: pressed ? 0.6 : 1 }]}
        >
          <X size={25} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}
