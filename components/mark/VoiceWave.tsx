import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withTiming, type SharedValue,
} from 'react-native-reanimated';

/**
 * What the microphone is hearing, as it hears it.
 *
 * The point is not decoration: an open microphone that looks the same whether it is picking you
 * up or picking up nothing is how a recording gets made twice. The bars move with your voice, so
 * a dead mic — permission granted but routed somewhere else, a phone face down on a desk — is
 * visible before you finish saying anything.
 *
 * Nothing here re-renders. The level arrives as a shared value, the history of it is a second
 * shared value, and each bar reads its own slot on the UI thread: eleven frames a second through
 * React would be eleven renders of the conversation behind the bar.
 */

/** Enough to read as a waveform, few enough to stay a row rather than a chart. */
const BARS = 28;
const MIN_HEIGHT = 3;
const MAX_HEIGHT = 22;

export function VoiceWave({ level, color }: {
  /** 0..1, from the recorder's own metering. */
  level: SharedValue<number>;
  color: string;
}) {
  const history = useSharedValue<number[]>(new Array(BARS).fill(0));

  useEffect(() => {
    // One shift per tick, newest on the right: the row scrolls the way it was recorded.
    const id = setInterval(() => {
      history.value = [...history.value.slice(1), level.value];
    }, 90);

    return () => clearInterval(id);
  }, [history, level]);

  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: MAX_HEIGHT }}>
      {Array.from({ length: BARS }, (_, index) => (
        <Bar key={index} history={history} index={index} color={color} />
      ))}
    </View>
  );
}

function Bar({ history, index, color }: {
  history: SharedValue<number[]>;
  index: number;
  color: string;
}) {
  const style = useAnimatedStyle(() => ({
    // Just longer than the tick, so each bar glides into its next height instead of stepping.
    height: withTiming(MIN_HEIGHT + (history.value[index] ?? 0) * (MAX_HEIGHT - MIN_HEIGHT), {
      duration: 110,
    }),
  }));

  return (
    <Animated.View
      style={[{ flex: 1, minWidth: 2, borderRadius: 2, backgroundColor: color }, style]}
    />
  );
}
