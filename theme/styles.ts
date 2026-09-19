import { Platform, StyleSheet } from 'react-native';
import { ThemeColors } from './colors';

export const ANDROID_HEADER_CONTENT_GAP = 16;

export const createGlobalStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 14 },
  headerScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: Platform.OS === 'android' ? ANDROID_HEADER_CONTENT_GAP : undefined,
    gap: 14,
  },
  title: { color: c.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.9 },
  subtitle: { color: c.muted, fontSize: 13, lineHeight: 18 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: c.separator },
  row: { flexDirection: 'row', alignItems: 'center' },
  sectionLabel: {
    color: c.muted, fontSize: 12, lineHeight: 16, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.55, marginLeft: 5, marginBottom: 7,
  },
});
