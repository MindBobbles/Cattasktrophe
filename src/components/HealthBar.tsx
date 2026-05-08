import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { CatState } from '../types';
import { GB } from '../constants/colors';

interface Props {
  health: number;   // 0–100
  catState: CatState;
  barColor?: string;
}

export default function HealthBar({ health, catState, barColor }: Props) {
  const widthAnim = useRef(new Animated.Value(health)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: health,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [health]);

  const color = barColor ?? '#9BBC0F';

  const hearts =
    catState === 'happy'     ? '♥ ♥ ♥' :
    catState === 'sad'       ? '♥ ♥ ♡' :
    catState === 'depressed' ? '♥ ♡ ♡' :
    catState === 'cocaine'   ? '♥ ♥ ♥' :
    catState === 'hospital'  ? '✚ ♡ ♡' : '💀';

  return (
    <View style={styles.container}>
      <Text style={styles.label}>HP</Text>

      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: color,
              width: widthAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
        {/* pixel notches */}
        {Array.from({ length: 9 }).map((_, i) => (
          <View key={i} style={[styles.notch, { left: `${(i + 1) * 10}%` }]} />
        ))}
      </View>

      <Text style={[styles.hearts, { color: color }]}>{hearts}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  label: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: GB.light,
    fontWeight: 'bold',
    width: 24,
  },
  track: {
    flex: 1,
    height: 16,
    backgroundColor: GB.darkest,
    borderWidth: 2,
    borderColor: GB.dark,
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 1,
  },
  notch: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: GB.darkest,
    opacity: 0.5,
  },
  hearts: {
    fontFamily: 'monospace',
    fontSize: 13,
    width: 52,
    textAlign: 'right',
  },
});
