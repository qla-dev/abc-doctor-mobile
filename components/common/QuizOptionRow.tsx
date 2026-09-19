import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Check, X } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';

export function QuizOptionRow({ letter, text, selected, revealed, correct, onPress }: {
  letter: string; text: string; selected: boolean; revealed: boolean; correct: boolean; onPress: () => void;
}) {
  const { colors, resolvedMode } = useTheme();

  // Once revealed, the correct answer is always marked — including when the student missed it,
  // which is the moment the marking actually teaches something.
  const state = revealed ? (correct ? 'correct' : selected ? 'wrong' : 'idle') : selected ? 'selected' : 'idle';
  const border = { idle: colors.separator, selected: colors.blue, correct: colors.green, wrong: colors.red }[state];
  const fill = {
    idle: colors.card,
    selected: colors.blue + (resolvedMode === 'dark' ? '22' : '14'),
    correct: colors.green + (resolvedMode === 'dark' ? '26' : '18'),
    wrong: colors.red + (resolvedMode === 'dark' ? '26' : '18'),
  }[state];

  const styles = StyleSheet.create({
    row: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 11, padding: 14,
      borderRadius: 15, borderWidth: 1.5, borderColor: border, backgroundColor: fill,
    },
    letter: {
      width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
      backgroundColor: state === 'idle' ? colors.input : border,
    },
    letterText: { fontSize: 12.5, fontWeight: '800', color: state === 'idle' ? colors.muted : '#FFFFFF' },
    text: { flex: 1, color: colors.text, fontSize: 14.5, lineHeight: 20 },
  });

  return (
    <Pressable
      disabled={revealed}
      onPress={() => { void Haptics.selectionAsync(); onPress(); }}
      style={({ pressed }) => [styles.row, { opacity: pressed ? .7 : 1 }]}
    >
      <View style={styles.letter}><Text style={styles.letterText}>{letter}</Text></View>
      <Text style={styles.text}>{text}</Text>
      {revealed && correct ? <Check size={18} color={colors.green} /> : null}
      {revealed && selected && !correct ? <X size={18} color={colors.red} /> : null}
    </Pressable>
  );
}
