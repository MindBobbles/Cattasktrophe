import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Task } from '../types';
import { GB } from '../constants/colors';

interface Props {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}

export default function TaskItem({ task, onToggle, onDelete, disabled }: Props) {
  const isRevival = task.isRevival;
  const isSpecial = task.isSpecial;

  return (
    <View style={[styles.row, isRevival && styles.revivalRow, isSpecial && styles.specialRow]}>
      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => !disabled && onToggle(task.id)}
        disabled={disabled}
      >
        <View style={[styles.box, task.completed && styles.boxChecked, isRevival && styles.boxRevival]}>
          {task.completed && <Text style={styles.tick}>✓</Text>}
        </View>
      </TouchableOpacity>

      <View style={styles.info}>
        <Text
          style={[
            styles.title,
            task.completed && styles.titleDone,
            isRevival && styles.revivalTitle,
            isSpecial && styles.specialTitle,
          ]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        <View style={styles.meta}>
          {task.scheduledTime ? (
            <Text style={styles.time}>⏰ {task.scheduledTime}</Text>
          ) : null}
          {!isRevival && (
            <Text style={[styles.reward, task.completed && styles.rewardDone]}>
              +{task.reward}🪙
            </Text>
          )}
          {isSpecial && <Text style={styles.specialBadge}>SPECIAL</Text>}
        </View>
      </View>

      {!isRevival && (
        <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(task.id)}>
          <Text style={styles.deleteText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: GB.dark,
    gap: 10,
  },
  revivalRow: { backgroundColor: '#1a0a0a' },
  specialRow: { backgroundColor: '#0a1a2a' },
  checkbox: { padding: 2 },
  box: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: GB.medium,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
  },
  boxChecked: { backgroundColor: GB.dark, borderColor: GB.light },
  boxRevival: { borderColor: '#CC4444' },
  tick: { color: GB.light, fontSize: 12, fontFamily: 'monospace', lineHeight: 16 },
  info: { flex: 1, gap: 3 },
  title: { fontFamily: 'monospace', fontSize: 13, color: GB.light, letterSpacing: 0.2 },
  titleDone: { textDecorationLine: 'line-through', color: GB.dark },
  revivalTitle: { color: '#FF9090', fontStyle: 'italic' },
  specialTitle: { color: '#90C8FF' },
  meta: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  time: { fontFamily: 'monospace', fontSize: 11, color: GB.dark },
  reward: { fontFamily: 'monospace', fontSize: 11, color: GB.medium, fontWeight: 'bold' },
  rewardDone: { color: GB.dark },
  specialBadge: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#90C8FF',
    borderWidth: 1,
    borderColor: '#90C8FF',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  deleteBtn: { padding: 6 },
  deleteText: { color: GB.dark, fontSize: 13, fontFamily: 'monospace' },
});
