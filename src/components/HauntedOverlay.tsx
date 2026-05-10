import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, Dimensions } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');

const HAUNTS = [
  'why did you leave me???',
  'i was hungry...',
  'so cold...',
  'you forgot me',
  'was i not enough?',
  'i miss you...',
  'come back... please',
  'my food bowl is empty 😿',
  'i waited for you',
  'why???',
  'i trusted you',
  'you never fed me...',
  'it\'s so dark here',
  'remember me?',
  'meow... meow...',
];

export default function HauntedOverlay() {
  // Ghost position
  const ghostX = useRef(new Animated.Value(SW * 0.1)).current;
  const ghostY = useRef(new Animated.Value(SH * 0.3)).current;
  const ghostOpacity = useRef(new Animated.Value(0.7)).current;

  // Message
  const [msgText, setMsgText] = useState('');
  const [msgPos, setMsgPos] = useState({ x: 40, y: 200 });
  const msgOpacity = useRef(new Animated.Value(0)).current;

  // ── Ghost floating path ──────────────────────────────────────────────────────
  useEffect(() => {
    const waypoints = [
      { x: SW * 0.6, y: SH * 0.15 },
      { x: SW * 0.1, y: SH * 0.5  },
      { x: SW * 0.7, y: SH * 0.65 },
      { x: SW * 0.2, y: SH * 0.2  },
      { x: SW * 0.5, y: SH * 0.8  },
    ];

    const sequence = waypoints.flatMap(({ x, y }) => [
      Animated.parallel([
        Animated.timing(ghostX, { toValue: x, duration: 3500, useNativeDriver: false }),
        Animated.timing(ghostY, { toValue: y, duration: 3500, useNativeDriver: false }),
      ]),
      // flicker
      Animated.sequence([
        Animated.timing(ghostOpacity, { toValue: 0.3, duration: 120, useNativeDriver: false }),
        Animated.timing(ghostOpacity, { toValue: 0.8, duration: 120, useNativeDriver: false }),
      ]),
    ]);

    const loop = Animated.loop(Animated.sequence(sequence));
    loop.start();
    return () => loop.stop();
  }, []);

  // ── Haunting messages ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const showNext = () => {
      if (cancelled) return;
      const msg = HAUNTS[Math.floor(Math.random() * HAUNTS.length)];
      const x = Math.random() * (SW - 180) + 10;
      const y = Math.random() * (SH - 200) + 80;
      setMsgText(msg);
      setMsgPos({ x, y });
      msgOpacity.setValue(0);

      Animated.sequence([
        Animated.timing(msgOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.delay(2200),
        Animated.timing(msgOpacity, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]).start(() => {
        if (!cancelled) setTimeout(showNext, 800 + Math.random() * 1500);
      });
    };

    const t = setTimeout(showNext, 500);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Eerie green tint */}
      <View style={styles.tint} />

      {/* Haunting message */}
      <Animated.Text
        style={[
          styles.hauntMsg,
          { left: msgPos.x, top: msgPos.y, opacity: msgOpacity },
        ]}
      >
        {msgText}
      </Animated.Text>

      {/* Ghost */}
      <Animated.Text
        style={[
          styles.ghost,
          { left: ghostX, top: ghostY, opacity: ghostOpacity },
        ]}
      >
        👻
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 20, 0, 0.35)',
  },
  ghost: {
    position: 'absolute',
    fontSize: 52,
  },
  hauntMsg: {
    position: 'absolute',
    fontFamily: 'monospace',
    fontSize: 13,
    fontStyle: 'italic',
    color: '#88FF88',
    maxWidth: 200,
    textShadowColor: '#003300',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
});
