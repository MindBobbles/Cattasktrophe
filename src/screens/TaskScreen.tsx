import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Task, TaskPriority, RepeatRule } from '../types';
import { GB } from '../constants/colors';
import { predictPriority, getCoinsForPriority, priorityLabel } from '../utils/difficultyPredictor';
import { playClick } from '../utils/sound';
import { PixelCoin, PixelPriority } from '../components/PixelIcons';
import ScheduleModal, { ScheduleConfig } from '../components/ScheduleModal';

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const DAYS   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

const PRIORITY: Record<TaskPriority, { border: string; bg: string; label: string }> = {
  high:   { border: '#CC2222', bg: '#1a0808', label: 'HIGH' },
  medium: { border: '#B89000', bg: '#1a1500', label: 'MED'  },
  low:    { border: '#2A6230', bg: '#0a1a0a', label: 'LOW'  },
};

const REPEAT_LABEL: Partial<Record<RepeatRule | 'none', string>> = {
  daily:    '∞ DAILY',
  weekdays: 'M-F',
  weekly:   '📅 WEEKLY',
  custom:   '⚙ CUSTOM',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekDays(anchor: Date): Date[] {
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - anchor.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function sameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() &&
    a.getMonth()    === b.getMonth() &&
    a.getFullYear() === b.getFullYear();
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
          <View style={disputeStyles.autoRow}>
            <Text style={disputeStyles.auto}>Auto: {(task.priority ?? 'medium').toUpperCase()} ·</Text>
            <Text style={disputeStyles.auto}> +{task.reward}</Text>
            <PixelCoin size={2} />
          </View>
          <Text style={disputeStyles.sub}>Choose the correct priority:</Text>
          <View style={disputeStyles.btnRow}>
            {(['high', 'medium', 'low'] as TaskPriority[]).map(p => (
              <TouchableOpacity
                key={p}
                style={[disputeStyles.priorityBtn, { borderColor: PRIORITY[p].border, backgroundColor: PRIORITY[p].bg }]}
                onPress={() => { playClick(); onDisputePriority(task.id, p); onClose(); }}
              >
                <PixelPriority level={p} size={3} />
                <Text style={[disputeStyles.priorityBtnText, { color: PRIORITY[p].border }]}>
                  {PRIORITY[p].label}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Text style={[disputeStyles.priorityCoins, { color: PRIORITY[p].border }]}>
                    +{getCoinsForPriority(p)}
                  </Text>
                  <PixelCoin size={2} />
                </View>
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

// ─── Task Card ───────────────────────────────────────────────────────────────

interface CardProps {
  task: Task;
  onToggle: (id: string) => void;
  onDispute: (task: Task) => void;
  onEdit: (task: Task) => void;
  disabled?: boolean;
}

function TaskCard({ task, onToggle, onDispute, onEdit, disabled }: CardProps) {
  const priority = (task.priority ?? 'medium') as TaskPriority;
  const pc       = PRIORITY[priority];
  const missed   = !!task.latePenaltyApplied && !task.completed;
  const isRepeat = !!task.templateId;

  return (
    <View style={[
      styles.card,
      { backgroundColor: pc.bg, borderLeftColor: pc.border },
      task.completed && styles.cardDone,
      missed && !task.completed && styles.cardMissed,
    ]}>
      {/* Priority badge */}
      {!task.completed && (
        <View style={[styles.priorityTag, { borderColor: pc.border }]}>
          <Text style={[styles.priorityTagText, { color: pc.border }]}>{pc.label}</Text>
        </View>
      )}

      {/* Tappable body — opens edit modal */}
      <TouchableOpacity
        style={styles.cardBody}
        onPress={() => { if (!disabled || task.completed) onEdit(task); }}
        activeOpacity={0.7}
      >
        <Text style={[styles.cardTitle, task.completed && styles.cardTitleDone]} numberOfLines={2}>
          {task.title}
        </Text>
        {!task.completed && (
          <View style={styles.cardMeta}>
            {task.scheduledTime ? <Text style={styles.cardTime}>⏰ {task.scheduledTime}</Text> : null}
            {isRepeat && task.repeatRule && (task.repeatRule as string) !== 'none' && (
              <Text style={styles.repeatBadge}>🔁 {REPEAT_LABEL[task.repeatRule] ?? task.repeatRule}</Text>
            )}
            {missed && <Text style={styles.missedBadge}>❌ -5HP</Text>}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text style={styles.cardReward}>+{task.reward}</Text>
              <PixelCoin size={2} />
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* Right-side actions */}
      <View style={styles.cardActions}>
        {!task.completed && (
          <TouchableOpacity
            onPress={() => { playClick(); onDispute(task); }}
            style={styles.disputeBtn}
          >
            <Text style={styles.disputeTxt}>⚡</Text>
          </TouchableOpacity>
        )}

        {/* Tick button — locked once completed */}
        <TouchableOpacity
          style={[styles.tickBtn, task.completed && styles.tickBtnDone]}
          onPress={() => { playClick(); onToggle(task.id); }}
          disabled={disabled || task.completed}
        >
          <Text style={[styles.tickTxt, task.completed && styles.tickTxtDone]}>
            {task.completed ? '✓' : '○'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

interface Props {
  regularTasks: Task[];
  catHealth: number;
  catAlive: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onDeleteAndUpcoming: (id: string) => void;
  onDisputePriority: (id: string, priority: TaskPriority) => void;
  onAdd: (title: string, config: ScheduleConfig) => void;
  onEdit: (id: string, config: ScheduleConfig, scope: 'this' | 'upcoming') => void;
}


export default function TaskScreen({
  regularTasks, catHealth, catAlive,
  onToggle, onDelete, onDeleteAndUpcoming, onDisputePriority,
  onAdd, onEdit,
}: Props) {

  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekAnchor,   setWeekAnchor]   = useState(today);
  const weekDays = useMemo(() => getWeekDays(weekAnchor), [weekAnchor]);

  // Add-task form
  const [title, setTitle] = useState('');

  // Schedule modal (used for both ADD and EDIT)
  const [showModal,   setShowModal]   = useState(false);
  const [modalMode,   setModalMode]   = useState<'add' | 'edit'>('add');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [modalInitial, setModalInitial] = useState<ScheduleConfig>({
    taskDate:      '',
    scheduledTime: '',
    repeatRule:    'none',
    repeatDays:    [],
  });

  // Dispute modal
  const [disputingTask, setDisputingTask] = useState<Task | null>(null);

  const autoPriority = useMemo(() => predictPriority(title), [title]);
  const autoCoins    = useMemo(() => getCoinsForPriority(autoPriority), [autoPriority]);

  // ── Day scoping ──────────────────────────────────────────────────────────────
  const isToday    = sameDay(selectedDate, today);
  const isFuture   = selectedDate > today && !sameDay(selectedDate, today);
  const selDateStr = toDateStr(selectedDate);

  const dayTasks = useMemo(() =>
    regularTasks.filter(t => {
      const tDate = t.taskDate ?? t.createdAt?.slice(0, 10) ?? toDateStr(today);
      return tDate === selDateStr;
    }),
    [regularTasks, selDateStr]
  );

  // ── Add task ────────────────────────────────────────────────────────────────

  function openAddModal() {
    const t = title.trim();
    if (!t || !isToday) return;
    setModalMode('add');
    setEditingTask(null);
    setModalInitial({
      taskDate:      selDateStr,
      scheduledTime: '',
      repeatRule:    'none',
      repeatDays:    [],
    });
    setShowModal(true);
  }

  function handleModalConfirm(config: ScheduleConfig, scope: 'this' | 'upcoming') {
    if (modalMode === 'add') {
      onAdd(title.trim(), config);
      setTitle('');
    } else if (modalMode === 'edit' && editingTask) {
      onEdit(editingTask.id, config, scope);
    }
    setShowModal(false);
    setEditingTask(null);
  }

  function handleDeleteFromModal(scope: 'this' | 'upcoming') {
    if (!editingTask) return;
    if (scope === 'upcoming') {
      onDeleteAndUpcoming(editingTask.id);
    } else {
      onDelete(editingTask.id);
    }
    setShowModal(false);
    setEditingTask(null);
  }

  // ── Edit task ───────────────────────────────────────────────────────────────

  function openEditModal(task: Task) {
    playClick();
    setEditingTask(task);
    setModalMode('edit');
    setModalInitial({
      title:         task.title,
      taskDate:      task.taskDate ?? selDateStr,
      scheduledTime: task.scheduledTime ?? '',
      repeatRule:    (task.repeatRule as RepeatRule | 'none') ?? 'none',
      repeatDays:    task.repeatDays ?? [],
    });
    setShowModal(true);
  }

  // ── Task list sort ──────────────────────────────────────────────────────────
  const timed    = dayTasks.filter(t => t.scheduledTime).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  const flexible = dayTasks.filter(t => !t.scheduledTime);

  const total = dayTasks.length;
  const done  = dayTasks.filter(t => t.completed).length;
  const pct   = total === 0 ? 0 : Math.round((done / total) * 100);

  function prevWeek() { const d = new Date(weekAnchor); d.setDate(d.getDate() - 7); setWeekAnchor(d); }
  function nextWeek() { const d = new Date(weekAnchor); d.setDate(d.getDate() + 7); setWeekAnchor(d); }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* ── Schedule Modal (add + edit) ── */}
      <ScheduleModal
        visible={showModal}
        initial={modalInitial}
        mode={modalMode}
        isRepeating={!!editingTask?.templateId}
        onConfirm={handleModalConfirm}
        onCancel={() => { setShowModal(false); setEditingTask(null); }}
        onDelete={modalMode === 'edit' ? handleDeleteFromModal : undefined}
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
            <Text style={styles.headerSub}>{done}/{total} · {pct}%</Text>
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
                const isTodayCell = sameDay(d, today);
                const isSelect    = sameDay(d, selectedDate);
                return (
                  <TouchableOpacity key={i}
                    style={[styles.dayCell, isSelect && styles.dayCellSelected]}
                    onPress={() => setSelectedDate(d)}
                  >
                    <Text style={[styles.dayLabel, isSelect && styles.dayLabelSelected]}>
                      {DAYS[d.getDay()].slice(0, 2)}
                    </Text>
                    <Text style={[styles.dayNum, isSelect && styles.dayNumSelected, isTodayCell && styles.dayNumToday]}>
                      {d.getDate()}
                    </Text>
                    {isTodayCell && <View style={styles.todayDot} />}
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

          {/* Non-today notice */}
          {!isToday && (
            <View style={[styles.noticeBanner, { borderColor: isFuture ? GB.dark : '#555' }]}>
              <Text style={[styles.noticeBannerText, { color: isFuture ? GB.medium : GB.dark }]}>
                {isFuture
                  ? `📅 Future — tasks added here unlock on ${selDateStr}`
                  : '🔒 Past day — view only'}
              </Text>
            </View>
          )}

          {/* Scheduled tasks */}
          {timed.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>SCHEDULED</Text>
              </View>
              {timed.map(t => (
                <View key={t.id} style={styles.timedRow}>
                  <Text style={styles.timeMarker}>{t.scheduledTime}</Text>
                  <View style={{ flex: 1 }}>
                    <TaskCard
                      task={t}
                      onToggle={onToggle}
                      onDispute={setDisputingTask}
                      onEdit={openEditModal}
                      disabled={!catAlive || !isToday}
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
                <TaskCard
                  key={t.id}
                  task={t}
                  onToggle={onToggle}
                  onDispute={setDisputingTask}
                  onEdit={openEditModal}
                  disabled={!catAlive || !isToday}
                />
              ))}
            </View>
          )}

          {dayTasks.length === 0 && (
            <Text style={styles.empty}>
              {isToday
                ? 'No tasks yet. Add one below ↓'
                : isFuture
                  ? 'No tasks planned for this day yet.'
                  : 'No tasks were added on this day.'}
            </Text>
          )}

          {!catAlive && isToday && (
            <View style={styles.deadBanner}>
              <Text style={styles.deadBannerText}>
                💀 Your cat is dead. Go to Market → buy Revive Potion (50🪙).
              </Text>
            </View>
          )}

        </ScrollView>

        {/* ── Add task form (today only) ── */}
        <View style={[styles.addBox, !isToday && { opacity: 0.35 }]}>
          {/* Priority preview */}
          {title.trim().length > 0 && (
            <View style={[styles.diffRow, { borderLeftColor: PRIORITY[autoPriority].border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <PixelPriority level={autoPriority} size={3} />
                <Text style={[styles.diffLabel, { color: PRIORITY[autoPriority].border }]}>
                  {priorityLabel(autoPriority)}
                </Text>
                <Text style={[styles.diffLabel, { color: PRIORITY[autoPriority].border }]}>·</Text>
                <PixelCoin size={2} />
                <Text style={[styles.diffLabel, { color: PRIORITY[autoPriority].border }]}>
                  {autoCoins} coins
                </Text>
              </View>
              <Text style={styles.diffHint}>auto-detected · ⚡ dispute after adding</Text>
            </View>
          )}

          {/* Title input + ADD button */}
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={title}
              onChangeText={setTitle}
              placeholder={isToday ? 'New task name...' : 'Switch to today to add'}
              placeholderTextColor={GB.dark}
              returnKeyType="done"
              onSubmitEditing={openAddModal}
              maxLength={80}
              editable={isToday}
            />
          </View>
          <TouchableOpacity
            style={[styles.addBtn, (!title.trim() || !isToday) && styles.addBtnDisabled]}
            onPress={openAddModal}
            disabled={!title.trim() || !isToday}
          >
            <Text style={styles.addBtnText}>+ ADD TASK</Text>
          </TouchableOpacity>
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

  card: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 8, marginVertical: 4, borderRadius: 5, borderLeftWidth: 4, paddingVertical: 10, paddingRight: 6, paddingLeft: 10, gap: 8, backgroundColor: '#0a1a0a', borderLeftColor: GB.dark },
  cardMissed: { borderTopWidth: 1, borderTopColor: '#CC4444' },
  cardDone: { opacity: 0.45, backgroundColor: '#070f07' },

  priorityTag: { borderWidth: 1, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2 },
  priorityTagText: { fontFamily: 'monospace', fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5 },

  cardBody: { flex: 1, gap: 4 },
  cardTitle: { fontFamily: 'monospace', fontSize: 13, color: GB.light, letterSpacing: 0.2 },
  cardTitleDone: { color: GB.dark, textDecorationLine: 'line-through' },
  cardMeta: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  cardTime: { fontFamily: 'monospace', fontSize: 10, color: GB.dark },
  repeatBadge: { fontFamily: 'monospace', fontSize: 9, color: GB.medium },
  missedBadge: { fontFamily: 'monospace', fontSize: 10, color: '#CC4444', fontWeight: 'bold' },
  cardReward: { fontFamily: 'monospace', fontSize: 10, color: GB.medium, fontWeight: 'bold' },

  cardActions: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  disputeBtn: { padding: 4 },
  disputeTxt: { fontSize: 12 },

  // Tick button
  tickBtn: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 2, borderColor: GB.dark,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0a1a0a',
  },
  tickBtnDone: { backgroundColor: GB.dark, borderColor: GB.medium },
  tickTxt: { fontFamily: 'monospace', fontSize: 16, color: GB.dark, lineHeight: 20 },
  tickTxtDone: { color: '#E8FFD0', fontWeight: 'bold' },

  empty: { fontFamily: 'monospace', fontSize: 12, color: GB.dark, textAlign: 'center', marginTop: 32 },
  noticeBanner: { margin: 12, padding: 8, borderWidth: 1, borderRadius: 4 },
  noticeBannerText: { fontFamily: 'monospace', fontSize: 11, textAlign: 'center' },
  deadBanner: { margin: 12, padding: 10, borderWidth: 1, borderColor: '#CC4444', borderRadius: 4, backgroundColor: '#1a0000' },
  deadBannerText: { fontFamily: 'monospace', fontSize: 11, color: '#FF6666', textAlign: 'center' },

  addBox: { borderTopWidth: 2, borderTopColor: GB.dark, backgroundColor: '#0a1a0a' },
  addRow: { flexDirection: 'row' },
  input: { fontFamily: 'monospace', fontSize: 13, color: GB.light, paddingHorizontal: 12, paddingVertical: 11 },
  diffRow: { paddingHorizontal: 12, paddingVertical: 5, borderTopWidth: 1, borderTopColor: GB.dark, backgroundColor: '#061006', gap: 2, borderLeftWidth: 3 },
  diffLabel: { fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold' },
  diffHint: { fontFamily: 'monospace', fontSize: 9, color: GB.dark },
  addBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, backgroundColor: GB.dark, borderTopWidth: 1, borderTopColor: GB.dark },
  addBtnDisabled: { backgroundColor: '#1a2e0a', opacity: 0.5 },
  addBtnText: { fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold', color: GB.light, letterSpacing: 2 },
});

// ─── Dispute Styles ───────────────────────────────────────────────────────────

const disputeStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
  container: { backgroundColor: '#0a1a0a', borderWidth: 2, borderColor: GB.dark, borderRadius: 10, padding: 20, width: 290, gap: 10 },
  title: { fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold', color: GB.light, letterSpacing: 2 },
  taskTitle: { fontFamily: 'monospace', fontSize: 12, color: GB.medium, lineHeight: 17 },
  autoRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  auto: { fontFamily: 'monospace', fontSize: 10, color: GB.dark },
  sub: { fontFamily: 'monospace', fontSize: 11, color: GB.dark, letterSpacing: 0.5 },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  priorityBtn: { flex: 1, borderWidth: 2, borderRadius: 6, paddingVertical: 10, alignItems: 'center', gap: 4 },
  priorityBtnText: { fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold', textAlign: 'center', letterSpacing: 1 },
  priorityCoins: { fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold' },
  closeBtn: { borderWidth: 1, borderColor: GB.dark, borderRadius: 4, paddingVertical: 8, alignItems: 'center', marginTop: 4 },
  closeBtnText: { fontFamily: 'monospace', fontSize: 11, color: GB.dark, letterSpacing: 1 },
});
