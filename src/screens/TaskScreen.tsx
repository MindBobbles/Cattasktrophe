import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
  Animated, PanResponder, LayoutAnimation, UIManager, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Task, TaskPriority } from '../types';
import { GB } from '../constants/colors';
import { predictPriority, getCoinsForPriority, priorityLabel } from '../utils/difficultyPredictor';
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

const ITEM_H = 48; // time picker row height

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekDays(anchor: Date): Date[] {
  const days: Date[] = [];
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - anchor.getDay());
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

// ─── Scroll Picker ────────────────────────────────────────────────────────────

function SnapScrollPicker({
  values, selected, onChange,
}: { values: number[]; selected: number; onChange: (v: number) => void }) {
  const scrollRef = useRef<ScrollView>(null);

  // Scroll to show selected value whenever it changes (e.g. on modal open)
  useEffect(() => {
    const idx = values.indexOf(selected);
    if (idx >= 0) {
      const timer = setTimeout(() => {
        scrollRef.current?.scrollTo({ y: idx * ITEM_H, animated: false });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [selected]);

  return (
    <View style={pickerStyles.pickerWrap}>
      {/* centre selection highlight */}
      <View style={pickerStyles.highlight} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        style={{ height: ITEM_H * 3 }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: ITEM_H }}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
          const clamped = Math.max(0, Math.min(values.length - 1, idx));
          onChange(values[clamped]);
        }}
      >
        {values.map((v, i) => (
          <TouchableOpacity
            key={i}
            style={[pickerStyles.pickerItem, v === selected && pickerStyles.pickerItemSel]}
            onPress={() => {
              onChange(v);
              scrollRef.current?.scrollTo({ y: i * ITEM_H, animated: true });
            }}
          >
            <Text style={[pickerStyles.pickerText, v === selected && pickerStyles.pickerTextSel]}>
              {String(v).padStart(2, '0')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Time Picker Modal ────────────────────────────────────────────────────────

const HOURS   = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

interface TimePickerProps {
  visible: boolean;
  initialTime: string;
  onConfirm: (hhmm: string) => void;
  onCancel: () => void;
  onClear: () => void;
}

function TimePickerModal({ visible, initialTime, onConfirm, onCancel, onClear }: TimePickerProps) {
  const [hour, setHour]     = useState(9);
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    if (visible && initialTime) {
      const [h, m] = initialTime.split(':').map(Number);
      if (!isNaN(h)) setHour(h);
      if (!isNaN(m)) setMinute(m);
    } else if (visible) {
      setHour(9); setMinute(0);
    }
  }, [visible]);

  function confirm() {
    onConfirm(`${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`);
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={pickerStyles.overlay}>
        <View style={pickerStyles.container}>
          <Text style={pickerStyles.title}>SET TIME</Text>
          <View style={pickerStyles.row}>
            <SnapScrollPicker values={HOURS}   selected={hour}   onChange={setHour}   />
            <Text style={pickerStyles.colon}>:</Text>
            <SnapScrollPicker values={MINUTES} selected={minute} onChange={setMinute} />
          </View>
          <Text style={pickerStyles.preview}>
            {String(hour).padStart(2,'0')}:{String(minute).padStart(2,'0')}
          </Text>
          <View style={pickerStyles.actions}>
            <TouchableOpacity style={pickerStyles.clearBtn} onPress={onClear}>
              <Text style={pickerStyles.clearBtnText}>CLEAR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={pickerStyles.cancelBtn} onPress={onCancel}>
              <Text style={pickerStyles.cancelBtnText}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={pickerStyles.confirmBtn} onPress={confirm}>
              <Text style={pickerStyles.confirmBtnText}>SET ✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Dispute Modal ────────────────────────────────────────────────────────────

interface DisputeModalProps {
  task: Task | null;
  onDisputePriority: (id: string, priority: TaskPriority) => void;
  onClose: () => void;
}

function DisputeModal({ task, onDisputePriority, onClose }: DisputeModalProps) {
  if (!task) return null;
  return (
    <Modal visible transparent animationType="fade">
      <View style={disputeStyles.overlay}>
        <View style={disputeStyles.container}>
          <Text style={disputeStyles.title}>DISPUTE PRIORITY</Text>
          <Text style={disputeStyles.taskTitle} numberOfLines={2}>{task.title}</Text>
          <Text style={disputeStyles.auto}>
            Auto-assigned: {(task.priority ?? 'medium').toUpperCase()} · {task.reward}🪙
          </Text>
          <Text style={disputeStyles.sub}>Choose the correct priority:</Text>
          <View style={disputeStyles.btnRow}>
            {(['high', 'medium', 'low'] as TaskPriority[]).map(p => (
              <TouchableOpacity
                key={p}
                style={[disputeStyles.priorityBtn, { borderColor: PRIORITY[p].border, backgroundColor: PRIORITY[p].bg }]}
                onPress={() => { playClick(); onDisputePriority(task.id, p); onClose(); }}
              >
                <Text style={[disputeStyles.priorityBtnText, { color: PRIORITY[p].border }]}>
                  {PRIORITY[p].dot}{'\n'}{PRIORITY[p].label}{'\n'}+{getCoinsForPriority(p)}🪙
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={disputeStyles.closeBtn} onPress={onClose}>
            <Text style={disputeStyles.closeBtnText}>CANCEL</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Swipeable Task Card ─────────────────────────────────────────────────────

interface CardProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onDispute: (task: Task) => void;
  disabled?: boolean;
}

function SwipeableTaskCard({ task, onToggle, onDelete, onDispute, disabled }: CardProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate     = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(1)).current;
  const scale      = useRef(new Animated.Value(1)).current;

  const priority = (task.priority ?? 'medium') as TaskPriority;
  const pc = PRIORITY[priority];
  const missed = !!task.latePenaltyApplied && !task.completed;

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled && !task.completed,
    onMoveShouldSetPanResponder: (_, g) => !disabled && !task.completed && Math.abs(g.dx) > 8,
    onPanResponderMove: (_, g) => {
      if (g.dx > 0) translateX.setValue(g.dx);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx > 90) {
        playClick();
        Animated.parallel([
          Animated.timing(translateX, { toValue: 600, duration: 280, useNativeDriver: true }),
          Animated.timing(rotate,     { toValue: 1,   duration: 280, useNativeDriver: true }),
          Animated.timing(opacity,    { toValue: 0,   duration: 220, useNativeDriver: true }),
          Animated.timing(scale,      { toValue: 0.8, duration: 280, useNativeDriver: true }),
        ]).start(() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          onToggle(task.id);
          translateX.setValue(0); rotate.setValue(0);
          opacity.setValue(1);    scale.setValue(1);
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
      <View style={[styles.card, { backgroundColor: pc.bg, borderLeftColor: pc.border }, missed && styles.cardMissed]}>
        {/* Priority badge */}
        <View style={[styles.priorityTag, { borderColor: pc.border }]}>
          <Text style={[styles.priorityTagText, { color: pc.border }]}>{pc.label}</Text>
        </View>

        {/* Task info */}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>{task.title}</Text>
          <View style={styles.cardMeta}>
            {task.scheduledTime ? <Text style={styles.cardTime}>⏰ {task.scheduledTime}</Text> : null}
            {missed && <Text style={styles.missedBadge}>❌ -5HP</Text>}
            <Text style={styles.cardReward}>+{task.reward}🪙</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => { playClick(); onDispute(task); }} style={styles.disputeBtn}>
            <Text style={styles.disputeTxt}>⚡</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(task.id)} style={styles.deleteBtn}>
            <Text style={styles.deleteTxt}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.swipeHint}>← swipe right to complete →</Text>
    </Animated.View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

interface Props {
  regularTasks: Task[];
  completedToday: number;
  catHealth: number;
  catAlive: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onDisputePriority: (id: string, priority: TaskPriority) => void;
  onAdd: (title: string, time: string, priority: TaskPriority, coins: number) => void;
}

export default function TaskScreen({
  regularTasks,
  completedToday, catHealth, catAlive,
  onToggle, onDelete, onDisputePriority, onAdd,
}: Props) {

  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekAnchor, setWeekAnchor] = useState(today);
  const weekDays = useMemo(() => getWeekDays(weekAnchor), [weekAnchor]);

  // Add-task form
  const [title, setTitle]               = useState('');
  const [time, setTime]                 = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [disputingTask, setDisputingTask]   = useState<Task | null>(null);

  const autoPriority  = useMemo(() => predictPriority(title), [title]);
  const autoCoins     = useMemo(() => getCoinsForPriority(autoPriority), [autoPriority]);

  function handleAdd() {
    const t = title.trim();
    if (!t) return;
    onAdd(t, time.trim(), autoPriority, autoCoins);
    setTitle('');
    setTime('');
  }

  // Sort: timed first, then flexible
  const timed    = regularTasks.filter(t => t.scheduledTime).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  const flexible = regularTasks.filter(t => !t.scheduledTime);

  const total = regularTasks.length;
  const pct   = total === 0 ? 0 : Math.round((completedToday / total) * 100);

  function prevWeek() { const d = new Date(weekAnchor); d.setDate(d.getDate() - 7); setWeekAnchor(d); }
  function nextWeek() { const d = new Date(weekAnchor); d.setDate(d.getDate() + 7); setWeekAnchor(d); }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* ── Time Picker Modal ── */}
      <TimePickerModal
        visible={showTimePicker}
        initialTime={time}
        onConfirm={v => { setTime(v); setShowTimePicker(false); }}
        onCancel={() => setShowTimePicker(false)}
        onClear={() => { setTime(''); setShowTimePicker(false); }}
      />

      {/* ── Dispute Modal ── */}
      <DisputeModal
        task={disputingTask}
        onDisputePriority={onDisputePriority}
        onClose={() => setDisputingTask(null)}
      />

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
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={styles.monthStrip} contentContainerStyle={styles.monthStripContent}>
            {MONTHS.map((m, i) => {
              const isCurrent = i === today.getMonth();
              return (
                <TouchableOpacity key={m} style={styles.monthItem}>
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
                  <TouchableOpacity key={i}
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
                    <SwipeableTaskCard task={t} onToggle={onToggle} onDelete={onDelete}
                      onDispute={setDisputingTask} disabled={!catAlive} />
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
                <SwipeableTaskCard key={t.id} task={t} onToggle={onToggle} onDelete={onDelete}
                  onDispute={setDisputingTask} disabled={!catAlive} />
              ))}
            </View>
          )}

          {regularTasks.length === 0 && (
            <Text style={styles.empty}>No tasks yet. Add one below ↓</Text>
          )}

          {!catAlive && (
            <View style={styles.deadBanner}>
              <Text style={styles.deadBannerText}>
                💀 Your cat is dead. Go to Market → buy Revive Potion (50🪙).
              </Text>
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
            {/* iOS-style time picker button */}
            <TouchableOpacity
              style={[styles.input, styles.timeBtn]}
              onPress={() => { playClick(); setShowTimePicker(true); }}
            >
              <Text style={{ fontFamily: 'monospace', fontSize: 11, color: time ? GB.light : GB.dark, textAlign: 'center' }}>
                {time || '⏰\nTIME'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Auto priority preview */}
          {title.trim().length > 0 && (
            <View style={[styles.diffRow, { borderLeftWidth: 3, borderLeftColor: PRIORITY[autoPriority].border }]}>
              <Text style={[styles.diffLabel, { color: PRIORITY[autoPriority].border }]}>
                {PRIORITY[autoPriority].dot} {priorityLabel(autoPriority)}  ·  🪙 {autoCoins} coins
              </Text>
              <Text style={styles.diffHint}>auto-detected · ⚡ dispute after adding</Text>
            </View>
          )}

          {/* Add button */}
          <View style={styles.addActions}>
            <TouchableOpacity
              style={[styles.addBtn, !title.trim() && styles.addBtnDisabled]}
              onPress={handleAdd}
              disabled={!title.trim()}
            >
              <Text style={styles.addBtnText}>+ ADD TASK</Text>
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

  header: { backgroundColor: '#0a1a0a', borderBottomWidth: 2, borderBottomColor: GB.dark, paddingBottom: 6 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
  headerTitle: { fontFamily: 'monospace', fontSize: 15, fontWeight: 'bold', color: GB.light, letterSpacing: 2 },
  headerSub: { fontFamily: 'monospace', fontSize: 11, color: GB.dark },

  monthStrip: { maxHeight: 34 },
  monthStripContent: { paddingHorizontal: 10, gap: 2, alignItems: 'center' },
  monthItem: { paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' },
  monthText: { fontFamily: 'monospace', fontSize: 11, color: GB.dark, letterSpacing: 1 },
  monthTextActive: { color: GB.light, fontWeight: 'bold' },
  monthDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: GB.medium, marginTop: 2 },

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

  section: { marginBottom: 4 },
  sectionHeader: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#061006', borderBottomWidth: 1, borderBottomColor: GB.dark },
  sectionLabel: { fontFamily: 'monospace', fontSize: 9, color: GB.dark, letterSpacing: 2 },

  timedRow: { flexDirection: 'row', alignItems: 'flex-start', paddingLeft: 8 },
  timeMarker: { fontFamily: 'monospace', fontSize: 10, color: GB.dark, width: 42, paddingTop: 14, paddingRight: 4, textAlign: 'right' },

  card: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 8, marginVertical: 4, borderRadius: 5, borderLeftWidth: 4, paddingVertical: 10, paddingRight: 8, paddingLeft: 10, gap: 8, backgroundColor: '#0a1a0a', borderLeftColor: GB.dark },
  cardMissed: { borderTopWidth: 1, borderTopColor: '#CC4444' },
  cardDone: { opacity: 0.4, backgroundColor: '#0a0a0a' },
  cardDoneText: { flex: 1, fontFamily: 'monospace', fontSize: 12, color: GB.dark, textDecorationLine: 'line-through' },
  cardDoneReward: { fontFamily: 'monospace', fontSize: 10, color: GB.dark },

  priorityTag: { borderWidth: 1, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2 },
  priorityTagText: { fontFamily: 'monospace', fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5 },

  cardBody: { flex: 1, gap: 4 },
  cardTitle: { fontFamily: 'monospace', fontSize: 13, color: GB.light, letterSpacing: 0.2 },
  cardMeta: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  cardTime: { fontFamily: 'monospace', fontSize: 10, color: GB.dark },
  missedBadge: { fontFamily: 'monospace', fontSize: 10, color: '#CC4444', fontWeight: 'bold' },
  cardReward: { fontFamily: 'monospace', fontSize: 10, color: GB.medium, fontWeight: 'bold' },

  cardActions: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  disputeBtn: { padding: 4 },
  disputeTxt: { fontSize: 12 },
  deleteBtn: { padding: 4 },
  deleteTxt: { fontFamily: 'monospace', fontSize: 13, color: GB.dark },

  swipeHint: { fontFamily: 'monospace', fontSize: 9, color: '#1a3a1a', textAlign: 'center', marginBottom: 2 },

  empty: { fontFamily: 'monospace', fontSize: 12, color: GB.dark, textAlign: 'center', marginTop: 32 },
  deadBanner: { margin: 12, padding: 10, borderWidth: 1, borderColor: '#CC4444', borderRadius: 4, backgroundColor: '#1a0000' },
  deadBannerText: { fontFamily: 'monospace', fontSize: 11, color: '#FF6666', textAlign: 'center' },

  addBox: { borderTopWidth: 2, borderTopColor: GB.dark, backgroundColor: '#0a1a0a' },
  addRow: { flexDirection: 'row' },
  input: { fontFamily: 'monospace', fontSize: 13, color: GB.light, paddingHorizontal: 12, paddingVertical: 11, borderRightWidth: 1, borderRightColor: GB.dark },
  timeBtn: { width: 68, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  diffRow: { paddingHorizontal: 12, paddingVertical: 5, borderTopWidth: 1, borderTopColor: GB.dark, backgroundColor: '#061006', gap: 2 },
  diffLabel: { fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold' },
  diffHint: { fontFamily: 'monospace', fontSize: 9, color: GB.dark },
  addActions: { borderTopWidth: 1, borderTopColor: GB.dark },
  addBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, backgroundColor: GB.dark },
  addBtnDisabled: { backgroundColor: '#1a2e0a', opacity: 0.5 },
  addBtnText: { fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold', color: GB.light, letterSpacing: 2 },
});

// ─── Time Picker Styles ───────────────────────────────────────────────────────

const pickerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
  container: { backgroundColor: '#0a200a', borderWidth: 2, borderColor: GB.dark, borderRadius: 10, padding: 20, alignItems: 'center', width: 260, gap: 14 },
  title: { fontFamily: 'monospace', fontSize: 14, fontWeight: 'bold', color: GB.light, letterSpacing: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  colon: { fontFamily: 'monospace', fontSize: 28, fontWeight: 'bold', color: GB.medium, marginBottom: 4 },
  preview: { fontFamily: 'monospace', fontSize: 20, fontWeight: 'bold', color: GB.light, letterSpacing: 3 },

  pickerWrap: { width: 72, height: ITEM_H * 3, overflow: 'hidden', position: 'relative' },
  highlight: {
    position: 'absolute', top: ITEM_H, left: 0, right: 0, height: ITEM_H,
    backgroundColor: GB.dark, opacity: 0.4, borderRadius: 4, zIndex: 1,
    pointerEvents: 'none',
  } as any,
  pickerItem: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  pickerItemSel: {},
  pickerText: { fontFamily: 'monospace', fontSize: 20, color: GB.dark, letterSpacing: 1 },
  pickerTextSel: { color: GB.light, fontWeight: 'bold', fontSize: 24 },

  actions: { flexDirection: 'row', gap: 8 },
  clearBtn: { flex: 1, paddingVertical: 8, borderWidth: 1, borderColor: GB.dark, borderRadius: 4, alignItems: 'center' },
  clearBtnText: { fontFamily: 'monospace', fontSize: 11, color: GB.dark, letterSpacing: 1 },
  cancelBtn: { flex: 1, paddingVertical: 8, borderWidth: 1, borderColor: GB.dark, borderRadius: 4, alignItems: 'center' },
  cancelBtnText: { fontFamily: 'monospace', fontSize: 11, color: GB.medium, letterSpacing: 1 },
  confirmBtn: { flex: 1, paddingVertical: 8, backgroundColor: GB.dark, borderRadius: 4, alignItems: 'center' },
  confirmBtnText: { fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold', color: GB.light, letterSpacing: 1 },
});

// ─── Dispute Styles ───────────────────────────────────────────────────────────

const disputeStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
  container: { backgroundColor: '#0a1a0a', borderWidth: 2, borderColor: GB.dark, borderRadius: 10, padding: 20, width: 290, gap: 10 },
  title: { fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold', color: GB.light, letterSpacing: 2 },
  taskTitle: { fontFamily: 'monospace', fontSize: 12, color: GB.medium, lineHeight: 17 },
  auto: { fontFamily: 'monospace', fontSize: 10, color: GB.dark },
  sub: { fontFamily: 'monospace', fontSize: 11, color: GB.dark, letterSpacing: 0.5 },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  priorityBtn: { flex: 1, borderWidth: 2, borderRadius: 6, paddingVertical: 10, alignItems: 'center' },
  priorityBtnText: { fontFamily: 'monospace', fontSize: 12, fontWeight: 'bold', textAlign: 'center', lineHeight: 18 },
  closeBtn: { borderWidth: 1, borderColor: GB.dark, borderRadius: 4, paddingVertical: 8, alignItems: 'center', marginTop: 4 },
  closeBtnText: { fontFamily: 'monospace', fontSize: 11, color: GB.dark, letterSpacing: 1 },
});
