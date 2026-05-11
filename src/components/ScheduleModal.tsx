import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { RepeatRule } from '../types';
import { GB } from '../constants/colors';

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface ScheduleConfig {
  title?: string;           // present in 'edit' mode
  taskDate: string;         // YYYY-MM-DD
  scheduledTime: string;    // 'HH:MM' or ''
  repeatRule: RepeatRule | 'none';
  repeatDays: number[];     // 0=Sun…6=Sat (for 'custom')
}

// ─── Drum Picker ──────────────────────────────────────────────────────────────

const ITEM_H  = 56;
const VISIBLE = 5;
const DRUM_H  = ITEM_H * VISIBLE;

function DrumPicker({ values, selected, onChange }: {
  values: number[];
  selected: number;
  onChange: (v: number) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const PAD = Math.floor(VISIBLE / 2);

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
    <View style={dStyles.drumWrap}>
      {/* Fade overlays — rendered AFTER ScrollView so they paint on top */}
      <ScrollView
        ref={scrollRef}
        style={{ height: DRUM_H }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: ITEM_H * PAD }}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
          onChange(values[Math.max(0, Math.min(values.length - 1, idx))]);
        }}
      >
        {values.map((v, i) => {
          const dist = Math.abs(values.indexOf(selected) - i);
          const isSel = v === selected;
          return (
            <TouchableOpacity
              key={i}
              // Background highlight lives on the item itself — no z-index conflict
              style={[dStyles.drumItem, isSel && dStyles.drumItemSel]}
              onPress={() => {
                onChange(v);
                scrollRef.current?.scrollTo({ y: i * ITEM_H, animated: true });
              }}
              activeOpacity={0.7}
            >
              <Text style={[
                dStyles.drumText,
                isSel      && dStyles.drumTextSel,
                dist === 1 && dStyles.drumTextNear,
                dist >= 2  && dStyles.drumTextFar,
              ]}>
                {String(v).padStart(2, '0')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {/* Fades come AFTER so they paint over the scroll items (top/bottom rows only) */}
      <View style={dStyles.fadeTop} pointerEvents="none" />
      <View style={dStyles.fadeBot} pointerEvents="none" />
    </View>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HOURS   = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const SHORT_DAY  = ['S',   'M',   'T',   'W',   'T',   'F',   'S'];

const REPEAT_OPTIONS: { rule: RepeatRule | 'none'; label: string; icon: string }[] = [
  { rule: 'none',     label: 'NONE',     icon: '✕' },
  { rule: 'daily',    label: 'DAILY',    icon: '∞' },
  { rule: 'weekdays', label: 'WEEKDAYS', icon: 'M-F' },
  { rule: 'weekly',   label: 'WEEKLY',   icon: '📅' },
  { rule: 'custom',   label: 'CUSTOM',   icon: '⚙' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function sameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() &&
    a.getMonth()    === b.getMonth() &&
    a.getFullYear() === b.getFullYear();
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  initial: ScheduleConfig;
  mode?: 'add' | 'edit';     // edit = shows title TextInput
  isRepeating?: boolean;     // show scope selector in edit mode
  onConfirm: (config: ScheduleConfig, scope: 'this' | 'upcoming') => void;
  onCancel: () => void;
  onDelete?: (scope: 'this' | 'upcoming') => void;  // edit mode only
}

export default function ScheduleModal({
  visible, initial, mode = 'add', isRepeating = false,
  onConfirm, onCancel, onDelete,
}: Props) {
  const today = new Date();

  const [editTitle,  setEditTitle]  = useState('');
  const [taskDate,   setTaskDate]   = useState(toDateStr(today));
  const [hasTime,    setHasTime]    = useState(false);
  const [hour,       setHour]       = useState(9);
  const [minute,     setMinute]     = useState(0);
  const [repeatRule, setRepeatRule] = useState<RepeatRule | 'none'>('none');
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [scope,      setScope]      = useState<'this' | 'upcoming'>('this');

  useEffect(() => {
    if (visible) {
      setEditTitle(initial.title ?? '');
      setTaskDate(initial.taskDate || toDateStr(today));
      const hasT = !!initial.scheduledTime;
      setHasTime(hasT);
      if (hasT) {
        const [h, m] = initial.scheduledTime.split(':').map(Number);
        setHour(isNaN(h) ? 9 : h);
        setMinute(isNaN(m) ? 0 : m);
      } else {
        setHour(9); setMinute(0);
      }
      setRepeatRule(initial.repeatRule ?? 'none');
      setRepeatDays(initial.repeatDays ?? []);
      setScope('this');
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Date options: today + next 6 days
  const dateOptions: Date[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  function toggleDay(dow: number) {
    setRepeatDays(prev =>
      prev.includes(dow)
        ? prev.filter(d => d !== dow)
        : [...prev, dow].sort((a, b) => a - b)
    );
  }

  function handleDelete() {
    if (isRepeating) {
      Alert.alert(
        'Delete Repeating Task?',
        'What would you like to remove?',
        [
          { text: 'Only This Task',      onPress: () => { onDelete?.('this');     onCancel(); } },
          { text: 'This & All Upcoming', onPress: () => { onDelete?.('upcoming'); onCancel(); }, style: 'destructive' },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      Alert.alert(
        'Delete Task?',
        'This cannot be undone.',
        [
          { text: 'Delete', onPress: () => { onDelete?.('this'); onCancel(); }, style: 'destructive' },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  }

  function confirm() {
    onConfirm({
      title: mode === 'edit' ? editTitle : undefined,
      taskDate,
      scheduledTime: hasTime
        ? `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        : '',
      repeatRule,
      repeatDays: repeatRule === 'custom' ? repeatDays : [],
    }, scope);
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Tap outside to cancel */}
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onCancel} />

        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handle} />

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <Text style={styles.title}>
              {mode === 'edit' ? '✏️  EDIT TASK' : '📅  SCHEDULE TASK'}
            </Text>

            {/* ── EDIT MODE: title field ── */}
            {mode === 'edit' && (
              <>
                <Text style={styles.sectionLabel}>TASK NAME</Text>
                <TextInput
                  style={styles.titleInput}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Task name..."
                  placeholderTextColor={GB.dark}
                  maxLength={80}
                  autoCorrect={false}
                />
              </>
            )}

            {/* ── WHEN? ── */}
            <Text style={styles.sectionLabel}>WHEN?</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.dateScroll}
              contentContainerStyle={styles.dateScrollContent}
            >
              {dateOptions.map((d, i) => {
                const ds = toDateStr(d);
                const isSel   = ds === taskDate;
                const isToday = sameDay(d, today);
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.dateChip, isSel && styles.dateChipSel]}
                    onPress={() => setTaskDate(ds)}
                  >
                    <Text style={[styles.dateChipDay, isSel && styles.dateChipTextSel]}>
                      {isToday ? 'TODAY' : DAY_LABELS[d.getDay()]}
                    </Text>
                    <Text style={[styles.dateChipNum, isSel && styles.dateChipTextSel]}>
                      {d.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* ── TIME? ── */}
            <Text style={styles.sectionLabel}>TIME?</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, !hasTime && styles.toggleBtnSel]}
                onPress={() => setHasTime(false)}
              >
                <Text style={[styles.toggleBtnTxt, !hasTime && styles.toggleBtnTxtSel]}>NO TIME</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, hasTime && styles.toggleBtnSel]}
                onPress={() => setHasTime(true)}
              >
                <Text style={[styles.toggleBtnTxt, hasTime && styles.toggleBtnTxtSel]}>SET TIME</Text>
              </TouchableOpacity>
            </View>

            {hasTime && (
              <View style={styles.drumRow}>
                <DrumPicker values={HOURS}   selected={hour}   onChange={setHour} />
                <View style={styles.colonWrap}>
                  <Text style={styles.colon}>:</Text>
                </View>
                <DrumPicker values={MINUTES} selected={minute} onChange={setMinute} />
              </View>
            )}

            {/* ── REPEAT? ── */}
            <Text style={styles.sectionLabel}>REPEAT?</Text>
            <View style={styles.repeatGrid}>
              {REPEAT_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.rule}
                  style={[styles.repeatChip, repeatRule === opt.rule && styles.repeatChipSel]}
                  onPress={() => setRepeatRule(opt.rule)}
                >
                  <Text style={[styles.repeatIcon, repeatRule === opt.rule && styles.repeatIconSel]}>
                    {opt.icon}
                  </Text>
                  <Text style={[styles.repeatChipTxt, repeatRule === opt.rule && styles.repeatChipTxtSel]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom day picker */}
            {repeatRule === 'custom' && (
              <>
                <Text style={styles.customHint}>Pick days:</Text>
                <View style={styles.dayToggleRow}>
                  {SHORT_DAY.map((label, dow) => (
                    <TouchableOpacity
                      key={dow}
                      style={[styles.dayToggle, repeatDays.includes(dow) && styles.dayToggleSel]}
                      onPress={() => toggleDay(dow)}
                    >
                      <Text style={[styles.dayToggleTxt, repeatDays.includes(dow) && styles.dayToggleTxtSel]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* ── DELETE (edit mode only) ── */}
            {mode === 'edit' && onDelete && (
              <TouchableOpacity style={styles.deleteTaskBtn} onPress={handleDelete}>
                <Text style={styles.deleteTaskBtnTxt}>🗑  DELETE TASK</Text>
              </TouchableOpacity>
            )}

            {/* ── SCOPE (edit mode + repeating) ── */}
            {mode === 'edit' && isRepeating && (
              <>
                <Text style={styles.sectionLabel}>APPLY TO?</Text>
                <View style={styles.toggleRow}>
                  <TouchableOpacity
                    style={[styles.toggleBtn, scope === 'this' && styles.toggleBtnSel]}
                    onPress={() => setScope('this')}
                  >
                    <Text style={[styles.toggleBtnTxt, scope === 'this' && styles.toggleBtnTxtSel]}>
                      ONLY THIS
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleBtn, scope === 'upcoming' && styles.toggleBtnSel]}
                    onPress={() => setScope('upcoming')}
                  >
                    <Text style={[styles.toggleBtnTxt, scope === 'upcoming' && styles.toggleBtnTxtSel]}>
                      ALL UPCOMING
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

          </ScrollView>

          {/* ── Actions ── */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnTxt}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={confirm}>
              <Text style={styles.confirmBtnTxt}>
                {mode === 'edit' ? 'SAVE ✓' : 'CONFIRM ✓'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Drum Styles ──────────────────────────────────────────────────────────────

const dStyles = StyleSheet.create({
  drumWrap: { width: 96, height: DRUM_H, overflow: 'hidden' },
  // Fades — absolute, rendered after ScrollView in JSX so they paint on top
  fadeTop: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: ITEM_H, backgroundColor: '#050f05', opacity: 0.72,
  } as any,
  fadeBot: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: ITEM_H, backgroundColor: '#050f05', opacity: 0.72,
  } as any,
  drumItem: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  // Highlight background lives directly on the item — no floating overlay needed
  drumItemSel: {
    backgroundColor: GB.dark,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  drumText:     { fontFamily: 'monospace', fontSize: 22, color: '#2a4a2a', letterSpacing: 2 },
  drumTextSel:  { fontSize: 34, fontWeight: 'bold', color: '#FFFFFF', letterSpacing: 3 },
  drumTextNear: { fontSize: 24, color: '#5a9a5a' },
  drumTextFar:  { fontSize: 18, color: '#1a3a1a' },
});

// ─── Main Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  kav: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },

  sheet: {
    backgroundColor: '#050f05',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: GB.dark,
    maxHeight: '92%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: GB.dark, alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
  },

  scroll: { flexGrow: 0 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 10, gap: 10 },

  title: {
    fontFamily: 'monospace', fontSize: 14, fontWeight: 'bold',
    color: GB.light, letterSpacing: 2, textAlign: 'center', marginTop: 2,
  },
  sectionLabel: {
    fontFamily: 'monospace', fontSize: 9, color: GB.dark, letterSpacing: 2, marginTop: 4,
  },

  titleInput: {
    fontFamily: 'monospace', fontSize: 13, color: GB.light,
    borderWidth: 1, borderColor: GB.dark, borderRadius: 6,
    paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#0a1a0a',
  },

  // Date chips
  dateScroll: { flexGrow: 0 },
  dateScrollContent: { gap: 6, paddingVertical: 2 },
  dateChip: {
    alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10,
    borderWidth: 1, borderColor: GB.dark, borderRadius: 8, minWidth: 52,
  },
  dateChipSel: { backgroundColor: GB.dark, borderColor: GB.medium },
  dateChipDay: { fontFamily: 'monospace', fontSize: 8, color: GB.dark, letterSpacing: 0.5 },
  dateChipNum: { fontFamily: 'monospace', fontSize: 18, fontWeight: 'bold', color: GB.medium, marginTop: 2 },
  dateChipTextSel: { color: '#E8FFD0' },

  // Toggle buttons (time / scope)
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: {
    flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: GB.dark,
    borderRadius: 8, alignItems: 'center',
  },
  toggleBtnSel: { backgroundColor: GB.dark, borderColor: GB.medium },
  toggleBtnTxt: { fontFamily: 'monospace', fontSize: 10, color: GB.dark, letterSpacing: 1 },
  toggleBtnTxtSel: { color: '#E8FFD0', fontWeight: 'bold' },

  // Drum
  drumRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  colonWrap: { width: 32, height: DRUM_H, alignItems: 'center', justifyContent: 'center' },
  colon: {
    fontFamily: 'monospace', fontSize: 36, fontWeight: 'bold',
    color: GB.light, lineHeight: 44, marginTop: -8,
  },

  // Repeat chips
  repeatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  repeatChip: {
    alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: GB.dark, borderRadius: 8, gap: 3, minWidth: 60,
  },
  repeatChipSel: { backgroundColor: GB.dark, borderColor: GB.medium },
  repeatIcon:    { fontSize: 12 },
  repeatIconSel: { fontSize: 12 },
  repeatChipTxt: { fontFamily: 'monospace', fontSize: 9, color: GB.dark, letterSpacing: 1 },
  repeatChipTxtSel: { color: '#E8FFD0', fontWeight: 'bold' },

  // Custom day toggles
  customHint: { fontFamily: 'monospace', fontSize: 9, color: GB.dark },
  dayToggleRow: { flexDirection: 'row', gap: 6, justifyContent: 'space-between' },
  dayToggle: {
    flex: 1, aspectRatio: 1, borderRadius: 8,
    borderWidth: 1, borderColor: GB.dark,
    alignItems: 'center', justifyContent: 'center',
    maxWidth: 40,
  },
  dayToggleSel: { backgroundColor: GB.dark, borderColor: GB.medium },
  dayToggleTxt: { fontFamily: 'monospace', fontSize: 12, color: GB.dark },
  dayToggleTxtSel: { color: '#E8FFD0', fontWeight: 'bold' },

  // Delete task button
  deleteTaskBtn: {
    paddingVertical: 12, borderWidth: 1, borderColor: '#CC3333',
    borderRadius: 8, alignItems: 'center', backgroundColor: '#1a0505',
    marginTop: 4,
  },
  deleteTaskBtnTxt: {
    fontFamily: 'monospace', fontSize: 12, color: '#FF5555', letterSpacing: 1, fontWeight: 'bold',
  },

  // Actions
  actions: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: GB.dark,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderWidth: 1, borderColor: GB.dark,
    borderRadius: 10, alignItems: 'center',
  },
  cancelBtnTxt: { fontFamily: 'monospace', fontSize: 12, color: GB.medium, letterSpacing: 1 },
  confirmBtn: {
    flex: 2, paddingVertical: 13, backgroundColor: GB.dark,
    borderRadius: 10, alignItems: 'center',
  },
  confirmBtnTxt: { fontFamily: 'monospace', fontSize: 12, fontWeight: 'bold', color: '#E8FFD0', letterSpacing: 1 },
});
