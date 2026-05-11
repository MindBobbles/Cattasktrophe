import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Task } from '../types';
import { GB } from '../constants/colors';

interface Props {
  onComplete: (catName: string, tasks: Task[]) => void;
}

export default function OnboardingScreen({ onComplete }: Props) {
  const [catName, setCatName] = useState('');

  function handleFinish() {
    const name = catName.trim();
    if (!name) return;
    // Start with no preset tasks — user builds their own routine
    onComplete(name, []);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.logo}>CAT-TASK-TROPHE</Text>
        <Text style={styles.tagline}>your productivity. their life.</Text>

        <View style={styles.catPreview}>
          <Text style={styles.catArt}>
            {'  /\\_/\\  \n'}
            {' ( o.o ) \n'}
            {'  > ^ <  \n'}
            {'  |   |  '}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.question}>What will you name your cat?</Text>
          <Text style={styles.hint}>
            Choose wisely — this cat is counting on you.{'\n'}
            Complete tasks to keep them healthy and happy.{'\n'}
            Skip tasks and they suffer.
          </Text>

          <TextInput
            style={styles.input}
            value={catName}
            onChangeText={setCatName}
            placeholder="e.g. Mittens, Sir Fluffington..."
            placeholderTextColor={GB.dark}
            maxLength={20}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleFinish}
          />

          <TouchableOpacity
            style={[styles.btn, !catName.trim() && styles.btnDisabled]}
            onPress={handleFinish}
            disabled={!catName.trim()}
          >
            <Text style={styles.btnText}>
              {catName.trim()
                ? `MEET ${catName.trim().toUpperCase()} →`
                : 'NAME YOUR CAT FIRST'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Add tasks in the TASKS tab to earn coins and keep your cat alive.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: GB.darkest },
  scroll: {
    flexGrow: 1, padding: 24, gap: 20,
    alignItems: 'center', justifyContent: 'center', paddingBottom: 48,
  },

  logo: {
    fontFamily: 'monospace', fontSize: 18, fontWeight: 'bold',
    color: GB.light, letterSpacing: 2, textAlign: 'center',
  },
  tagline: {
    fontFamily: 'monospace', fontSize: 11, color: GB.dark,
    textAlign: 'center', letterSpacing: 1,
  },

  catPreview: {
    backgroundColor: '#1a3a1a', borderWidth: 3, borderColor: GB.dark,
    borderRadius: 12, paddingVertical: 20, paddingHorizontal: 32,
    alignItems: 'center',
  },
  catArt: {
    fontFamily: 'monospace', fontSize: 18, color: GB.light,
    lineHeight: 26, textAlign: 'center',
  },

  card: {
    width: '100%', backgroundColor: '#0a200a',
    borderWidth: 2, borderColor: GB.dark, borderRadius: 8,
    padding: 20, gap: 14,
  },
  question: {
    fontFamily: 'monospace', fontSize: 15, fontWeight: 'bold',
    color: GB.light, letterSpacing: 0.5,
  },
  hint: {
    fontFamily: 'monospace', fontSize: 11, color: GB.dark, lineHeight: 18,
  },
  input: {
    fontFamily: 'monospace', fontSize: 14, color: GB.light,
    borderWidth: 2, borderColor: GB.dark, borderRadius: 4,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  btn: {
    backgroundColor: GB.dark, borderRadius: 4,
    paddingVertical: 14, alignItems: 'center',
  },
  btnDisabled: { backgroundColor: '#1a2e0a', opacity: 0.4 },
  btnText: {
    fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold',
    color: GB.light, letterSpacing: 2,
  },

  footer: {
    fontFamily: 'monospace', fontSize: 10, color: GB.dark,
    textAlign: 'center', letterSpacing: 0.5, paddingHorizontal: 10,
    lineHeight: 16,
  },
});
