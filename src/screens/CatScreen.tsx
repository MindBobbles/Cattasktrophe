import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CatSprite from '../components/CatSprite';
import HealthBar from '../components/HealthBar';
import { CatState } from '../types';
import {
  GB, STATE_SCREEN_BG, STATE_LABEL_COLOR, getCatEvolution,
} from '../constants/colors';
import { playMeow, playClick, startBGM, stopBGM } from '../utils/sound';

// ─── Constants ────────────────────────────────────────────────────────────────

const MEOW_LINES = [
  'Meow!', 'Mrrrow~', 'Purr...', 'Mew!',
  'Nyaa~', '...meow', 'Prrrr ♥', '*blinks slowly*',
];

const STATUS: Record<CatState, { title: string; sub: string }> = {
  happy:     { title: 'PURRING ♥',       sub: 'All tasks done! Keep it up.' },
  sad:       { title: 'SAD...',           sub: 'Your cat misses being fed. Do your tasks.' },
  depressed: { title: 'DEPRESSED',        sub: 'Seriously. Get off the couch. Do something.' },
  cocaine:   { title: 'CATNIP CRAZE!!',  sub: 'Your cat is absolutely ZOOMING right now.' },
  hospital:  { title: 'IN HOSPITAL',     sub: 'Your neglect put them here. Fix it.' },
  deathbed:  { title: '💀 FLATLINE',     sub: 'Your cat is dead. You did this. Buy a revive.' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatClock(d: Date): string {
  const h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  const mm = m.toString().padStart(2, '0');
  return `${hh}:${mm} ${ampm}`;
}

function formatDate(d: Date): string {
  const days   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const months = ['JAN','FEB','MAR','APR','MAY','JUN',
                  'JUL','AUG','SEP','OCT','NOV','DEC'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

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
  catName: string;
  coins: number;
  completedToday: number;
  totalTasks: number;
  catAlive: boolean;
  hasRevivalTasks: boolean;
  revivalProgress: number;
  catColor: string;
  catXP: number;
  catLevel: number;
  catPersonality: string;
  pendingEvent: RandomEventDisplay | null;
  onStartRevival: () => void;
  onGoToTasks: () => void;
  onGoToMarket: () => void;
  onEventDismissed: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CatScreen({
  catState, catHealth, catName, coins,
  completedToday, totalTasks, catAlive,
  hasRevivalTasks, revivalProgress,
  catColor, catXP, catLevel, catPersonality,
  pendingEvent,
  onStartRevival, onGoToTasks, onGoToMarket, onEventDismissed,
}: Props) {

  const [now, setNow] = useState(new Date());
  const [meowLine, setMeowLine] = useState('');
  const [showBubble, setShowBubble] = useState(false);
  const [happyActivity, setHappyActivity] = useState<string | null>(null);

  const flashAnim  = useRef(new Animated.Value(1)).current;
  const shakeAnim  = useRef(new Animated.Value(0)).current;
  const bubbleAnim = useRef(new Animated.Value(0)).current;
  const eventAnim  = useRef(new Animated.Value(0)).current;
  const flashLoop  = useRef<Animated.CompositeAnimation | null>(null);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Live clock ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  // ── Background music ────────────────────────────────────────────────────────
  useEffect(() => {
    startBGM();
    return () => stopBGM();
  }, []);

  // ── Hospital / deathbed flash ───────────────────────────────────────────────
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
    Animated.spring(eventAnim, {
      toValue: 1, useNativeDriver: true, tension: 80, friction: 8,
    }).start();

    // Dog attack: shake the cat
    if (pendingEvent.type === 'dog_attack') {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue:  12, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue:  -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue:   8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue:   0, duration: 60, useNativeDriver: true }),
      ]).start();
    }

    const t = setTimeout(() => {
      Animated.timing(eventAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        onEventDismissed();
      });
    }, 4500);
    return () => clearTimeout(t);
  }, [pendingEvent]);

  // ── Happy activity badge (display-only) ─────────────────────────────────────
  useEffect(() => {
    if (catState !== 'happy') {
      setHappyActivity(null);
      return;
    }
    // Show passed-in activity type as a badge if it's a happy activity
    const happyTypes = ['cowboy_hat', 'poop', 'dancing_shy', 'dancing_confident'];
    if (pendingEvent && happyTypes.includes(pendingEvent.type)) {
      setHappyActivity(pendingEvent.emoji);
      const isTimid = ['lazy', 'grumpy', 'sweet'].includes(catPersonality);
      if (activityTimer.current) clearTimeout(activityTimer.current);
      activityTimer.current = setTimeout(
        () => setHappyActivity(null),
        isTimid ? 3500 : 9000
      );
    }
    return () => { if (activityTimer.current) clearTimeout(activityTimer.current); };
  }, [pendingEvent, catState]);

  // ── Cat tap → meow ──────────────────────────────────────────────────────────
  const handleCatTap = useCallback(() => {
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    playMeow();
    const line = MEOW_LINES[Math.floor(Math.random() * MEOW_LINES.length)];
    setMeowLine(line);
    setShowBubble(true);
    bubbleAnim.setValue(0);
    Animated.spring(bubbleAnim, {
      toValue: 1, useNativeDriver: true, tension: 140, friction: 7,
    }).start();
    bubbleTimer.current = setTimeout(() => {
      Animated.timing(bubbleAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(
        () => setShowBubble(false)
      );
    }, 2500);
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const screenBg    = STATE_SCREEN_BG[catState]  ?? GB.light;
  const labelColor  = STATE_LABEL_COLOR[catState] ?? GB.darkest;
  const { title, sub } = STATUS[catState];
  const { emoji: evoEmoji, stage } = getCatEvolution(catLevel);
  const xpProgress = (catXP % 50) / 50;

  const healthBarColor =
    catState === 'happy'    ? GB.light   :
    catState === 'sad'      ? GB.medium  :
    catState === 'depressed'? '#6A8060'  :
    catState === 'cocaine'  ? '#C8D820'  :
    catState === 'hospital' ? '#608060'  : '#404040';

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* ── Random Event Banner ── */}
      {pendingEvent && (
        <Animated.View
          style={[
            styles.eventBanner,
            {
              backgroundColor: pendingEvent.color,
              transform: [{
                translateY: eventAnim.interpolate({
                  inputRange: [0, 1], outputRange: [-90, 0],
                }),
              }],
              opacity: eventAnim,
            },
          ]}
        >
          <Text style={styles.eventEmoji}>{pendingEvent.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.eventTitle}>{pendingEvent.title}</Text>
            <Text style={styles.eventMsg}>{pendingEvent.message}</Text>
          </View>
        </Animated.View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>

        {/* ── Top bar: title / clock / coins ── */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.title}>CAT-TASK-TROPHE</Text>
            <Text style={styles.clock}>{formatClock(now)}  {formatDate(now)}</Text>
          </View>
          <View style={styles.coinBadge}>
            <Text style={styles.coinText}>🪙 {coins}</Text>
          </View>
        </View>

        {/* ── Gameboy bezel ── */}
        <View style={styles.bezel}>
          <Animated.View style={[styles.screen, { backgroundColor: screenBg, opacity: flashAnim }]}>

            {/* Speech bubble */}
            {showBubble && (
              <Animated.View
                style={[
                  styles.speechBubble,
                  { transform: [{ scale: bubbleAnim }], opacity: bubbleAnim },
                ]}
              >
                <Text style={styles.speechText}>{meowLine}</Text>
              </Animated.View>
            )}

            {/* Happy activity badge */}
            {happyActivity && (
              <View style={styles.activityBadge}>
                <Text style={styles.activityText}>{happyActivity}</Text>
              </View>
            )}

            {/* Cat sprite — tappable, shakes on dog attack */}
            <Animated.View
              style={[styles.spriteArea, { transform: [{ translateX: shakeAnim }] }]}
            >
              <TouchableOpacity onPress={handleCatTap} activeOpacity={0.85}>
                <CatSprite catState={catState} catColor={catColor} />
              </TouchableOpacity>
            </Animated.View>

            <Text style={[styles.statusTitle, { color: labelColor }]}>{title}</Text>
          </Animated.View>

          <View style={styles.bezelBottom}>
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>

        {/* ── Identity row: name + level badge ── */}
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

        {/* ── Status sub-text ── */}
        <Text style={[
          styles.subStatus,
          (catState === 'hospital' || catState === 'deathbed') && styles.subDanger,
        ]}>
          {sub}
        </Text>

        {/* ── Today's progress ── */}
        {totalTasks > 0 && catAlive && (
          <Text style={styles.progress}>{completedToday} / {totalTasks} tasks done today</Text>
        )}

        {/* ── Tap hint ── */}
        <Text style={styles.tapHint}>tap the cat to interact ♥</Text>

        {/* ── Dead cat actions ── */}
        {!catAlive && (
          <View style={styles.emergencyBox}>
            <Text style={styles.emergencyTitle}>💀  YOUR CAT IS DEAD  💀</Text>
            <Text style={styles.emergencyBody}>
              You ignored them for too long.{'\n'}
              Buy a Revive Potion (120🪙) or a New Cat (200🪙) in the Market.
            </Text>
            <TouchableOpacity
              style={styles.marketBtn}
              onPress={() => { playClick(); onGoToMarket(); }}
            >
              <Text style={styles.marketBtnText}>GO TO MARKET →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Hospital / depressed revival section ── */}
        {catAlive && (catState === 'hospital' || catState === 'depressed') && (
          <View style={styles.revivalBox}>
            <Text style={styles.revivalTitle}>⚠  EMERGENCY TASKS</Text>
            <Text style={styles.revivalBody}>
              Complete revival tasks to stabilise {catName}.
            </Text>
            {!hasRevivalTasks ? (
              <TouchableOpacity
                style={styles.revivalBtn}
                onPress={() => { playClick(); onStartRevival(); }}
              >
                <Text style={styles.revivalBtnText}>START REVIVAL</Text>
              </TouchableOpacity>
            ) : (
              <>
                <Text style={styles.revivalProgress}>Revival: {revivalProgress}/5 done</Text>
                <TouchableOpacity
                  style={styles.goTasksBtn}
                  onPress={() => { playClick(); onGoToTasks(); }}
                >
                  <Text style={styles.goTasksBtnText}>GO TO TASKS →</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* ── Add tasks nudge ── */}
        {catAlive && totalTasks === 0 && (
          <TouchableOpacity
            style={styles.goTasksBtn}
            onPress={() => { playClick(); onGoToTasks(); }}
          >
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

  // Event banner — slides from top
  eventBanner: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 2, borderBottomColor: '#660000',
  },
  eventEmoji: { fontSize: 28 },
  eventTitle: {
    fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold',
    color: '#FFD0D0', letterSpacing: 1,
  },
  eventMsg: { fontFamily: 'monospace', fontSize: 11, color: '#FFB0B0', lineHeight: 16 },

  scroll: { alignItems: 'center', paddingBottom: 32, paddingTop: 12, gap: 12 },

  // Top bar
  topBar: {
    width: '90%', flexDirection: 'row',
    alignItems: 'flex-start', justifyContent: 'space-between',
  },
  title: {
    fontFamily: 'monospace', fontSize: 14, fontWeight: 'bold',
    color: GB.light, letterSpacing: 2,
  },
  clock: {
    fontFamily: 'monospace', fontSize: 10, color: GB.dark, letterSpacing: 0.5, marginTop: 2,
  },
  coinBadge: {
    backgroundColor: '#1a2e0a', borderWidth: 1,
    borderColor: GB.dark, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  coinText: { fontFamily: 'monospace', fontSize: 13, color: GB.medium },

  // Gameboy bezel
  bezel: {
    backgroundColor: '#1a2e0a', borderRadius: 12, padding: 10,
    borderWidth: 4, borderColor: GB.dark, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 6, elevation: 8,
  },
  screen: {
    width: 240, height: 260, borderRadius: 4, alignItems: 'center',
    justifyContent: 'center', overflow: 'hidden',
    borderWidth: 2, borderColor: GB.darkest,
  },
  spriteArea: { alignItems: 'center', justifyContent: 'center' },

  // Speech bubble
  speechBubble: {
    position: 'absolute', top: 8, right: 8, zIndex: 10,
    backgroundColor: '#FFFFF0', borderRadius: 10,
    borderWidth: 2, borderColor: GB.darkest,
    paddingHorizontal: 10, paddingVertical: 6,
    maxWidth: 110,
  },
  speechText: {
    fontFamily: 'monospace', fontSize: 12, fontWeight: 'bold',
    color: GB.darkest, textAlign: 'center',
  },

  // Activity badge (cowboy hat / poop / dance)
  activityBadge: {
    position: 'absolute', top: 8, left: 8, zIndex: 10,
    backgroundColor: 'rgba(15,56,15,0.75)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  activityText: { fontFamily: 'monospace', fontSize: 14 },

  statusTitle: {
    fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold',
    marginTop: 8, letterSpacing: 1,
  },
  bezelBottom: { flexDirection: 'row', gap: 6, marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GB.dark },

  // Identity
  identityRow: {
    width: '90%', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
  },
  catName: {
    fontFamily: 'monospace', fontSize: 16, fontWeight: 'bold',
    color: GB.medium, letterSpacing: 1,
  },
  levelBadge: {
    backgroundColor: '#0a200a', borderWidth: 1, borderColor: GB.dark,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  levelText: { fontFamily: 'monospace', fontSize: 11, color: GB.light },

  // XP bar
  xpBarBg: {
    width: '90%', height: 14, backgroundColor: '#0a200a',
    borderWidth: 1, borderColor: GB.dark, borderRadius: 3, overflow: 'hidden',
    justifyContent: 'center',
  },
  xpBarFill: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    backgroundColor: GB.dark, borderRadius: 2,
  },
  xpLabel: {
    fontFamily: 'monospace', fontSize: 9, color: GB.medium,
    textAlign: 'center', letterSpacing: 0.5,
  },

  // Status
  subStatus: {
    fontFamily: 'monospace', fontSize: 12, color: GB.medium,
    textAlign: 'center', letterSpacing: 0.3, paddingHorizontal: 20,
  },
  subDanger: { color: '#CC6666' },
  progress: {
    fontFamily: 'monospace', fontSize: 12, color: GB.dark, letterSpacing: 0.3,
  },
  tapHint: {
    fontFamily: 'monospace', fontSize: 10, color: GB.dark, letterSpacing: 0.5,
  },

  // Emergency
  emergencyBox: {
    width: '90%', backgroundColor: '#1a0000', borderWidth: 2,
    borderColor: '#CC0000', borderRadius: 6, padding: 16,
    alignItems: 'center', gap: 10,
  },
  emergencyTitle: {
    fontFamily: 'monospace', fontSize: 14, fontWeight: 'bold',
    color: '#FF4444', letterSpacing: 2, textAlign: 'center',
  },
  emergencyBody: {
    fontFamily: 'monospace', fontSize: 12, color: '#AA6666',
    textAlign: 'center', lineHeight: 18,
  },
  marketBtn: {
    backgroundColor: '#4A0000', borderWidth: 2, borderColor: '#CC0000',
    borderRadius: 4, paddingHorizontal: 24, paddingVertical: 10,
  },
  marketBtnText: {
    fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold',
    color: '#FF6666', letterSpacing: 2,
  },

  // Revival
  revivalBox: {
    width: '90%', backgroundColor: '#1a0a0a', borderWidth: 2,
    borderColor: '#4A0A0A', borderRadius: 6, padding: 16,
    alignItems: 'center', gap: 10,
  },
  revivalTitle: {
    fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold',
    color: '#CC4444', letterSpacing: 2,
  },
  revivalBody: {
    fontFamily: 'monospace', fontSize: 12, color: '#AA8888',
    textAlign: 'center', lineHeight: 18,
  },
  revivalBtn: {
    backgroundColor: '#4A0A0A', borderWidth: 2, borderColor: '#CC4444',
    borderRadius: 4, paddingHorizontal: 24, paddingVertical: 10,
  },
  revivalBtnText: {
    fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold',
    color: '#FF6666', letterSpacing: 2,
  },
  revivalProgress: { fontFamily: 'monospace', fontSize: 13, color: '#CC4444' },
  goTasksBtn: {
    borderWidth: 2, borderColor: GB.dark, borderRadius: 4,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  goTasksBtnText: {
    fontFamily: 'monospace', fontSize: 13, color: GB.medium, letterSpacing: 1,
  },
});
