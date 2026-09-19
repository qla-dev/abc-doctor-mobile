import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export function AppField({ label, multiline, hideLabel = false, error, ...props }: TextInputProps & {
  label: string;
  hideLabel?: boolean;
  error?: string;
}) {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    label: { marginLeft: 4, color: colors.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
    input: {
      minHeight: multiline ? 92 : 49,
      textAlignVertical: multiline ? 'top' : 'center',
      borderRadius: 15,
      padding: 14,
      color: colors.text,
      backgroundColor: colors.input,
      borderWidth: StyleSheet.hairlineWidth,
      // The border is the only thing that moves on error: swapping the fill too makes a
      // corrected field keep looking wrong until it is re-rendered.
      borderColor: error ? colors.red : colors.separator,
      fontSize: 15,
    },
    error: { marginLeft: 4, color: colors.red, fontSize: 12, lineHeight: 16 },
  });
  return (
    <View style={{ gap: 6 }}>
      {hideLabel ? null : <Text style={styles.label}>{label}</Text>}
      <TextInput
        accessibilityLabel={label}
        {...props}
        multiline={multiline}
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}
