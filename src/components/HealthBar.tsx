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
  const glowAnim  = useRef(new Animated.Value(0)).current;
  const glowLoop  = useRef<Animated.CompositeAnimation | null>(null);

  // Smooth bar width
  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: health,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [health]);

  // Glow pulse when fully healed (≥ 100)
  useEffect(() => {
    glowLoop.current?.stop();
    if (health >= 100) {
      glowAnim.setValue(0);
      glowLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 700, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 700, useNativeDriver: false }),
        ])
      );
      glowLoop.current.start();
    } else {
      glowAnim.setValue(0);
    }
    return () => glowLoop.current?.stop();
  }, [health]);

  const color = barColor ?? '#9BBC0F';
  const hp    = Math.round(health);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>HP</Text>

      <View style={styles.track}>
        {/* Main fill bar */}
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

        {/* White shimmer overlay — only visible when full */}
        <Animated.View
          style={[
            styles.glowOverlay,
            { opacity: glowAnim },
          ]}
        />

        {/* Pixel notches */}
        {Array.from({ length: 9 }).map((_, i) => (
          <View key={i} style={[styles.notch, { left: `${(i + 1) * 10}%` }]} />
        ))}
      </View>

      <Text style={[styles.hpNum, { color }]}>{hp}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '90%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  glowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.45)',
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
  hpNum: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    width: 36,
    textAlign: 'right',
  },
});
