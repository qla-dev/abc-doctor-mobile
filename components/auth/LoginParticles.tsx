import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const particles = [
  { left: '9%', top: '18%', size: 4, color: '#4DA3FF', x: 24, y: -54, duration: 7600, delay: 0 },
  { left: '24%', top: '34%', size: 3, color: '#FFFFFF', x: -18, y: -42, duration: 9200, delay: 1300 },
  { left: '42%', top: '12%', size: 6, color: '#1677FF', x: 30, y: -68, duration: 10400, delay: 600 },
  { left: '61%', top: '29%', size: 3, color: '#8CC8FF', x: -22, y: -48, duration: 8200, delay: 2200 },
  { left: '78%', top: '16%', size: 5, color: '#FFFFFF', x: 18, y: -58, duration: 9600, delay: 900 },
  { left: '90%', top: '38%', size: 4, color: '#2E8BFF', x: -28, y: -64, duration: 11200, delay: 2800 },
  { left: '14%', top: '48%', size: 5, color: '#1677FF', x: 20, y: -58, duration: 9800, delay: 1700 },
  { left: '35%', top: '55%', size: 3, color: '#FFFFFF', x: -16, y: -46, duration: 8600, delay: 3200 },
  { left: '68%', top: '49%', size: 4, color: '#6DB7FF', x: 26, y: -62, duration: 10600, delay: 400 },
  { left: '85%', top: '58%', size: 3, color: '#2E8BFF', x: -20, y: -52, duration: 9000, delay: 2400 },
] as const;

export function LoginParticles() {
  const valuesRef = useRef<Animated.Value[]>([]);
  while (valuesRef.current.length < particles.length) {
    valuesRef.current.push(new Animated.Value(0));
  }
  if (valuesRef.current.length > particles.length) {
    valuesRef.current.splice(particles.length);
  }
  const values = valuesRef.current;

  useEffect(() => {
    const animations = values.map((value, index) => Animated.loop(Animated.sequence([
      Animated.delay(particles[index].delay),
      Animated.timing(value, {
        toValue: 1,
        duration: particles[index].duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])));
    animations.forEach(animation => animation.start());
    return () => animations.forEach(animation => animation.stop());
  }, [values]);

  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {particles.map((particle, index) => {
      const progress = values[index];
      return <Animated.View
        key={`${particle.left}-${particle.top}`}
        style={{
          position: 'absolute',
          left: particle.left,
          top: particle.top,
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          backgroundColor: particle.color,
          shadowColor: particle.color,
          shadowOpacity: .48,
          shadowRadius: 7,
          opacity: progress.interpolate({
            inputRange: [0, .15, .72, 1],
            outputRange: [0, .32, .22, 0],
          }),
          transform: [
            { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.x] }) },
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, particle.y] }) },
            { scale: progress.interpolate({ inputRange: [0, .5, 1], outputRange: [.7, 1, .8] }) },
          ],
        }}
      />;
    })}
  </View>;
}
