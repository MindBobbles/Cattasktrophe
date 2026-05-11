import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, ScrollView, PanResponder, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CatSprite from '../components/CatSprite';
import HealthBar from '../components/HealthBar';
import { CatState, QueuedFood } from '../types';
import {
  GB, STATE_SCREEN_BG, STATE_LABEL_COLOR, getCatEvolution,
} from '../constants/colors';
import { playMeow, playClick, playEarnCoin } from '../utils/sound';
import {
  PixelGrid, PixelCoin, PixelBowl, PixelHeart, PixelItemIcon,
  PixelNote, PixelNoteOff, PixelSpeaker, PixelMute,
} from '../components/PixelIcons';

const { height: SH } = Dimensions.get('window');

// ─── Constants ────────────────────────────────────────────────────────────────

const MEOW_LINES = [
  'Meow!', 'Mrrrow~', 'Purr...', 'Mew!',
  'Nyaa~', '...meow', 'Prrrr ♥', '*blinks slowly*',
];

const STATUS: Record<CatState, { title: string; sub: string }> = {
  happy:     { title: 'PURRING ♥',      sub: 'Happy and fed! Keep the tasks going.' },
  sad:       { title: 'SAD...',          sub: 'Needs food. Check the plate below.' },
  depressed: { title: 'DEPRESSED',       sub: 'Low health AND hungry. Feed immediately.' },
  cocaine:   { title: 'CATNIP CRAZE!!', sub: 'Your cat is absolutely ZOOMING right now.' },
  hospital:  { title: 'IN HOSPITAL',    sub: 'Critical condition. Buy medicine in market.' },
  deathbed:  { title: '💀 FLATLINE',    sub: 'Your cat died. Buy a Revive Potion (50🪙).' },
};

// Pixel poop — 8×8 grid at 6px/cell
const POOP_SPRITE = [
  [0,0,1,1,1,0,0,0],
  [0,1,1,1,1,1,0,0],
  [0,1,1,1,1,1,0,0],
  [1,1,1,1,1,1,1,0],
  [1,1,1,1,1,1,1,0],
  [0,1,1,1,1,1,0,0],
  [0,0,1,1,1,0,0,0],
  [0,0,0,0,0,0,0,0],
];
const POOP_COLOR = '#6B3A2A';

// ── Evolution pixel overlays ─────────────────────────────────────────────────
// Worker Kitty hard hat — 10×5 grid at 8px/cell
const HARDHAT: number[][] = [
  [0,0,0,1,1,1,1,1,0,0],
  [0,0,1,1,1,1,1,1,1,0],
  [0,1,2,2,2,2,2,2,1,1],
  [1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1],
];
const HH_COLORS: Record<number, string> = { 0: 'transparent', 1: '#FFD700', 2: '#E08000' };

// Boss Kitty crown — 10×5 grid at 8px/cell
const CROWN: number[][] = [
  [1,0,0,1,0,0,1,0,0,1],
  [1,1,0,1,1,0,1,1,0,1],
  [1,1,3,1,4,3,1,4,1,1],
  [2,2,2,2,2,2,2,2,2,2],
  [2,2,2,2,2,2,2,2,2,2],
];
const CR_COLORS: Record<number, string> = { 0: 'transparent', 1: '#FFD700', 2: '#B8860B', 3: '#FF2244', 4: '#4488FF' };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RandomEventDisplay {
  type: string;
  emoji: string;
  title: string;
  message: string;
  color: string;
}

interface Props {
  catState: CatState;
  catHealth: number;
  catHunger: number;
  catName: string;
  coins: number;
  completedToday: number;
  totalTasks: number;
  catAlive: boolean;
  catColor: string;
  catXP: number;
  catLevel: number;
  catPersonality: string;
  pendingEvent: RandomEventDisplay | null;
  foodQueue: QueuedFood[];
  sfxEnabled: boolean;
  bgmEnabled: boolean;
  onGoToTasks: () => void;
  onGoToMarket: () => void;
  onEventDismissed: () => void;
  onFeedCat: (foodId: string) => void;
  onToggleSFX: () => void;
  onToggleBGM: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatClock(d: Date): string {
  const h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function formatDate(d: Date): string {
  const days   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

// ─── Draggable Food Item ──────────────────────────────────────────────────────

function DraggableFoodItem({ food, onFeed }: { food: QueuedFood; onFeed: (id: string) => void }) {
  const pan   = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      Animated.spring(scale, { toValue: 1.2, useNativeDriver: true }).start();
    },
    onPanResponderMove: Animated.event(
      [null, { dx: pan.x, dy: pan.y }],
      { useNativeDriver: false }
    ),
    onPanResponderRelease: (_, gesture) => {
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
      if (gesture.dy < -120) {
        playEarnCoin();
        Animated.parallel([
          Animated.timing(pan.y,  { toValue: -320, duration: 250, useNativeDriver: false }),
          Animated.timing(scale,  { toValue: 0,    duration: 250, useNativeDriver: true }),
        ]).start(() => {
          onFeed(food.id);
          pan.setValue({ x: 0, y: 0 });
          scale.setValue(1);
        });
      } else {
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      }
    },
  })).current;

  return (
    <Animated.View
      style={[foodStyles.plate, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }] }]}
      {...panResponder.panHandlers}
    >
      <View style={foodStyles.plateCircle}>
        <PixelItemIcon id={food.id} size={3} />
      </View>
      <Text style={foodStyles.foodName} numberOfLines={1}>{food.name}</Text>
      <View style={foodStyles.foodStatRow}>
        <Text style={foodStyles.foodStat}>+{food.hunger > 0 ? food.hunger : food.health}</Text>
        {food.hunger > 0 ? <PixelBowl size={2} /> : <PixelHeart size={2} />}
      </View>
    </Animated.View>
  );
}

const foodStyles = StyleSheet.create({
  plate: { alignItems: 'center', gap: 2, width: 72, zIndex: 10 },
  plateCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#1a3a1a', borderWidth: 3, borderColor: GB.dark, alignItems: 'center', justifyContent: 'center' },
  foodName: { fontFamily: 'monospace', fontSize: 9, color: GB.dark, textAlign: 'center', width: 70 },
  foodStatRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  foodStat: { fontFamily: 'monospace', fontSize: 9, color: GB.medium },
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function CatScreen({
  catState, catHealth, catHunger, catName, coins,
  completedToday, totalTasks, catAlive,
  catColor, catXP, catLevel, catPersonality,
  pendingEvent, foodQueue,
  sfxEnabled, bgmEnabled,
  onGoToTasks, onGoToMarket,
  onEventDismissed, onFeedCat,
  onToggleSFX, onToggleBGM,
}: Props) {

  const [now, setNow]             = useState(new Date());
  const [meowLine, setMeowLine]   = useState('');
  const [showBubble, setShowBubble] = useState(false);
  const [showPoop, setShowPoop]   = useState(false);
  const [showHat, setShowHat]     = useState(false);
  const [foodOffset, setFoodOffset] = useState(0);

  const flashAnim  = useRef(new Animated.Value(1)).current;
  const shakeAnim  = useRef(new Animated.Value(0)).current;
  const bubbleAnim = useRef(new Animated.Value(0)).current;
  const eventAnim  = useRef(new Animated.Value(0)).current;
  const flashLoop  = useRef<Animated.CompositeAnimation | null>(null);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Live clock ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  // ── Hospital/deathbed flash ─────────────────────────────────────────────────
  useEffect(() => {
    flashLoop.current?.stop();
    flashAnim.setValue(1);
    if (catState === 'hospital' || catState === 'deathbed') {
      flashLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(flashAnim, { toValue: 0.65, duration: 700, useNativeDriver: true }),
          Animated.timing(flashAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
        ])
      );
      flashLoop.current.start();
    }
    return () => flashLoop.current?.stop();
  }, [catState]);

  // ── Random event banner ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!pendingEvent) return;
    eventAnim.setValue(0);
    Animated.spring(eventAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start();

    if (pendingEvent.type === 'dog_attack') {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: -14, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue:  14, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue:  -8, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue:   8, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue:   0, duration: 55, useNativeDriver: true }),
      ]).start();
    }
    if (pendingEvent.type === 'cowboy_hat') {
      setShowHat(true);
      const isTimid = ['lazy', 'grumpy', 'sweet'].includes(catPersonality);
      setTimeout(() => setShowHat(false), isTimid ? 3500 : 9000);
    }
    if (pendingEvent.type === 'poop') {
      setShowPoop(true);
      setTimeout(() => setShowPoop(false), 7000);
    }

    const t = setTimeout(() => {
      Animated.timing(eventAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => onEventDismissed());
    }, 4500);
    return () => clearTimeout(t);
  }, [pendingEvent]);

  // ── Cat tap → meow ──────────────────────────────────────────────────────────
  const handleCatTap = useCallback(() => {
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    playMeow();
    setMeowLine(MEOW_LINES[Math.floor(Math.random() * MEOW_LINES.length)]);
    setShowBubble(true);
    bubbleAnim.setValue(0);
    Animated.spring(bubbleAnim, { toValue: 1, useNativeDriver: true, tension: 140, friction: 7 }).start();
    bubbleTimer.current = setTimeout(() => {
      Animated.timing(bubbleAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(
        () => setShowBubble(false)
      );
    }, 2500);
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const screenBg   = STATE_SCREEN_BG[catState]  ?? GB.light;
  const labelColor = STATE_LABEL_COLOR[catState] ?? GB.darkest;
  const { title, sub } = STATUS[catState];
  const { emoji: evoEmoji, stage, tier } = getCatEvolution(catLevel);
  const xpProgress = (catXP % 50) / 50;

  const healthBarColor =
    catState === 'happy'     ? GB.light   :
    catState === 'sad'       ? GB.medium  :
    catState === 'depressed' ? '#6A8060'  :
    catState === 'cocaine'   ? '#C8D820'  :
    catState === 'hospital'  ? '#608060'  : '#404040';

  const hungerPercent = Math.max(0, Math.min(100, catHunger));
  const hungerColor =
    hungerPercent >= 60 ? '#52C060' :
    hungerPercent >= 30 ? '#C0A030' : '#C04040';

  const visibleFood = foodQueue.slice(foodOffset, foodOffset + 3);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* ── Random Event Banner ── */}
      {pendingEvent && (
        <Animated.View style={[
          styles.eventBanner,
          {
            backgroundColor: pendingEvent.color,
            transform: [{ translateY: eventAnim.interpolate({ inputRange: [0, 1], outputRange: [-90, 0] }) }],
            opacity: eventAnim,
          },
        ]}>
          <Text style={styles.eventEmoji}>{pendingEvent.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.eventTitle}>{pendingEvent.title}</Text>
            <Text style={styles.eventMsg}>{pendingEvent.message}</Text>
          </View>
        </Animated.View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>

        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.title}>CAT-TASK-TROPHE</Text>
            <Text style={styles.clock}>{formatClock(now)}  {formatDate(now)}</Text>
          </View>
          {/* Coins + audio toggles */}
          <View style={styles.topRight}>
            <TouchableOpacity
              style={[styles.ctrlBtn, !bgmEnabled && styles.ctrlOff]}
              onPress={() => { playClick(); onToggleBGM(); }}
            >
              {bgmEnabled ? <PixelNote size={2} /> : <PixelNoteOff size={2} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ctrlBtn, !sfxEnabled && styles.ctrlOff]}
              onPress={() => { onToggleSFX(); }}
            >
              {sfxEnabled ? <PixelSpeaker size={2} /> : <PixelMute size={2} />}
            </TouchableOpacity>
            <View style={styles.coinBadge}>
              <PixelCoin size={2} />
              <Text style={styles.coinText}>{coins}</Text>
            </View>
          </View>
        </View>

        {/* ── Gameboy bezel ── */}
        <View style={styles.bezel}>
          <Animated.View style={[styles.screen, { backgroundColor: screenBg, opacity: flashAnim }]}>

            {/* Speech bubble */}
            {showBubble && (
              <Animated.View style={[styles.speechBubble, { transform: [{ scale: bubbleAnim }], opacity: bubbleAnim }]}>
                <Text style={styles.speechText}>{meowLine}</Text>
              </Animated.View>
            )}

            {/* Cowboy hat (random event) */}
            {showHat && (
              <View style={styles.hatOverlay}>
                <Text style={styles.hatEmoji}>🤠</Text>
              </View>
            )}

            {/* Evolution overlay — Worker Kitty hard hat */}
            {tier === 'worker' && !showHat && (
              <View style={styles.evoOverlay}>
                <PixelGrid grid={HARDHAT} colors={HH_COLORS} cellSize={7} />
              </View>
            )}

            {/* Evolution overlay — Boss Kitty crown */}
            {tier === 'boss' && !showHat && (
              <View style={styles.evoOverlay}>
                <PixelGrid grid={CROWN} colors={CR_COLORS} cellSize={7} />
              </View>
            )}

            {/* Cat sprite */}
            <Animated.View style={[styles.spriteArea, { transform: [{ translateX: shakeAnim }] }]}>
              <TouchableOpacity onPress={handleCatTap} activeOpacity={0.85}>
                <CatSprite catState={catState} catColor={catColor} />
              </TouchableOpacity>
            </Animated.View>

            {/* Poop */}
            {showPoop && (
              <View style={styles.poopArea}>
                {POOP_SPRITE.map((row, ri) => (
                  <View key={ri} style={{ flexDirection: 'row' }}>
                    {row.map((cell, ci) => (
                      <View key={ci} style={{ width: 6, height: 6, backgroundColor: cell === 1 ? POOP_COLOR : 'transparent' }} />
                    ))}
                  </View>
                ))}
              </View>
            )}

            <Text style={[styles.statusTitle, { color: labelColor }]}>{title}</Text>
          </Animated.View>

          <View style={styles.bezelBottom}>
            <View style={styles.dot} /><View style={styles.dot} /><View style={styles.dot} />
          </View>
        </View>

        {/* ── Identity row ── */}
        <View style={styles.identityRow}>
          <Text style={styles.catName}>{catName}</Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{evoEmoji} Lv.{catLevel} {stage}</Text>
          </View>
        </View>

        {/* ── XP bar ── */}
        <View style={styles.xpBarBg}>
          <View style={[styles.xpBarFill, { width: `${Math.round(xpProgress * 100)}%` }]} />
          <Text style={styles.xpLabel}>XP  {catXP % 50} / 50</Text>
        </View>

        {/* ── Health bar ── */}
        <HealthBar health={catHealth} catState={catState} barColor={healthBarColor} />

        {/* ── Hunger bar ── */}
        <View style={styles.statBarRow}>
          <View style={styles.statBarLabel}><PixelBowl size={2} /></View>
          <View style={styles.statBarTrack}>
            <View style={[styles.statBarFill, { width: `${hungerPercent}%`, backgroundColor: hungerColor }]} />
            {Array.from({ length: 9 }).map((_, i) => (
              <View key={i} style={[styles.statBarNotch, { left: `${(i + 1) * 10}%` }]} />
            ))}
          </View>
          <Text style={[styles.statBarVal, { color: hungerColor }]}>
            {hungerPercent < 30 ? '😿' : hungerPercent < 60 ? '😐' : '😺'}
          </Text>
        </View>

        {/* ── Status sub ── */}
        <Text style={[styles.subStatus, (catState === 'hospital' || catState === 'deathbed') && styles.subDanger]}>
          {sub}
        </Text>

        {totalTasks > 0 && catAlive && (
          <Text style={styles.progress}>{completedToday} / {totalTasks} tasks done today</Text>
        )}

        <Text style={styles.tapHint}>tap the cat to interact ♥</Text>

        {/* ── Food plate carousel ── */}
        {foodQueue.length > 0 && (
          <View style={styles.plateSection}>
            <Text style={styles.plateSectionTitle}>DRAG FOOD TO FEED CAT ↑</Text>
            <View style={styles.plateRow}>
              <TouchableOpacity
                style={styles.plateArrow}
                onPress={() => setFoodOffset(Math.max(0, foodOffset - 3))}
                disabled={foodOffset === 0}
              >
                <Text style={[styles.plateArrowText, foodOffset === 0 && { opacity: 0.2 }]}>‹</Text>
              </TouchableOpacity>
              <View style={styles.plateItems}>
                {visibleFood.map(food => (
                  <DraggableFoodItem key={food.id} food={food} onFeed={onFeedCat} />
                ))}
              </View>
              <TouchableOpacity
                style={styles.plateArrow}
                onPress={() => setFoodOffset(Math.min(foodQueue.length - 1, foodOffset + 3))}
                disabled={foodOffset + 3 >= foodQueue.length}
              >
                <Text style={[styles.plateArrowText, foodOffset + 3 >= foodQueue.length && { opacity: 0.2 }]}>›</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.plateCount}>{foodQueue.length} item{foodQueue.length !== 1 ? 's' : ''} on plate</Text>
          </View>
        )}

        {/* ── Dead cat ── */}
        {!catAlive && (
          <View style={styles.emergencyBox}>
            <Text style={styles.emergencyTitle}>💀  YOUR CAT IS DEAD  💀</Text>
            <Text style={styles.emergencyBody}>
              You let them starve and fall apart.{'\n'}
              Buy a Revive Potion (50🪙) in the Market.
            </Text>
            <TouchableOpacity style={styles.marketBtn} onPress={() => { playClick(); onGoToMarket(); }}>
              <Text style={styles.marketBtnText}>GO TO MARKET →</Text>
            </TouchableOpacity>
          </View>
        )}

        {catAlive && totalTasks === 0 && (
          <TouchableOpacity style={styles.goTasksBtn} onPress={() => { playClick(); onGoToTasks(); }}>
            <Text style={styles.goTasksBtnText}>ADD YOUR FIRST TASK →</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: GB.darkest },

  eventBanner: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 2, borderBottomColor: '#660000',
  },
  eventEmoji: { fontSize: 28 },
  eventTitle: { fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold', color: '#FFD0D0', letterSpacing: 1 },
  eventMsg: { fontFamily: 'monospace', fontSize: 11, color: '#FFB0B0', lineHeight: 16 },

  scroll: { alignItems: 'center', paddingBottom: 32, paddingTop: 12, gap: 12 },

  topBar: { width: '90%', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  title: { fontFamily: 'monospace', fontSize: 14, fontWeight: 'bold', color: GB.light, letterSpacing: 2 },
  clock: { fontFamily: 'monospace', fontSize: 10, color: GB.dark, letterSpacing: 0.5, marginTop: 2 },

  topRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ctrlBtn: {
    width: 30, height: 30, borderRadius: 4, borderWidth: 1, borderColor: GB.dark,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a200a',
  },
  ctrlOff: { borderColor: '#333', backgroundColor: '#060e06', opacity: 0.5 },
  ctrlBtnText: { fontSize: 13 },

  coinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#1a2e0a', borderWidth: 1, borderColor: GB.dark,
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  coinText: { fontFamily: 'monospace', fontSize: 13, color: GB.medium },

  bezel: {
    backgroundColor: '#1a2e0a', borderRadius: 12, padding: 10,
    borderWidth: 4, borderColor: GB.dark, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 6, elevation: 8,
  },
  screen: {
    width: 240, height: 270, borderRadius: 4, alignItems: 'center',
    justifyContent: 'center', overflow: 'hidden',
    borderWidth: 2, borderColor: GB.darkest,
  },
  spriteArea: { alignItems: 'center', justifyContent: 'center' },

  hatOverlay: { position: 'absolute', top: 10, alignSelf: 'center', zIndex: 20 },
  hatEmoji: { fontSize: 36 },

  // Evolution overlay — pixel art hat / crown sits above sprite
  evoOverlay: { position: 'absolute', top: 12, alignSelf: 'center', zIndex: 18 },

  poopArea: { position: 'absolute', bottom: 38, right: 12, zIndex: 15 },

  speechBubble: {
    position: 'absolute', top: 8, right: 8, zIndex: 10,
    backgroundColor: '#FFFFF0', borderRadius: 10,
    borderWidth: 2, borderColor: GB.darkest,
    paddingHorizontal: 10, paddingVertical: 6, maxWidth: 110,
  },
  speechText: { fontFamily: 'monospace', fontSize: 12, fontWeight: 'bold', color: GB.darkest, textAlign: 'center' },

  statusTitle: { fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold', marginTop: 8, letterSpacing: 1 },
  bezelBottom: { flexDirection: 'row', gap: 6, marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GB.dark },

  identityRow: { width: '90%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catName: { fontFamily: 'monospace', fontSize: 16, fontWeight: 'bold', color: GB.medium, letterSpacing: 1 },
  levelBadge: { backgroundColor: '#0a200a', borderWidth: 1, borderColor: GB.dark, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  levelText: { fontFamily: 'monospace', fontSize: 11, color: GB.light },

  xpBarBg: { width: '90%', height: 14, backgroundColor: '#0a200a', borderWidth: 1, borderColor: GB.dark, borderRadius: 3, overflow: 'hidden', justifyContent: 'center' },
  xpBarFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: GB.dark, borderRadius: 2 },
  xpLabel: { fontFamily: 'monospace', fontSize: 9, color: GB.medium, textAlign: 'center', letterSpacing: 0.5 },

  // Hunger bar (mirrors HealthBar layout)
  statBarRow: { width: '90%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 0 },
  statBarLabel: { width: 20, alignItems: 'center', justifyContent: 'center' },
  statBarTrack: { flex: 1, height: 16, backgroundColor: GB.darkest, borderWidth: 2, borderColor: GB.dark, borderRadius: 2, overflow: 'hidden', position: 'relative' },
  statBarFill: { position: 'absolute', top: 0, left: 0, bottom: 0, borderRadius: 1 },
  statBarNotch: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: GB.darkest, opacity: 0.5 },
  statBarVal: { fontFamily: 'monospace', fontSize: 14, width: 28, textAlign: 'right' },

  subStatus: { fontFamily: 'monospace', fontSize: 12, color: GB.medium, textAlign: 'center', letterSpacing: 0.3, paddingHorizontal: 20 },
  subDanger: { color: '#CC6666' },
  progress: { fontFamily: 'monospace', fontSize: 12, color: GB.dark, letterSpacing: 0.3 },
  tapHint: { fontFamily: 'monospace', fontSize: 10, color: GB.dark, letterSpacing: 0.5 },

  // Food plate
  plateSection: { width: '90%', alignItems: 'center', gap: 8, backgroundColor: '#0a1a0a', borderWidth: 2, borderColor: GB.dark, borderRadius: 8, padding: 12 },
  plateSectionTitle: { fontFamily: 'monospace', fontSize: 10, color: GB.dark, letterSpacing: 1 },
  plateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  plateItems: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', gap: 8 },
  plateArrow: { padding: 8 },
  plateArrowText: { fontFamily: 'monospace', fontSize: 20, color: GB.medium },
  plateCount: { fontFamily: 'monospace', fontSize: 9, color: GB.dark },

  // Dead
  emergencyBox: { width: '90%', backgroundColor: '#1a0000', borderWidth: 2, borderColor: '#CC0000', borderRadius: 6, padding: 16, alignItems: 'center', gap: 10 },
  emergencyTitle: { fontFamily: 'monospace', fontSize: 14, fontWeight: 'bold', color: '#FF4444', letterSpacing: 2, textAlign: 'center' },
  emergencyBody: { fontFamily: 'monospace', fontSize: 12, color: '#AA6666', textAlign: 'center', lineHeight: 18 },
  marketBtn: { backgroundColor: '#4A0000', borderWidth: 2, borderColor: '#CC0000', borderRadius: 4, paddingHorizontal: 24, paddingVertical: 10 },
  marketBtnText: { fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold', color: '#FF6666', letterSpacing: 2 },

  goTasksBtn: { borderWidth: 2, borderColor: GB.dark, borderRadius: 4, paddingHorizontal: 20, paddingVertical: 10 },
  goTasksBtnText: { fontFamily: 'monospace', fontSize: 13, color: GB.medium, letterSpacing: 1 },
});
