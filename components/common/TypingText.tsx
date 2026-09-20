import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleProp, Text, TextStyle } from 'react-native';

/** Nothing types for longer than this, however long the answer is. */
const MAX_DURATION = 4000;

/**
 * Types its text out as it arrives, the way Lena's chat does.
 *
 * Reduce Motion turns it off outright and prints the whole line. An animation that cannot be
 * skipped is a wait, and someone who has asked the system to stop animating things has said they
 * do not want to wait for text to arrive.
 */
export function TypingText({ text, style, speed = 22, startDelay = 250, onDone }: {
  text: string;
  style?: StyleProp<TextStyle>;
  /** Milliseconds between reveals. */
  speed?: number;
  startDelay?: number;
  /** Fired once the whole line is on screen — including when Reduce Motion skipped the typing. */
  onDone?: () => void;
}) {
  const [shown, setShown] = useState('');
  const [instant, setInstant] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Held in a ref because callers pass a fresh arrow on every render, and a changing callback in
  // the deps below would restart the typing from the first character each time.
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; });

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(on => { if (alive) setInstant(on); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setInstant);

    return () => { alive = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];

    if (instant) {
      setShown(text);
      done.current?.();

      return;
    }

    setShown('');
    // A short line goes a character at a tick. A long answer would take a minute at that pace, so
    // past a certain length the reveal widens instead of slowing the reader down: the whole thing
    // is on screen within MAX_DURATION either way, and the screen never repaints faster than a
    // frame.
    const tick = Math.max(speed, 16);
    const ticks = Math.min(text.length, Math.ceil(MAX_DURATION / tick));
    const chunk = Math.ceil(text.length / Math.max(ticks, 1));

    // One timer per reveal rather than an interval: an interval that outlives the text it was
    // typing keeps writing into a component that has moved on.
    for (let i = 1; i <= ticks; i++) {
      const upto = Math.min(text.length, i * chunk);
      timers.current.push(setTimeout(() => setShown(text.slice(0, upto)), startDelay + i * tick));
    }
    timers.current.push(setTimeout(() => done.current?.(), startDelay + ticks * tick + 60));

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [text, instant, speed, startDelay]);

  return (
    // The full line is what screen readers get; the animation is decoration over it.
    <Text style={style} accessibilityLabel={text}>{shown}</Text>
  );
}
