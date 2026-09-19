import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { CalendarDays } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';

export function AppDateField({ label, value, onChange, mode = 'date', minimumDate, maximumDate }: {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time';
  minimumDate?: Date;
  maximumDate?: Date;
}) {
  const { colors, resolvedMode } = useTheme();
  // iOS renders the picker inline and keeps it open; Android puts it in a modal that closes on
  // pick. Tracking one flag for both means the Android dialog reopens on every re-render.
  const [showAndroid, setShowAndroid] = useState(false);

  const styles = StyleSheet.create({
    label: { marginLeft: 4, color: colors.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
    field: {
      minHeight: 49, borderRadius: 15, paddingHorizontal: 14,
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: colors.input,
      borderWidth: StyleSheet.hairlineWidth, borderColor: colors.separator,
    },
    value: { color: colors.text, fontSize: 15, flex: 1 },
  });

  const formatted = mode === 'time'
    ? value.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : value.toLocaleDateString();

  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      {Platform.OS === 'ios' ? (
        <View style={styles.field}>
          <CalendarDays size={17} color={colors.muted} />
          <DateTimePicker
            value={value}
            mode={mode}
            display="compact"
            themeVariant={resolvedMode}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(_, date) => { if (date) onChange(date); }}
          />
        </View>
      ) : (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => { void Haptics.selectionAsync(); setShowAndroid(true); }}
            style={({ pressed }) => [styles.field, { opacity: pressed ? 0.7 : 1 }]}
          >
            <CalendarDays size={17} color={colors.muted} />
            <Text style={styles.value}>{formatted}</Text>
          </Pressable>
          {showAndroid ? (
            <DateTimePicker
              value={value}
              mode={mode}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              onChange={(event, date) => {
                setShowAndroid(false);
                if (event.type === 'set' && date) onChange(date);
              }}
            />
          ) : null}
        </>
      )}
    </View>
  );
}
