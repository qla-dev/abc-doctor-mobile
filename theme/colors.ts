export type ThemeMode = 'system' | 'light' | 'dark';

// Palette shared with putni-nalozi and freightbook native. Blue is putni-nalozi's iOS system
// blue; dark's background is pure black so OLED panels switch those pixels off entirely.
export const lightColors = {
  background: '#F2F2F7', groupedBackground: '#EDEDF2', card: '#FFFFFF',
  text: '#1C1C1E', secondaryText: '#6C6C70', muted: '#8E8E93',
  separator: 'rgba(60,60,67,0.18)', input: '#F2F2F7', elevated: '#FFFFFF',
  blue: '#007AFF', green: '#34C759', red: '#FF3B30', orange: '#FF9500', yellow: '#B77900',
  indigo: '#5856D6', cyan: '#32ADE6', glass: 'rgba(248,248,252,0.68)',
  glassBorder: 'rgba(255,255,255,0.82)', hero: '#10192B', heroText: '#FFFFFF',
  heroSecondary: '#AAB3C2', shadow: '#000000',
};

export const darkColors: ThemeColors = {
  background: '#000000', groupedBackground: '#0B0B0D', card: '#1C1C1E',
  text: '#F5F5F7', secondaryText: '#C7C7CC', muted: '#8E8E93',
  separator: 'rgba(84,84,88,0.65)', input: '#2C2C2E', elevated: '#2C2C2E',
  blue: '#0A84FF', green: '#30D158', red: '#FF453A', orange: '#FF9F0A', yellow: '#FFD60A',
  indigo: '#5E5CE6', cyan: '#64D2FF', glass: 'rgba(28,28,30,0.68)',
  glassBorder: 'rgba(255,255,255,0.14)', hero: '#151F32', heroText: '#FFFFFF',
  heroSecondary: '#ABB5C5', shadow: '#000000',
};

export type ThemeColors = typeof lightColors;
