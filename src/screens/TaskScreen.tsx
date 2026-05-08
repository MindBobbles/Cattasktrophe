import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TaskItem from '../components/TaskItem';
import { Task } from '../types';
import { GB } from '../constants/colors';
import { predictDifficulty, difficultyLabel } from '../utils/difficultyPredictor';

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
  const [title, setTitle]         = useState('');
  const [time, setTime]           = useState('');
  const [isSpecial, setIsSpecial] = useState(false);

  const predictedCoins = useMemo(() => predictDifficulty(title), [title]);
  const diffLabel      = useMemo(() => difficultyLabel(predictedCoins), [predictedCoins]);

  function handleAdd() {
    const t = title.trim();
    if (!t) return;
    onAdd(t, time.trim(), isSpecial, predictedCoins);
    setTitle('');
    setTime('');
    setIsSpecial(false);
  }

  const total = regularTasks.length + specialTasks.length;
  const pct   = total === 0 ? 0 : Math.round((completedToday / total) * 100);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>DAILY TASKS</Text>
          <Text style={styles.headerSub}>
            {completedToday}/{total} done · {pct}% · HP {catHealth}
          </Text>
        </View>

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">

          {/* ── Revival tasks ── */}
          {hasRevivalTasks && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionRevival}>✚  REVIVAL TASKS  ({revivalProgress}/5)</Text>
              </View>
              {revivalTasks.map(t => (
                <TaskItem key={t.id} task={t} onToggle={onToggle} onDelete={onDelete} disabled={!catAlive} />
              ))}
            </>
          )}

          {/* ── Regular tasks ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>ROUTINE</Text>
          </View>
          {regularTasks.length === 0 ? (
            <Text style={styles.empty}>No routine tasks. Add one below.</Text>
          ) : (
            regularTasks.map(t => (
              <TaskItem key={t.id} task={t} onToggle={onToggle} onDelete={onDelete} disabled={!catAlive} />
            ))
          )}

          {/* ── Special tasks ── */}
          {(specialTasks.length > 0 || true) && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionSpecial}>★  SPECIAL TASKS</Text>
              </View>
              {specialTasks.length === 0 ? (
                <Text style={styles.empty}>No special tasks yet.</Text>
              ) : (
                specialTasks.map(t => (
                  <TaskItem key={t.id} task={t} onToggle={onToggle} onDelete={onDelete} disabled={!catAlive} />
                ))
              )}
            </>
          )}

          {/* Dead-cat warning */}
          {!catAlive && (
            <View style={styles.deadWarning}>
              <Text style={styles.deadWarningText}>
                Your cat is dead. Go to Market to revive them.
              </Text>
            </View>
          )}

        </ScrollView>

        {/* Add task input */}
        <View style={styles.addBox}>
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Task title..."
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
              <Text style={styles.diffLabel}>
                {diffLabel}  ·  🪙 {predictedCoins} coins
              </Text>
            </View>
          )}

          <View style={styles.addActions}>
            <TouchableOpacity
              style={[styles.specialToggle, isSpecial && styles.specialToggleOn]}
              onPress={() => setIsSpecial(v => !v)}
            >
              <Text style={[styles.specialToggleText, isSpecial && styles.specialToggleTextOn]}>
                {isSpecial ? '★ SPECIAL' : '☆ SPECIAL'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, !title.trim() && styles.addBtnDisabled]}
              onPress={handleAdd}
              disabled={!title.trim()}
            >
              <Text style={styles.addBtnText}>ADD →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: GB.darkest },

  header: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10,
    borderBottomWidth: 2, borderBottomColor: GB.dark, gap: 4,
  },
  headerTitle: {
    fontFamily: 'monospace', fontSize: 16, fontWeight: 'bold',
    color: GB.light, letterSpacing: 2,
  },
  headerSub: {
    fontFamily: 'monospace', fontSize: 12, color: GB.medium, letterSpacing: 0.5,
  },

  sectionHeader: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderBottomWidth: 1, borderBottomColor: GB.dark,
    backgroundColor: '#0a1a0a',
  },
  sectionLabel: {
    fontFamily: 'monospace', fontSize: 10, color: GB.dark, letterSpacing: 2,
  },
  sectionRevival: {
    fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold',
    color: '#CC4444', letterSpacing: 1,
  },
  sectionSpecial: {
    fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold',
    color: '#90C8FF', letterSpacing: 1,
  },

  empty: {
    fontFamily: 'monospace', fontSize: 12, color: GB.dark,
    textAlign: 'center', marginTop: 16, marginBottom: 8,
  },

  deadWarning: {
    margin: 16, padding: 12, borderWidth: 1, borderColor: '#CC4444', borderRadius: 4,
    backgroundColor: '#1a0000',
  },
  deadWarningText: {
    fontFamily: 'monospace', fontSize: 12, color: '#FF6666', textAlign: 'center',
  },

  addBox: {
    borderTopWidth: 2, borderTopColor: GB.dark, backgroundColor: '#0a1a0a', gap: 0,
  },
  addRow: { flexDirection: 'row' },
  input: {
    fontFamily: 'monospace', fontSize: 13, color: GB.light,
    paddingHorizontal: 12, paddingVertical: 12,
    borderRightWidth: 1, borderRightColor: GB.dark,
  },
  timeInput: { width: 72, textAlign: 'center' },
  diffRow: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderTopWidth: 1, borderTopColor: GB.dark, backgroundColor: '#061006',
  },
  diffLabel: {
    fontFamily: 'monospace', fontSize: 11, color: GB.medium, letterSpacing: 0.3,
  },
  addActions: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: GB.dark,
  },
  specialToggle: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRightWidth: 1, borderRightColor: GB.dark,
  },
  specialToggleOn: { backgroundColor: '#0a1a2a' },
  specialToggleText: {
    fontFamily: 'monospace', fontSize: 11, color: GB.dark, letterSpacing: 1,
  },
  specialToggleTextOn: { color: '#90C8FF' },
  addBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, backgroundColor: GB.dark,
  },
  addBtnDisabled: { backgroundColor: '#1a2e0a', opacity: 0.5 },
  addBtnText: {
    fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold',
    color: GB.light, letterSpacing: 2,
  },
});
