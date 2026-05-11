import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View, Dimensions } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');

const HAUNTS = [
  'why did you leave me???',
  'i was hungry...',
  'so cold...',
  'you forgot me',
  'was i not enough?',
  'i miss you...',
  'come back... please',
  'my food bowl is empty',
  'i waited for you',
  'why???',
  'i trusted you',
  'you never fed me...',
  "it's so dark here",
  'remember me?',
  'meow... meow...',
];

// ── Ghost Cat Pixel Sprite — 16×20, 5px/cell = 80×100 ────────────────────────
//  0 = transparent
//  1 = dark spectral outline  (#2a4a2a)
//  2 = pale spectral body     (#b8e8b0)
//  3 = dark eye               (#111111)
//  4 = eye shine              (#ffffff)
//  5 = whisker dots           (#6a8a6a)

const GHOST_COLORS: Record<number, string> = {
  0: 'transparent',
  1: '#2a4a2a',
  2: '#b8e8b0',
  3: '#111111',
  4: '#ffffff',
  5: '#6a8a6a',
};

// Rows 0-14 are identical across both frames (head + body)
const GHOST_HEAD: number[][] = [
  [0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0],   //  0 – ear tips
  [0,0,1,2,2,1,0,0,0,0,1,2,2,1,0,0],   //  1 – ears
  [0,1,2,2,2,2,1,0,0,1,2,2,2,2,1,0],   //  2 – ear base
  [0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0],   //  3 – head merges
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],   //  4 – full head
  [1,2,2,3,3,3,2,2,2,2,3,3,3,2,2,1],   //  5 – eye tops
  [1,2,2,3,4,3,2,2,2,2,3,4,3,2,2,1],   //  6 – eyes + highlights
  [1,2,2,3,3,3,2,2,2,2,3,3,3,2,2,1],   //  7 – eye bottoms
  [1,2,5,5,2,2,2,2,2,2,2,2,5,5,2,1],   //  8 – whisker dots
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],   //  9
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],   // 10
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],   // 11
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],   // 12
  [0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0],   // 13 – sides taper
  [0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0],   // 14 – ghost waist
];

// Frame 1 ghost bottom — bumps centred  (rows 15-19)
const GHOST_BOT1: number[][] = [
  [0,1,2,2,1,0,0,1,2,2,1,0,1,2,2,1],   // 15 – three bumps
  [0,0,1,2,0,0,0,0,1,1,0,0,0,1,2,0],   // 16
  [0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0],   // 17 – bump tips
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],   // 18
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],   // 19
];

// Frame 2 ghost bottom — bumps shift slightly (subtle wobble)
const GHOST_BOT2: number[][] = [
  [1,2,2,1,0,0,1,2,2,2,1,0,1,2,2,1],   // 15
  [0,1,2,0,0,0,0,1,2,1,0,0,0,1,2,0],   // 16
  [0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0],   // 17
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],   // 18
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],   // 19
];

const CELL = 5;
const GHOST_W = 16 * CELL;  // 80px
const GHOST_H = 20 * CELL;  // 100px

// Pre-build both frame box-shadows at module load time (web path)
function buildGhostShadow(grid: number[][]): string {
  const parts: string[] = [];
  for (let ri = 0; ri < grid.length; ri++) {
    for (let ci = 0; ci < grid[ri].length; ci++) {
      const color = GHOST_COLORS[grid[ri][ci]];
      if (!color || color === 'transparent') continue;
      parts.push(`${ci * CELL}px ${ri * CELL}px 0px ${CELL - 1}px ${color}`);
    }
  }
  return parts.join(', ');
}

const GHOST_GRID_0 = [...GHOST_HEAD, ...GHOST_BOT1];
const GHOST_GRID_1 = [...GHOST_HEAD, ...GHOST_BOT2];
const GHOST_SHADOW_0 = buildGhostShadow(GHOST_GRID_0);
const GHOST_SHADOW_1 = buildGhostShadow(GHOST_GRID_1);

const GhostCatSprite = memo(function GhostCatSprite({ frame }: { frame: 0 | 1 }) {
  // Web: single DOM node with box-shadow pixels
  if (Platform.OS === 'web') {
    const shadow = frame === 0 ? GHOST_SHADOW_0 : GHOST_SHADOW_1;
    return (
      <View style={{ width: GHOST_W, height: GHOST_H, overflow: 'visible' }}>
        <View
          style={{
            width: 1, height: 1,
            position: 'absolute', top: 0, left: 0,
            // @ts-ignore
            boxShadow: shadow,
          }}
        />
      </View>
    );
  }

  // Native: View grid fallback
  const grid = frame === 0 ? GHOST_GRID_0 : GHOST_GRID_1;
  return (
    <View style={{ alignSelf: 'flex-start' }}>
      {grid.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row' }}>
          {row.map((cell, ci) => (
            <View
              key={ci}
              style={{
                width:  CELL,
                height: CELL,
                backgroundColor: GHOST_COLORS[cell] ?? 'transparent',
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
});

// ─── HauntedOverlay ───────────────────────────────────────────────────────────

export default function HauntedOverlay() {
  // Ghost world-space position (non-native: drives `left`/`top`)
  const ghostX  = useRef(new Animated.Value(SW * 0.1)).current;
  const ghostY  = useRef(new Animated.Value(SH * 0.3)).current;
  const ghostOp = useRef(new Animated.Value(0.75)).current;

  // Bob offset (native: drives transform)
  const bobAnim = useRef(new Animated.Value(0)).current;

  // Sprite frame toggle
  const [frame, setFrame] = useState<0 | 1>(0);

  // Haunting message
  const [msgText, setMsgText]   = useState('');
  const [msgPos,  setMsgPos]    = useState({ x: 40, y: 200 });
  const msgOpacity = useRef(new Animated.Value(0)).current;

  // ── Sprite frame toggle at 400ms ──────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f === 0 ? 1 : 0)), 400);
    return () => clearInterval(id);
  }, []);

  // ── Ghost wanders around the screen ───────────────────────────────────────
  useEffect(() => {
    const waypoints = [
      { x: SW * 0.55, y: SH * 0.12 },
      { x: SW * 0.08, y: SH * 0.45 },
      { x: SW * 0.60, y: SH * 0.58 },
      { x: SW * 0.18, y: SH * 0.18 },
      { x: SW * 0.48, y: SH * 0.72 },
    ];

    const seq = waypoints.flatMap(({ x, y }) => [
      Animated.parallel([
        Animated.timing(ghostX, { toValue: x, duration: 3800, useNativeDriver: false }),
        Animated.timing(ghostY, { toValue: y, duration: 3800, useNativeDriver: false }),
      ]),
      Animated.sequence([
        Animated.timing(ghostOp, { toValue: 0.25, duration: 110, useNativeDriver: false }),
        Animated.timing(ghostOp, { toValue: 0.80, duration: 110, useNativeDriver: false }),
      ]),
    ]);

    const loop = Animated.loop(Animated.sequence(seq));
    loop.start();
    return () => loop.stop();
  }, []);

  // ── Gentle bob (native driver — transform) ────────────────────────────────
  useEffect(() => {
    const bob = Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, { toValue: -10, duration: 900, useNativeDriver: true }),
        Animated.timing(bobAnim, { toValue:  10, duration: 900, useNativeDriver: true }),
      ])
    );
    bob.start();
    return () => bob.stop();
  }, []);

  // ── Haunting messages ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const showNext = () => {
      if (cancelled) return;
      const msg = HAUNTS[Math.floor(Math.random() * HAUNTS.length)];
      const x = Math.random() * (SW - 200) + 10;
      const y = Math.random() * (SH - 200) + 80;
      setMsgText(msg);
      setMsgPos({ x, y });
      msgOpacity.setValue(0);

      Animated.sequence([
        Animated.timing(msgOpacity, { toValue: 1,   duration: 700,  useNativeDriver: true }),
        Animated.delay(2200),
        Animated.timing(msgOpacity, { toValue: 0,   duration: 700,  useNativeDriver: true }),
      ]).start(() => {
        if (!cancelled) setTimeout(showNext, 800 + Math.random() * 1500);
      });
    };

    const t = setTimeout(showNext, 600);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Eerie green-dark tint */}
      <View style={styles.tint} />

      {/* Floating ghost cat */}
      <Animated.View
        style={{
          position: 'absolute',
          left:    ghostX,
          top:     ghostY,
          opacity: ghostOp,
        }}
      >
        {/* Bob is a separate native-driver transform layer */}
        <Animated.View style={{ transform: [{ translateY: bobAnim }] }}>
          <GhostCatSprite frame={frame} />
        </Animated.View>
      </Animated.View>

      {/* Haunting message */}
      <Animated.Text
        style={[
          styles.hauntMsg,
          { left: msgPos.x, top: msgPos.y, opacity: msgOpacity },
        ]}
      >
        {msgText}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,20,0,0.32)',
  },
  hauntMsg: {
    position:   'absolute',
    fontFamily: 'monospace',
    fontSize:   13,
    fontStyle:  'italic',
    color:      '#88FF88',
    maxWidth:   200,
    textShadowColor:  '#003300',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
});
