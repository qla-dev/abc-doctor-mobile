import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeProvider';

export function FlashcardFlipCard({ front, back, hint, flipped, onFlip, hintLabel }: {
  front: string; back: string; hint?: string; flipped: boolean; onFlip: () => void; hintLabel: string;
}) {
  const { colors } = useTheme();
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withTiming(flipped ? 180 : 0, { duration: 420 });
  }, [flipped, rotation]);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${rotation.value}deg` }],
    // Hiding the face outright rather than relying on backfaceVisibility, which Android ignores.
    opacity: interpolate(rotation.value, [0, 89, 90, 180], [1, 1, 0, 0]),
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${rotation.value + 180}deg` }],
    opacity: interpolate(rotation.value, [0, 89, 90, 180], [0, 0, 1, 1]),
  }));

  const styles = StyleSheet.create({
    wrap: { minHeight: 300 },
    face: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.card, borderRadius: 24,
      borderWidth: StyleSheet.hairlineWidth, borderColor: colors.separator,
      alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14,
    },
    prompt: { color: colors.text, fontSize: 21, fontWeight: '700', textAlign: 'center', lineHeight: 29 },
    answer: { color: colors.text, fontSize: 17, textAlign: 'center', lineHeight: 25 },
    hint: { color: colors.muted, fontSize: 13, textAlign: 'center', fontStyle: 'italic' },
    tag: { color: colors.blue, fontSize: 12, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  });

  return (
    <Pressable
      onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onFlip(); }}
      style={styles.wrap}
    >
      <Animated.View style={[styles.face, frontStyle]}>
        <Text style={styles.prompt}>{front}</Text>
        {hint ? <Text style={styles.hint}>{hintLabel}: {hint}</Text> : null}
      </Animated.View>
      <Animated.View style={[styles.face, backStyle]}>
        <View><Text style={styles.tag}>A</Text></View>
        <Text style={styles.answer}>{back}</Text>
      </Animated.View>
    </Pressable>
  );
}
