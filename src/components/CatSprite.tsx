import React, { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { CatState } from '../types';
import { SPRITE_PALETTE, CAT_COLOR_THEMES } from '../constants/colors';
import { SPRITES } from '../constants/sprites';

const PIXEL = 10;

const ANIM_SPEED: Record<CatState, number> = {
  happy:     900,
  sad:       1100,
  depressed: 1600,
  cocaine:   250,
  hospital:  1800,
  deathbed:  2500,
};

const BOUNCE: Record<CatState, number> = {
  happy:     4,
  sad:       2,
  depressed: 1,
  cocaine:   6,
  hospital:  0,
  deathbed:  0,
};

interface Props {
  catState: CatState;
  catColor?: string;
}

export default function CatSprite({ catState, catColor = 'classic' }: Props) {
  const [frameIdx, setFrameIdx] = useState(0);
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim  = useRef(new Animated.Value(0)).current;
  const loopRef    = useRef<Animated.CompositeAnimation | null>(null);

  const frames = SPRITES[catState];
  const speed  = ANIM_SPEED[catState];
  const bounce = BOUNCE[catState];

  // Build palette — override body colours with selected theme
  const theme = CAT_COLOR_THEMES[catColor] ?? CAT_COLOR_THEMES.classic;
  const palette: Record<number, string> = {
    ...SPRITE_PALETTE,
    1: theme.body,
    2: theme.accent,
    3: theme.dark,
    6: theme.blush,
    7: theme.ear,
  };

  // Frame flip
  useEffect(() => {
    setFrameIdx(0);
    const id = setInterval(() => setFrameIdx(f => (f + 1) % frames.length), speed);
    return () => clearInterval(id);
  }, [catState, speed, frames.length]);

  // Bounce / shake animation
  useEffect(() => {
    loopRef.current?.stop();
    bounceAnim.setValue(0);
    shakeAnim.setValue(0);

    if (catState === 'cocaine') {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: -6, duration: 55, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue:  6, duration: 55, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue:  0, duration: 55, useNativeDriver: true }),
        ])
      );
    } else if (bounce > 0) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: -bounce, duration: speed / 2, useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 0,       duration: speed / 2, useNativeDriver: true }),
        ])
      );
    }

    loopRef.current?.start();
    return () => loopRef.current?.stop();
  }, [catState, bounce, speed]);

  const grid = frames[frameIdx];

  return (
    <Animated.View style={{ transform: [{ translateY: bounceAnim }, { translateX: shakeAnim }] }}>
      {grid.map((row, rowIdx) => (
        <View key={rowIdx} style={{ flexDirection: 'row' }}>
          {row.map((code, colIdx) => (
            <View
              key={colIdx}
              style={{
                width: PIXEL,
                height: PIXEL,
                backgroundColor: palette[code] ?? 'transparent',
              }}
            />
          ))}
        </View>
      ))}
    </Animated.View>
  );
}
