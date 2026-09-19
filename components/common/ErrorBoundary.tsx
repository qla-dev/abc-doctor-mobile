import { Component, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { darkColors } from '@/theme/colors';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Catches render errors so a single broken screen does not take the whole app down to a red
 * box. Deliberately themeless: it has to render when providers are what failed, so it uses the
 * dark palette directly rather than reading context that may not exist.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Something broke on this screen</Text>
        <Text style={styles.body}>{error.message}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1, backgroundColor: darkColors.background,
    alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10,
  },
  title: { color: darkColors.text, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  body: { color: darkColors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
