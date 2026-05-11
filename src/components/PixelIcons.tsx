/**
 * PixelIcons — GBA/SNES-style pixel art icon components.
 *
 * On web: renders as a SINGLE DOM node using the CSS box-shadow pixel trick
 *   (1 element + N box-shadow values) — fast even for large sprites.
 * On native: falls back to View grid.
 *
 * Cellsize controls scale: 2 = small (inline), 3 = medium (cards), 4 = large.
 */

import React, { memo, useMemo } from 'react';
import { Platform, View } from 'react-native';

// ── Box-shadow pixel renderer (web only) ──────────────────────────────────────
function buildBoxShadow(
  grid: number[][],
  colors: Record<number, string>,
  cellSize: number,
): string {
  const parts: string[] = [];
  for (let ri = 0; ri < grid.length; ri++) {
    const row = grid[ri];
    for (let ci = 0; ci < row.length; ci++) {
      const color = colors[row[ci]];
      if (!color || color === 'transparent') continue;
      parts.push(`${ci * cellSize}px ${ri * cellSize}px 0px ${cellSize - 1}px ${color}`);
    }
  }
  return parts.join(', ');
}

// ── Shared renderer ────────────────────────────────────────────────────────────
export const PixelGrid = memo(function PixelGrid({
  grid,
  colors,
  cellSize,
}: {
  grid: number[][];
  colors: Record<number, string>;
  cellSize: number;
}) {
  const cols = grid[0]?.length ?? 0;
  const rows = grid.length;
  const W    = cols * cellSize;
  const H    = rows * cellSize;

  // ── Web: single-node box-shadow approach ──────────────────────────────────
  if (Platform.OS === 'web') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const shadow = useMemo(
      () => buildBoxShadow(grid, colors, cellSize),
      [grid, colors, cellSize],
    );
    return (
      <View style={{ width: W, height: H, overflow: 'visible' }}>
        {/* 1×1 element whose box-shadow paints every pixel */}
        <View
          style={{
            width:    1,
            height:   1,
            position: 'absolute',
            top:      0,
            left:     0,
            // @ts-ignore — boxShadow is valid on RN Web
            boxShadow: shadow,
          }}
        />
      </View>
    );
  }

  // ── Native: View grid fallback ─────────────────────────────────────────────
  return (
    <View style={{ alignSelf: 'flex-start' }}>
      {grid.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row' }}>
          {row.map((cell, ci) => (
            <View
              key={ci}
              style={{
                width:           cellSize,
                height:          cellSize,
                backgroundColor: colors[cell] ?? 'transparent',
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// COIN  8×8
// 0=transparent  1=dark-gold  2=gold  3=shine
// ─────────────────────────────────────────────────────────────────────────────
const COIN_GRID = [
  [0,0,1,1,1,1,0,0],
  [0,1,2,2,2,2,1,0],
  [1,2,3,2,2,2,2,1],
  [1,2,3,2,2,2,2,1],
  [1,2,2,2,2,2,2,1],
  [1,2,2,2,2,3,2,1],
  [0,1,2,2,2,2,1,0],
  [0,0,1,1,1,1,0,0],
];
const COIN_C = { 0:'transparent', 1:'#7A5800', 2:'#FFD700', 3:'#FFFACD' };

export function PixelCoin({ size = 3 }: { size?: number }) {
  return <PixelGrid grid={COIN_GRID} colors={COIN_C} cellSize={size} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// HEART  8×8
// 0=transparent  1=dark-red  2=red
// ─────────────────────────────────────────────────────────────────────────────
const HEART_GRID = [
  [0,1,1,0,0,1,1,0],
  [1,2,2,1,1,2,2,1],
  [1,2,2,2,2,2,2,1],
  [1,2,2,2,2,2,2,1],
  [0,1,2,2,2,2,1,0],
  [0,0,1,2,2,1,0,0],
  [0,0,0,1,1,0,0,0],
  [0,0,0,0,0,0,0,0],
];
const HEART_C = { 0:'transparent', 1:'#880000', 2:'#FF2244' };

export function PixelHeart({ size = 3 }: { size?: number }) {
  return <PixelGrid grid={HEART_GRID} colors={HEART_C} cellSize={size} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// BOWL / HUNGER  8×8
// 0=transparent  1=dark-bowl  2=bowl  3=kibble
// ─────────────────────────────────────────────────────────────────────────────
const BOWL_GRID = [
  [0,0,0,0,0,0,0,0],
  [0,1,1,1,1,1,1,0],
  [1,2,2,2,2,2,2,1],
  [1,2,3,3,3,3,2,1],
  [1,2,2,3,3,2,2,1],
  [0,1,2,2,2,2,1,0],
  [0,0,1,1,1,1,0,0],
  [0,0,0,0,0,0,0,0],
];
const BOWL_C = { 0:'transparent', 1:'#2a1a00', 2:'#6B3A00', 3:'#FF9922' };

export function PixelBowl({ size = 3 }: { size?: number }) {
  return <PixelGrid grid={BOWL_GRID} colors={BOWL_C} cellSize={size} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// FISH / SNACK  10×8
// 0=transparent  1=dark-orange  2=orange  3=eye  4=belly
// ─────────────────────────────────────────────────────────────────────────────
const FISH_GRID = [
  [0,0,0,1,1,0,0,0,1,0],
  [0,1,1,2,2,1,0,1,2,1],
  [1,2,2,2,2,2,1,2,2,0],
  [1,2,2,3,2,2,2,2,1,0],
  [1,2,4,4,2,2,2,2,1,0],
  [1,2,2,2,2,2,1,2,2,0],
  [0,1,1,2,2,1,0,1,2,1],
  [0,0,0,1,1,0,0,0,1,0],
];
const FISH_C = { 0:'transparent', 1:'#884400', 2:'#FF8800', 3:'#111111', 4:'#FFCC66' };

export function PixelFish({ size = 3 }: { size?: number }) {
  return <PixelGrid grid={FISH_GRID} colors={FISH_C} cellSize={size} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUSHI / MEAL  10×8
// 0=transparent  1=outline  2=rice  3=nori  4=salmon
// ─────────────────────────────────────────────────────────────────────────────
const SUSHI_GRID = [
  [0,0,1,1,1,1,1,1,0,0],
  [0,1,2,2,2,2,2,2,1,0],
  [1,2,2,2,2,2,2,2,2,1],
  [1,2,2,3,3,3,3,2,2,1],
  [1,2,2,3,4,4,3,2,2,1],
  [1,2,2,3,3,3,3,2,2,1],
  [0,1,2,2,2,2,2,2,1,0],
  [0,0,1,1,1,1,1,1,0,0],
];
const SUSHI_C = { 0:'transparent', 1:'#333333', 2:'#EEEEBB', 3:'#1a1a1a', 4:'#FF6644' };

export function PixelSushi({ size = 3 }: { size?: number }) {
  return <PixelGrid grid={SUSHI_GRID} colors={SUSHI_C} cellSize={size} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// POTION / MEDICINE  8×10
// 0=transparent  1=outline  2=glass  3=liquid
// ─────────────────────────────────────────────────────────────────────────────
const POTION_GRID = [
  [0,0,1,1,1,0,0,0],
  [0,0,1,2,1,0,0,0],
  [0,1,1,1,1,1,0,0],
  [1,2,2,2,2,2,1,0],
  [1,2,3,3,3,2,1,0],
  [1,2,3,3,3,2,1,0],
  [1,2,3,3,3,2,1,0],
  [1,2,2,2,2,2,1,0],
  [0,1,2,2,2,1,0,0],
  [0,0,1,1,1,0,0,0],
];
const POTION_C = { 0:'transparent', 1:'#333333', 2:'#88CCEE', 3:'#FF44AA' };

export function PixelPotion({ size = 3 }: { size?: number }) {
  return <PixelGrid grid={POTION_GRID} colors={POTION_C} cellSize={size} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// LEAF / CATNIP  8×10
// 0=transparent  1=dark-green  2=green  3=shine
// ─────────────────────────────────────────────────────────────────────────────
const LEAF_GRID = [
  [0,0,0,1,0,0,0,0],
  [0,0,1,2,1,0,0,0],
  [0,1,2,2,2,1,0,0],
  [1,2,2,3,2,2,1,0],
  [0,1,2,2,2,2,1,0],
  [0,0,1,2,2,1,0,0],
  [0,0,0,1,2,1,0,0],
  [0,0,0,1,1,0,0,0],
  [0,0,0,1,0,0,0,0],
  [0,0,0,1,0,0,0,0],
];
const LEAF_C = { 0:'transparent', 1:'#1a5200', 2:'#44CC22', 3:'#88EE44' };

export function PixelLeaf({ size = 3 }: { size?: number }) {
  return <PixelGrid grid={LEAF_GRID} colors={LEAF_C} cellSize={size} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// CRYSTAL / REVIVE  8×10
// 0=transparent  1=dark-blue  2=crystal  3=facet
// ─────────────────────────────────────────────────────────────────────────────
const CRYSTAL_GRID = [
  [0,0,0,1,1,0,0,0],
  [0,0,1,2,2,1,0,0],
  [0,1,2,3,2,2,1,0],
  [1,2,2,2,2,2,2,1],
  [1,2,2,2,2,2,2,1],
  [1,2,2,2,2,2,2,1],
  [0,1,2,2,2,2,1,0],
  [0,0,1,2,2,1,0,0],
  [0,0,0,1,1,0,0,0],
  [0,0,0,0,0,0,0,0],
];
const CRYSTAL_C = { 0:'transparent', 1:'#224488', 2:'#4499FF', 3:'#AADDFF' };

export function PixelCrystal({ size = 3 }: { size?: number }) {
  return <PixelGrid grid={CRYSTAL_GRID} colors={CRYSTAL_C} cellSize={size} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// MUSIC NOTE  8×8  (BGM on)
// ─────────────────────────────────────────────────────────────────────────────
const NOTE_GRID = [
  [0,0,1,1,1,0,0,0],
  [0,0,1,0,1,0,0,0],
  [0,0,1,0,1,0,0,0],
  [0,0,1,0,0,0,0,0],
  [0,1,1,0,0,0,0,0],
  [1,1,1,0,0,0,0,0],
  [0,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
];

export function PixelNote({ size = 3, color = '#88CC44' }: { size?: number; color?: string }) {
  return <PixelGrid grid={NOTE_GRID} colors={{ 0:'transparent', 1:color }} cellSize={size} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTE + X CROSS  8×8  (BGM off)
// ─────────────────────────────────────────────────────────────────────────────
const NOTE_OFF_GRID = [
  [0,0,1,1,1,0,0,0],
  [0,0,1,0,1,0,0,2],
  [0,0,1,0,1,0,2,0],
  [0,0,1,0,0,2,0,0],
  [0,1,1,0,2,0,0,0],
  [1,1,1,2,0,0,0,0],
  [0,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
];

export function PixelNoteOff({ size = 3 }: { size?: number }) {
  return <PixelGrid grid={NOTE_OFF_GRID} colors={{ 0:'transparent', 1:'#556644', 2:'#CC2222' }} cellSize={size} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// SPEAKER  8×8  (SFX on)
// ─────────────────────────────────────────────────────────────────────────────
const SPEAKER_GRID = [
  [0,0,0,1,0,1,0,0],
  [0,0,1,1,0,0,1,0],
  [0,1,1,1,0,0,0,0],
  [1,1,1,1,0,0,0,0],
  [1,1,1,1,0,0,0,0],
  [0,1,1,1,0,0,0,0],
  [0,0,1,1,0,0,1,0],
  [0,0,0,1,0,1,0,0],
];

export function PixelSpeaker({ size = 3, color = '#88CC44' }: { size?: number; color?: string }) {
  return <PixelGrid grid={SPEAKER_GRID} colors={{ 0:'transparent', 1:color }} cellSize={size} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTE SPEAKER  8×8  (SFX off)
// ─────────────────────────────────────────────────────────────────────────────
const MUTE_GRID = [
  [0,0,0,1,0,0,0,0],
  [0,0,1,1,0,0,0,0],
  [0,1,1,1,0,0,0,0],
  [1,1,1,1,0,2,0,2],
  [1,1,1,1,0,0,2,0],
  [0,1,1,1,0,2,0,2],
  [0,0,1,1,0,0,0,0],
  [0,0,0,1,0,0,0,0],
];

export function PixelMute({ size = 3 }: { size?: number }) {
  return <PixelGrid grid={MUTE_GRID} colors={{ 0:'transparent', 1:'#556644', 2:'#CC2222' }} cellSize={size} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIORITY INDICATORS
// HIGH  = 4×6 red exclamation
// MED   = 6×3 yellow dash
// LOW   = 4×4 green square dot
// ─────────────────────────────────────────────────────────────────────────────
const HIGH_DOT = [[0,1,1,0],[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,1,1,0],[0,1,1,0]];
const MED_DOT  = [[0,0,0,0,0,0],[0,1,1,1,1,0],[0,1,1,1,1,0],[0,0,0,0,0,0]];
const LOW_DOT  = [[0,1,1,0],[1,1,1,1],[1,1,1,1],[0,1,1,0]];

export function PixelPriority({ level, size = 3 }: { level: 'high' | 'medium' | 'low'; size?: number }) {
  if (level === 'high')   return <PixelGrid grid={HIGH_DOT} colors={{ 0:'transparent', 1:'#DD2222' }} cellSize={size} />;
  if (level === 'medium') return <PixelGrid grid={MED_DOT}  colors={{ 0:'transparent', 1:'#C89800' }} cellSize={size} />;
  return                         <PixelGrid grid={LOW_DOT}  colors={{ 0:'transparent', 1:'#2A7230' }} cellSize={size} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// ITEM ICON MAP — maps market/food item IDs to pixel icons
// ─────────────────────────────────────────────────────────────────────────────
export function PixelItemIcon({ id, size = 3 }: { id: string; size?: number }) {
  switch (id) {
    case 'snack':    return <PixelFish    size={size} />;
    case 'meal':     return <PixelSushi   size={size} />;
    case 'medicine': return <PixelPotion  size={size} />;
    case 'catnip':   return <PixelLeaf    size={size} />;
    case 'revive':   return <PixelCrystal size={size} />;
    default:         return <PixelCoin    size={size} />;
  }
}
