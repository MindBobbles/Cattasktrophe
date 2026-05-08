import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, SafeAreaView,
} from 'react-native';
import { Task } from '../types';
import { ROUTINE_PRESETS, PresetTask } from '../constants/taskLibrary';
import { GB } from '../constants/colors';

interface Props {
  onComplete: (catName: string, tasks: Task[]) => void;
}

type Step = 'name' | 'tasks' | 'times';

export default function OnboardingScreen({ onComplete }: Props) {
  const [step, setStep] = useState<Step>('name');
  const [catName, setCatName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [times, setTimes] = useState<Record<string, string>>({});

  function togglePreset(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleNameNext() {
    if (!catName.trim()) return;
    setStep('tasks');
  }

  const MIN_TASKS = 4;

  function handleTasksNext() {
    if (selected.size < MIN_TASKS) return;
    const initTimes: Record<string, string> = {};
    ROUTINE_PRESETS.filter(p => selected.has(p.id)).forEach(p => {
      initTimes[p.id] = p.defaultTime;
    });
    setTimes(initTimes);
    setStep('times');
  }

  function handleFinish() {
    const tasks: Task[] = ROUTINE_PRESETS
      .filter(p => selected.has(p.id))
      .map(p => ({
        id: `routine_${p.id}`,
        title: `${p.emoji} ${p.title}`,
        category: p.category,
        scheduledTime: times[p.id] ?? p.defaultTime,
        reward: p.reward,
        completed: false,
        isRecurring: true,
        isSpecial: false,
        isRevival: false,
        createdAt: new Date().toISOString(),
      }));
    onComplete(catName.trim(), tasks);
  }

  const selectedPresets = ROUTINE_PRESETS.filter(p => selected.has(p.id));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <Text style={styles.logo}>CAT-TASK-TROPHE</Text>
        <Text style={styles.tagline}>your productivity. their life.</Text>

        {/* ── STEP 1: Cat name ── */}
        {step === 'name' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>STEP 1 / 3</Text>
            <Text style={styles.question}>What will you name your cat?</Text>
            <Text style={styles.hint}>
              Choose wisely. This cat is counting on you.
            </Text>
            <TextInput
              style={styles.input}
              value={catName}
              onChangeText={setCatName}
              placeholder="e.g. Mittens, Sir Fluffington..."
              placeholderTextColor={GB.dark}
              maxLength={20}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.btn, !catName.trim() && styles.btnDisabled]}
              onPress={handleNameNext}
              disabled={!catName.trim()}
            >
              <Text style={styles.btnText}>NEXT →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 2: Select tasks ── */}
        {step === 'tasks' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>STEP 2 / 3</Text>
            <Text style={styles.question}>
              What does your daily routine look like?
            </Text>
            <Text style={styles.hint}>
              Select at least {MIN_TASKS} recurring daily tasks.{'\n'}
              {catName} will suffer the more you skip them.{'\n'}
              Selected: {selected.size} / {MIN_TASKS} minimum
            </Text>

            {['Morning', 'Work', 'Midday', 'Evening', 'Night'].map(cat => {
              const items = ROUTINE_PRESETS.filter(p => p.category === cat);
              return (
                <View key={cat} style={styles.category}>
                  <Text style={styles.catLabel}>{cat.toUpperCase()}</Text>
                  {items.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.preset, selected.has(p.id) && styles.presetSelected]}
                      onPress={() => togglePreset(p.id)}
                    >
                      <Text style={styles.presetEmoji}>{p.emoji}</Text>
                      <Text style={[styles.presetTitle, selected.has(p.id) && styles.presetTitleSelected]}>
                        {p.title}
                      </Text>
                      <Text style={styles.presetReward}>+{p.reward}🪙</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })}

            <TouchableOpacity
              style={[styles.btn, selected.size < MIN_TASKS && styles.btnDisabled]}
              onPress={handleTasksNext}
              disabled={selected.size < MIN_TASKS}
            >
              <Text style={styles.btnText}>
                {selected.size < MIN_TASKS
                  ? `NEED ${MIN_TASKS - selected.size} MORE`
                  : 'SET TIMES →'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 3: Customise times ── */}
        {step === 'times' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>STEP 3 / 3</Text>
            <Text style={styles.question}>Customise your schedule</Text>
            <Text style={styles.hint}>
              Adjust task times to fit your routine.{'\n'}
              Use HH:MM format (24hr).
            </Text>

            {selectedPresets.map(p => (
              <View key={p.id} style={styles.timeRow}>
                <Text style={styles.timeEmoji}>{p.emoji}</Text>
                <Text style={styles.timeTitle}>{p.title}</Text>
                <TextInput
                  style={styles.timeInput}
                  value={times[p.id] ?? p.defaultTime}
                  onChangeText={v => setTimes(prev => ({ ...prev, [p.id]: v }))}
                  placeholder="HH:MM"
                  placeholderTextColor={GB.dark}
                  maxLength={5}
                  keyboardType="numeric"
                />
              </View>
            ))}

            <TouchableOpacity style={styles.btn} onPress={handleFinish}>
              <Text style={styles.btnText}>MEET {catName.toUpperCase()} →</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: GB.darkest },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },
  logo: {
    fontFamily: 'monospace', fontSize: 18, fontWeight: 'bold',
    color: GB.light, letterSpacing: 2, textAlign: 'center', marginTop: 16,
  },
  tagline: {
    fontFamily: 'monospace', fontSize: 11, color: GB.dark,
    textAlign: 'center', letterSpacing: 1, marginBottom: 8,
  },
  card: {
    backgroundColor: '#0a200a', borderWidth: 2,
    borderColor: GB.dark, borderRadius: 8, padding: 16, gap: 12,
  },
  cardTitle: {
    fontFamily: 'monospace', fontSize: 11, color: GB.dark, letterSpacing: 2,
  },
  question: {
    fontFamily: 'monospace', fontSize: 15, fontWeight: 'bold',
    color: GB.light, letterSpacing: 0.5,
  },
  hint: {
    fontFamily: 'monospace', fontSize: 12, color: GB.dark,
    lineHeight: 18,
  },
  input: {
    fontFamily: 'monospace', fontSize: 14, color: GB.light,
    borderWidth: 2, borderColor: GB.dark, borderRadius: 4,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  btn: {
    backgroundColor: GB.dark, borderRadius: 4,
    paddingVertical: 12, alignItems: 'center', marginTop: 4,
  },
  btnDisabled: { backgroundColor: '#1a2e0a', opacity: 0.5 },
  btnText: {
    fontFamily: 'monospace', fontSize: 14, fontWeight: 'bold',
    color: GB.light, letterSpacing: 2,
  },
  category: { gap: 6 },
  catLabel: {
    fontFamily: 'monospace', fontSize: 10, color: GB.dark, letterSpacing: 2,
  },
  preset: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: GB.dark, borderRadius: 4,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  presetSelected: { borderColor: GB.medium, backgroundColor: '#1a3a1a' },
  presetEmoji: { fontSize: 16 },
  presetTitle: { flex: 1, fontFamily: 'monospace', fontSize: 13, color: GB.dark },
  presetTitleSelected: { color: GB.light },
  presetReward: { fontFamily: 'monospace', fontSize: 11, color: GB.medium },
  timeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: GB.darkest,
  },
  timeEmoji: { fontSize: 16 },
  timeTitle: { flex: 1, fontFamily: 'monospace', fontSize: 12, color: GB.medium },
  timeInput: {
    fontFamily: 'monospace', fontSize: 13, color: GB.light,
    borderWidth: 1, borderColor: GB.dark, borderRadius: 3,
    paddingHorizontal: 8, paddingVertical: 4, width: 60, textAlign: 'center',
  },
});
