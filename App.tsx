import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import CatScreen, { RandomEventDisplay } from './src/screens/CatScreen';
import TaskScreen from './src/screens/TaskScreen';
import MarketScreen from './src/screens/MarketScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import HauntedOverlay from './src/components/HauntedOverlay';
import { useGameState, MARKET_ITEMS } from './src/hooks/useGameState';
import { rollRandomEvent } from './src/utils/randomEvents';
import { sendNotification } from './src/utils/notifications';
import { playClick, startBGM, stopBGM } from './src/utils/sound';
import { GB } from './src/constants/colors';
import { TaskPriority } from './src/types';

type Tab = 'cat' | 'tasks' | 'market';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('cat');
  const [pendingEvent, setPendingEvent] = useState<RandomEventDisplay | null>(null);
  const hasRolledRef = useRef(false);
  const game = useGameState();

  // ── Random event ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!game.loaded || hasRolledRef.current || activeTab !== 'cat') return;
    hasRolledRef.current = true;

    const t = setTimeout(() => {
      const event = rollRandomEvent({
        coins:       game.coins,
        health:      game.catHealth,
        catAlive:    game.catAlive,
        catState:    game.catState,
        catName:     game.catName,
        personality: game.catPersonality,
      });
      if (!event) return;
      game.applyRandomEvent(event.healthDelta, event.coinDelta);
      if (event.type === 'dog_attack') sendNotification('🐕 Dog Attack!', event.message, 'dog-attack');
      setPendingEvent({
        type: event.type, emoji: event.emoji,
        title: event.title, message: event.message, color: event.bannerColor,
      });
    }, 1200);

    return () => clearTimeout(t);
  }, [activeTab, game.loaded]);

  // ── BGM — app-level so it survives tab switches ───────────────────────────────
  useEffect(() => {
    if (!game.loaded) return;
    if (game.bgmEnabled) startBGM(); else stopBGM();
    return () => stopBGM();
  }, [game.bgmEnabled, game.loaded]);

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (!game.loaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={GB.light} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // ── Onboarding ────────────────────────────────────────────────────────────────
  if (!game.setupComplete) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={GB.darkest} />
        <OnboardingScreen onComplete={game.completeSetup} />
      </SafeAreaProvider>
    );
  }

  function handleAddTask(title: string, time: string, priority: TaskPriority, coins: number, taskDate: string) {
    game.addTask({
      title,
      category:      'Custom',
      scheduledTime: time,
      reward:        coins,
      priority,
      taskDate,
      isRecurring:   false,
      isSpecial:     false,
      isRevival:     false,
    });
  }

  const needsAttention =
    !game.catAlive || game.catState === 'hospital' || game.catState === 'deathbed';

  function switchTab(tab: Tab) { playClick(); setActiveTab(tab); }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={GB.darkest} />

      <View style={styles.root}>
        <View style={{ flex: 1 }}>
          {activeTab === 'cat' && (
            <CatScreen
              catState={game.catState}
              catHealth={game.catHealth}
              catHunger={game.catHunger}
              catName={game.catName}
              coins={game.coins}
              completedToday={game.completedToday}
              totalTasks={game.totalTasks}
              catAlive={game.catAlive}
              catColor={game.catColor}
              catXP={game.catXP}
              catLevel={game.catLevel}
              catPersonality={game.catPersonality}
              pendingEvent={pendingEvent}
              foodQueue={game.foodQueue}
              sfxEnabled={game.sfxEnabled}
              bgmEnabled={game.bgmEnabled}
              onGoToTasks={() => switchTab('tasks')}
              onGoToMarket={() => switchTab('market')}
              onEventDismissed={() => setPendingEvent(null)}
              onFeedCat={game.feedCat}
              onToggleSFX={game.toggleSFX}
              onToggleBGM={game.toggleBGM}
            />
          )}

          {activeTab === 'tasks' && (
            <TaskScreen
              regularTasks={game.regularTasks}
              catHealth={game.catHealth}
              catAlive={game.catAlive}
              onToggle={game.toggleTask}
              onDelete={game.deleteTask}
              onDisputePriority={game.disputePriority}
              onAdd={handleAddTask}
            />
          )}

          {activeTab === 'market' && (
            <MarketScreen
              items={MARKET_ITEMS}
              coins={game.coins}
              catAlive={game.catAlive}
              onBuy={game.buyItem}
            />
          )}
        </View>

        {/* ── Haunted Mode Overlay (when cat is dead) ── */}
        {!game.catAlive && <HauntedOverlay />}

        {/* Tab bar */}
        <SafeAreaView edges={['bottom']} style={styles.tabBar}>
          <TabButton label="CAT"    icon="=^.^=" active={activeTab === 'cat'}    onPress={() => switchTab('cat')}    alert={needsAttention} />
          <TabButton label="TASKS"  icon="[///]" active={activeTab === 'tasks'}  onPress={() => switchTab('tasks')} />
          <TabButton label="MARKET" icon="[🛒]"  active={activeTab === 'market'} onPress={() => switchTab('market')} alert={!game.catAlive} />
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}

interface TabButtonProps {
  label: string; icon: string; active: boolean; onPress: () => void; alert?: boolean;
}
function TabButton({ label, icon, active, onPress, alert }: TabButtonProps) {
  return (
    <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
      <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{icon}</Text>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
      {alert && <View style={styles.alertDot} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GB.darkest },
  loading: { flex: 1, backgroundColor: GB.darkest, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: 'monospace', color: GB.light, fontSize: 14 },
  tabBar: { flexDirection: 'row', backgroundColor: '#0a200a', borderTopWidth: 2, borderTopColor: GB.dark },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 2, position: 'relative' },
  tabActive: { backgroundColor: GB.darkest },
  tabIcon: { fontFamily: 'monospace', fontSize: 14, color: GB.dark },
  tabIconActive: { color: GB.light },
  tabLabel: { fontFamily: 'monospace', fontSize: 10, color: GB.dark, letterSpacing: 1 },
  tabLabelActive: { color: GB.medium },
  alertDot: { position: 'absolute', top: 8, right: '22%', width: 8, height: 8, borderRadius: 4, backgroundColor: '#CC4444' },
});
