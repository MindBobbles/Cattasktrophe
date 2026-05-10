import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
  Animated, PanResponder, LayoutAnimation, UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Task, TaskPriority } from '../types';
import { GB } from '../constants/colors';
import { predictDifficulty, difficultyLabel } from '../utils/difficultyPredictor';
import { playClick } from '../utils/sound';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const DAYS   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

const PRIORITY: Record<TaskPriority, { border: string; bg: string; label: string; dot: string }> = {
  high:   { border: '#CC2222', bg: '#1a0808', label: 'HIGH', dot: '🔴' },
  medium: { border: '#B89000', bg: '#1a1500', label: 'MED',  dot: '🟡' },
  low:    { border: '#2A6230', bg: '#0a1a0a', label: 'LOW',  dot: '🟢' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekDays(anchor: Date): Date[] {
  const days: Date[] = [];
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - anchor.getDay()); // Sunday
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

function sameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();
}

// ─── Swipeable Task Card ─────────────────────────────────────────────────────

interface CardProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}

function SwipeableTaskCard({ task, onToggle, onDelete, disabled }: CardProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate     = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(1)).current;
  const scale      = useRef(new Animated.Value(1)).current;

  const priority = (task.priority ?? 'medium') as TaskPriority;
  const pc = PRIORITY[priority];

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled && !task.completed,
    onMoveShouldSetPanResponder: (_, g) => !disabled && !task.completed && Math.abs(g.dx) > 8,
    onPanResponderMove: (_, g) => {
      if (g.dx > 0) translateX.setValue(g.dx); // right swipe only
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx > 90) {
        // ── SHATTER off screen ──
        playClick();
        Animated.parallel([
          Animated.timing(translateX, { toValue: 600, duration: 280, useNativeDriver: true }),
          Animated.timing(rotate,     { toValue: 1,   duration: 280, useNativeDriver: true }),
          Animated.timing(opacity,    { toValue: 0,   duration: 220, useNativeDriver: true }),
          Animated.timing(scale,      { toValue: 0.8, duration: 280, useNativeDriver: true }),
        ]).start(() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          onToggle(task.id);
          translateX.setValue(0);
          rotate.setValue(0);
          opacity.setValue(1);
          scale.setValue(1);
        });
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 200, friction: 10 }).start();
      }
    },
  }), [task.id, task.completed, disabled]);

  const rotateInterp = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '18deg'] });

  if (task.completed) {
    return (
      <View style={[styles.card, styles.cardDone, { borderLeftColor: pc.border }]}>
        <Text style={styles.cardDoneText}>✓  {task.title}</Text>
        {task.reward > 0 && <Text style={styles.cardDoneReward}>+{task.reward}🪙</Text>}
      </View>
    );
  }

  return (
    <Animated.View
      style={{ transform: [{ translateX }, { rotate: rotateInterp }, { scale }], opacity }}
      {...panResponder.panHandlers}
    >
      <View style={[styles.card, { backgroundColor: pc.bg, borderLeftColor: pc.border }]}>
        {/* Priority badge */}
        <View style={[styles.priorityTag, { borderColor: pc.border }]}>
          <Text style={[styles.priorityTagText, { color: pc.border }]}>{pc.label}</Text>
        </View>

        {/* Task info */}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>{task.title}</Text>
          <View style={styles.cardMeta}>
            {task.scheduledTime ? <Text style={styles.cardTime}>⏰ {task.scheduledTime}</Text> : null}
            {task.isSpecial && <Text style={styles.cardSpecial}>★ SPECIAL</Text>}
            <Text style={styles.cardReward}>+{task.reward}🪙</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => onDelete(task.id)} style={styles.deleteBtn}>
            <Text style={styles.deleteTxt}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Swipe hint */}
      <Text style={styles.swipeHint}>← swipe to complete →</Text>
    </Animated.View>
  );
}

// ─── Revival Card ────────────────────────────────────────────────────────────

function RevivalCard({ task, onToggle }: { task: Task; onToggle: (id: string) => void }) {
  return (
    <TouchableOpacity
      style={[styles.card, styles.revivalCard]}
      onPress={() => onToggle(task.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.revivalCheckbox, task.completed && styles.revivalChecked]}>
        {task.completed && <Text style={styles.revivalTick}>✓</Text>}
      </View>
      <Text style={[styles.revivalTitle, task.completed && styles.revivalTitleDone]}>
        {task.title}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

interface Props {
  regularTasks: Task[];
  specialTasks: Task[];
  revivalTasks: Task[];
  completedToday: number;
  catHealth: number;
  catAlive: boolean;
  hasRevivalTasks: boolean;
  revivalProgress: number;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (title: string, time: string, isSpecial: boolean, coins: number) => void;
}

export default function TaskScreen({
  regularTasks, specialTasks, revivalTasks,
  completedToday, catHealth, catAlive,
  hasRevivalTasks, revivalProgress,
  onToggle, onDelete, onAdd,
}: Props) {

  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekAnchor, setWeekAnchor] = useState(today);
  const weekDays = useMemo(() => getWeekDays(weekAnchor), [weekAnchor]);

  // Add-task form state
  const [title, setTitle]         = useState('');
  const [time, setTime]           = useState('');
  const [isSpecial, setIsSpecial] = useState(false);
  const [priority, setPriority]   = useState<TaskPriority>('medium');

  const predictedCoins = useMemo(() => predictDifficulty(title), [title]);
  const diffLabel      = useMemo(() => difficultyLabel(predictedCoins), [predictedCoins]);

  function handleAdd() {
    const t = title.trim();
    if (!t) return;
    onAdd(t, time.trim(), isSpecial, predictedCoins);
    setTitle('');
    setTime('');
    setIsSpecial(false);
    setPriority('medium');
  }

  // Merge and sort all non-revival tasks by scheduled time
  const allTasks = [...regularTasks, ...specialTasks];
  const timed    = allTasks.filter(t => t.scheduledTime).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  const flexible = allTasks.filter(t => !t.scheduledTime);

  const total = regularTasks.length + specialTasks.length;
  const pct   = total === 0 ? 0 : Math.round((completedToday / total) * 100);

  function prevWeek() { const d = new Date(weekAnchor); d.setDate(d.getDate() - 7); setWeekAnchor(d); }
  function nextWeek() { const d = new Date(weekAnchor); d.setDate(d.getDate() + 7); setWeekAnchor(d); }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>DAILY TASKS</Text>
            <Text style={styles.headerSub}>{completedToday}/{total} · {pct}%</Text>
          </View>

          {/* Month strip */}
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            style={styles.monthStrip}
            contentContainerStyle={styles.monthStripContent}
          >
            {MONTHS.map((m, i) => {
              const isCurrent = i === today.getMonth();
              return (
                <TouchableOpacity key={m} style={styles.monthItem} onPress={() => {}}>
                  <Text style={[styles.monthText, isCurrent && styles.monthTextActive]}>{m}</Text>
                  {isCurrent && <View style={styles.monthDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Week strip */}
          <View style={styles.weekNav}>
            <TouchableOpacity onPress={prevWeek} style={styles.weekArrow}>
              <Text style={styles.weekArrowText}>‹</Text>
            </TouchableOpacity>
            <View style={styles.weekStrip}>
              {weekDays.map((d, i) => {
                const isToday  = sameDay(d, today);
                const isSelect = sameDay(d, selectedDate);
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.dayCell, isSelect && styles.dayCellSelected]}
                    onPress={() => setSelectedDate(d)}
                  >
                    <Text style={[styles.dayLabel, isSelect && styles.dayLabelSelected]}>
                      {DAYS[d.getDay()].slice(0, 2)}
                    </Text>
                    <Text style={[styles.dayNum, isSelect && styles.dayNumSelected, isToday && styles.dayNumToday]}>
                      {d.getDate()}
                    </Text>
                    {isToday && <View style={styles.todayDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity onPress={nextWeek} style={styles.weekArrow}>
              <Text style={styles.weekArrowText}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Task List ── */}
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">

          {/* Revival tasks */}
          {hasRevivalTasks && (
            <View style={styles.section}>
              <View style={[styles.sectionHeader, styles.sectionHeaderRevival]}>
                <Text style={styles.sectionLabelRevival}>✚ REVIVAL  ({revivalProgress}/{revivalTasks.length})</Text>
              </View>
              {revivalTasks.map(t => (
                <RevivalCard key={t.id} task={t} onToggle={onToggle} />
              ))}
            </View>
          )}

          {/* Timed tasks */}
          {timed.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>SCHEDULED</Text>
              </View>
              {timed.map(t => (
                <View key={t.id} style={styles.timedRow}>
                  <Text style={styles.timeMarker}>{t.scheduledTime}</Text>
                  <View style={{ flex: 1 }}>
                    <SwipeableTaskCard
                      task={t}
                      onToggle={onToggle}
                      onDelete={onDelete}
                      disabled={!catAlive}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Flexible tasks */}
          {flexible.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>FLEXIBLE</Text>
              </View>
              {flexible.map(t => (
                <SwipeableTaskCard
                  key={t.id}
                  task={t}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  disabled={!catAlive}
                />
              ))}
            </View>
          )}

          {allTasks.length === 0 && (
            <Text style={styles.empty}>No tasks yet. Add one below ↓</Text>
          )}

          {!catAlive && (
            <View style={styles.deadBanner}>
              <Text style={styles.deadBannerText}>Your cat is dead. Go to Market to revive them.</Text>
            </View>
          )}

        </ScrollView>

        {/* ── Add task form ── */}
        <View style={styles.addBox}>
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={title}
              onChangeText={setTitle}
              placeholder="New task..."
              placeholderTextColor={GB.dark}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
              maxLength={80}
            />
            <TextInput
              style={[styles.input, styles.timeInput]}
              value={time}
              onChangeText={setTime}
              placeholder="HH:MM"
              placeholderTextColor={GB.dark}
              maxLength={5}
              keyboardType="numeric"
            />
          </View>

          {/* Difficulty preview */}
          {title.trim().length > 0 && (
            <View style={styles.diffRow}>
              <Text style={styles.diffLabel}>{diffLabel}  ·  🪙 {predictedCoins} coins</Text>
            </View>
          )}

          {/* Priority + special + add */}
          <View style={styles.addActions}>
            {(['high', 'medium', 'low'] as TaskPriority[]).map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.priorityBtn, priority === p && { backgroundColor: PRIORITY[p].border + '44' }]}
                onPress={() => { playClick(); setPriority(p); }}
              >
                <Text style={[styles.priorityBtnText, { color: PRIORITY[p].border }]}>
                  {PRIORITY[p].dot} {PRIORITY[p].label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.specialToggle, isSpecial && styles.specialToggleOn]}
              onPress={() => { playClick(); setIsSpecial(v => !v); }}
            >
              <Text style={[styles.specialTxt, isSpecial && styles.specialTxtOn]}>★</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, !title.trim() && styles.addBtnDisabled]}
              onPress={handleAdd}
              disabled={!title.trim()}
            >
              <Text style={styles.addBtnText}>ADD</Text>
            </TouchableOpacity>
          </View>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: GB.darkest },

  header: {
    backgroundColor: '#0a1a0a',
    borderBottomWidth: 2,
    borderBottomColor: GB.dark,
    paddingBottom: 6,
  },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6,
  },
  headerTitle: {
    fontFamily: 'monospace', fontSize: 15, fontWeight: 'bold',
    color: GB.light, letterSpacing: 2,
  },
  headerSub: { fontFamily: 'monospace', fontSize: 11, color: GB.dark },

  // Month strip
  monthStrip: { maxHeight: 34 },
  monthStripContent: { paddingHorizontal: 10, gap: 2, alignItems: 'center' },
  monthItem: { paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' },
  monthText: { fontFamily: 'monospace', fontSize: 11, color: GB.dark, letterSpacing: 1 },
  monthTextActive: { color: GB.light, fontWeight: 'bold' },
  monthDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: GB.medium, marginTop: 2 },

  // Week strip
  weekNav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingTop: 4 },
  weekArrow: { padding: 6 },
  weekArrowText: { fontFamily: 'monospace', fontSize: 18, color: GB.dark },
  weekStrip: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  dayCell: { alignItems: 'center', paddingVertical: 4, paddingHorizontal: 4, borderRadius: 6, minWidth: 34 },
  dayCellSelected: { backgroundColor: GB.dark },
  dayLabel: { fontFamily: 'monospace', fontSize: 9, color: GB.dark, letterSpacing: 0.5 },
  dayLabelSelected: { color: GB.lightest },
  dayNum: { fontFamily: 'monospace', fontSize: 14, color: GB.medium, fontWeight: 'bold', marginTop: 2 },
  dayNumSelected: { color: GB.lightest },
  dayNumToday: { color: GB.light },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: GB.light, marginTop: 2 },

  // Sections
  section: { marginBottom: 4 },
  sectionHeader: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#061006',
    borderBottomWidth: 1, borderBottomColor: GB.dark,
  },
  sectionHeaderRevival: { backgroundColor: '#1a0505' },
  sectionLabel: { fontFamily: 'monospace', fontSize: 9, color: GB.dark, letterSpacing: 2 },
  sectionLabelRevival: { fontFamily: 'monospace', fontSize: 10, color: '#CC4444', letterSpacing: 1, fontWeight: 'bold' },

  // Timed row
  timedRow: { flexDirection: 'row', alignItems: 'flex-start', paddingLeft: 8 },
  timeMarker: {
    fontFamily: 'monospace', fontSize: 10, color: GB.dark,
    width: 42, paddingTop: 14, paddingRight: 4, textAlign: 'right',
  },

  // Task card
  card: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 8, marginVertical: 4,
    borderRadius: 5, borderLeftWidth: 4,
    paddingVertical: 10, paddingRight: 8, paddingLeft: 10,
    gap: 8,
    backgroundColor: '#0a1a0a',
    borderLeftColor: GB.dark,
  },
  cardDone: { opacity: 0.4, backgroundColor: '#0a0a0a' },
  cardDoneText: { flex: 1, fontFamily: 'monospace', fontSize: 12, color: GB.dark, textDecorationLine: 'line-through' },
  cardDoneReward: { fontFamily: 'monospace', fontSize: 10, color: GB.dark },

  priorityTag: {
    borderWidth: 1, borderRadius: 3,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  priorityTagText: { fontFamily: 'monospace', fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5 },

  cardBody: { flex: 1, gap: 4 },
  cardTitle: { fontFamily: 'monospace', fontSize: 13, color: GB.light, letterSpacing: 0.2 },
  cardMeta: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  cardTime: { fontFamily: 'monospace', fontSize: 10, color: GB.dark },
  cardSpecial: { fontFamily: 'monospace', fontSize: 9, color: '#90C8FF', borderWidth: 1, borderColor: '#90C8FF', paddingHorizontal: 3, borderRadius: 2 },
  cardReward: { fontFamily: 'monospace', fontSize: 10, color: GB.medium, fontWeight: 'bold' },
  cardActions: { alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { padding: 6 },
  deleteTxt: { fontFamily: 'monospace', fontSize: 13, color: GB.dark },

  swipeHint: { fontFamily: 'monospace', fontSize: 9, color: '#1a3a1a', textAlign: 'center', marginBottom: 2 },

  // Revival card
  revivalCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 8, marginVertical: 4,
    borderRadius: 5, borderLeftWidth: 4, borderLeftColor: '#CC4444',
    backgroundColor: '#1a0808', paddingVertical: 12, paddingHorizontal: 12,
  },
  revivalCheckbox: { width: 22, height: 22, borderWidth: 2, borderColor: '#CC4444', borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  revivalChecked: { backgroundColor: '#CC4444' },
  revivalTick: { color: '#fff', fontSize: 12, fontFamily: 'monospace' },
  revivalTitle: { flex: 1, fontFamily: 'monospace', fontSize: 13, color: '#FF9090', fontStyle: 'italic' },
  revivalTitleDone: { textDecorationLine: 'line-through', color: '#884444' },

  // Empty / dead
  empty: { fontFamily: 'monospace', fontSize: 12, color: GB.dark, textAlign: 'center', marginTop: 32 },
  deadBanner: { margin: 12, padding: 10, borderWidth: 1, borderColor: '#CC4444', borderRadius: 4, backgroundColor: '#1a0000' },
  deadBannerText: { fontFamily: 'monospace', fontSize: 11, color: '#FF6666', textAlign: 'center' },

  // Add form
  addBox: { borderTopWidth: 2, borderTopColor: GB.dark, backgroundColor: '#0a1a0a' },
  addRow: { flexDirection: 'row' },
  input: {
    fontFamily: 'monospace', fontSize: 13, color: GB.light,
    paddingHorizontal: 12, paddingVertical: 11,
    borderRightWidth: 1, borderRightColor: GB.dark,
  },
  timeInput: { width: 72, textAlign: 'center' },
  diffRow: { paddingHorizontal: 12, paddingVertical: 4, borderTopWidth: 1, borderTopColor: GB.dark, backgroundColor: '#061006' },
  diffLabel: { fontFamily: 'monospace', fontSize: 11, color: GB.medium },
  addActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: GB.dark, flexWrap: 'wrap' },
  priorityBtn: { paddingHorizontal: 8, paddingVertical: 9, borderRightWidth: 1, borderRightColor: GB.dark },
  priorityBtnText: { fontFamily: 'monospace', fontSize: 10, fontWeight: 'bold' },
  specialToggle: { paddingHorizontal: 10, paddingVertical: 9, borderRightWidth: 1, borderRightColor: GB.dark },
  specialToggleOn: { backgroundColor: '#0a1a2a' },
  specialTxt: { fontFamily: 'monospace', fontSize: 14, color: GB.dark },
  specialTxtOn: { color: '#90C8FF' },
  addBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, backgroundColor: GB.dark },
  addBtnDisabled: { backgroundColor: '#1a2e0a', opacity: 0.5 },
  addBtnText: { fontFamily: 'monospace', fontSize: 12, fontWeight: 'bold', color: GB.light, letterSpacing: 2 },
});
