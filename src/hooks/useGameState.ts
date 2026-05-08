import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, GameState, CatState, MarketItem } from '../types';
import { REVIVAL_TASK_POOL } from '../constants/sprites';
import {
  randomCatColor, randomPersonality, getCatLevel,
} from '../constants/colors';
import {
  requestNotificationPermission, sendNotification, scheduleNightlyReminder,
} from '../utils/notifications';

const STORAGE_KEY = '@cat_task_trophe_v3';

export const MARKET_ITEMS: MarketItem[] = [
  { id: 'snack',    name: 'Cat Snack',      description: '+10 health',             cost: 15,  emoji: '🐟', effect: 'health_small',  xpReward: 5  },
  { id: 'meal',     name: 'Premium Meal',   description: '+25 health',             cost: 30,  emoji: '🍣', effect: 'health_medium', xpReward: 10 },
  { id: 'medicine', name: 'Cat Medicine',   description: '+40 health',             cost: 60,  emoji: '💊', effect: 'health_large',  xpReward: 15 },
  { id: 'catnip',   name: 'Catnip Toy',     description: 'CATNIP CRAZE for 2min', cost: 40,  emoji: '🌿', effect: 'catnip',        xpReward: 3  },
  { id: 'revive',   name: 'Revive Potion',  description: 'Bring cat back to life', cost: 120, emoji: '✨', effect: 'revive',        xpReward: 20 },
  { id: 'new_cat',  name: 'New Cat',        description: 'Fresh start (keep coins)',cost: 200, emoji: '🐱', effect: 'new_cat',      xpReward: 0  },
];

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function getCatState(health: number, alive: boolean, override: CatState | null): CatState {
  if (override) return override;
  if (!alive)       return 'deathbed';
  if (health >= 80) return 'happy';
  if (health >= 60) return 'sad';
  if (health >= 35) return 'depressed';
  if (health >= 15) return 'hospital';
  return 'deathbed';
}

const DEFAULT: GameState = {
  setupComplete: false,
  catName: 'Mittens',
  catHealth: 65,
  coins: 0,
  catAlive: true,
  catStateOverride: null,
  catnipExpiresAt: null,
  tasks: [],
  lastResetDate: todayString(),
  catColor: 'classic',
  catXP: 0,
  catPersonality: 'playful',
};

export function useGameState() {
  const [state, setState] = useState<GameState>(DEFAULT);
  const [loaded, setLoaded] = useState(false);

  // ── Load ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!raw) { setLoaded(true); return; }
      const saved: GameState = JSON.parse(raw);

      // Back-fill missing fields from older saves
      const filled: GameState = {
        catColor: 'classic',
        catXP: 0,
        catPersonality: 'playful',
        ...saved,
      };

      // Expire catnip
      let override = filled.catStateOverride;
      if (filled.catnipExpiresAt && new Date(filled.catnipExpiresAt) < new Date()) {
        override = null;
      }

      // Daily reset
      let tasks = filled.tasks;
      if (filled.lastResetDate !== todayString()) {
        const completedYesterday = tasks.filter(t => !t.isRevival && t.completed).length;
        const total = tasks.filter(t => !t.isRevival).length;
        const ratio = total === 0 ? 1 : completedYesterday / total;

        let healthDelta = 0;
        let xpBonus = 0;
        if (ratio >= 0.8)       { healthDelta = +15; xpBonus = 20; }
        else if (ratio >= 0.5)  { healthDelta = 0;   xpBonus = 10; }
        else if (ratio >= 0.2)  { healthDelta = -20; xpBonus = 0;  }
        else                    { healthDelta = -35; xpBonus = 0;  }

        const newHealth = clamp(filled.catHealth + healthDelta, 0, 100);
        const alive = newHealth > 0;

        tasks = filled.tasks
          .filter(t => !t.isRevival)
          .map(t => ({ ...t, completed: false, completedAt: undefined, latePenaltyApplied: false }));

        setState({
          ...filled,
          tasks,
          catHealth: newHealth,
          catAlive: alive,
          catStateOverride: override,
          catnipExpiresAt: override ? filled.catnipExpiresAt : null,
          lastResetDate: todayString(),
          catXP: filled.catXP + xpBonus,
        });
        setLoaded(true);
        return;
      }

      setState({ ...filled, catStateOverride: override });
      setLoaded(true);
    });
  }, []);

  // ── Persist ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, loaded]);

  // ── Notifications bootstrap ───────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    requestNotificationPermission().then(granted => {
      if (granted) scheduleNightlyReminder();
    });
  }, [loaded]);

  // ── Actions ───────────────────────────────────────────────────────────────────
  const completeSetup = useCallback((catName: string, tasks: Task[]) => {
    setState(prev => ({
      ...prev,
      setupComplete: true,
      catName,
      tasks,
      catColor: randomCatColor(),
      catPersonality: randomPersonality(),
    }));
  }, []);

  const addTask = useCallback((task: Omit<Task, 'id' | 'completed' | 'createdAt'>) => {
    setState(prev => ({
      ...prev,
      tasks: [...prev.tasks, {
        ...task,
        id: Date.now().toString(),
        completed: false,
        createdAt: new Date().toISOString(),
      }],
    }));
  }, []);

  const toggleTask = useCallback((id: string) => {
    setState(prev => {
      if (!prev.catAlive) return prev;

      const tasks = prev.tasks.map(t =>
        t.id === id
          ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : undefined }
          : t
      );
      const task = tasks.find(t => t.id === id)!;

      // Revival task completion
      if (task.isRevival) {
        const revivalDone = tasks.filter(t => t.isRevival && t.completed).length;
        const revivalTotal = tasks.filter(t => t.isRevival).length;
        if (revivalDone >= revivalTotal) {
          return {
            ...prev,
            tasks: tasks.filter(t => !t.isRevival).map(t => ({ ...t, completed: false })),
            catHealth: 55,
          };
        }
        return { ...prev, tasks };
      }

      // Regular / special — coins only, health only changes via market
      const delta = task.completed ? task.reward : -task.reward;
      return { ...prev, tasks, coins: clamp(prev.coins + delta, 0, 9999) };
    });
  }, []);

  const deleteTask = useCallback((id: string) => {
    setState(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }));
  }, []);

  const startRevival = useCallback(() => {
    const pool = [...REVIVAL_TASK_POOL].sort(() => Math.random() - 0.5).slice(0, 5);
    const revivalTasks: Task[] = pool.map((title, i) => ({
      id: `revival_${Date.now()}_${i}`,
      title,
      category: 'Revival',
      scheduledTime: '',
      reward: 0,
      completed: false,
      isRecurring: false,
      isSpecial: false,
      isRevival: true,
      createdAt: new Date().toISOString(),
    }));
    setState(prev => ({
      ...prev,
      tasks: [...prev.tasks.filter(t => !t.isRevival), ...revivalTasks],
    }));
  }, []);

  const applyRandomEvent = useCallback((healthDelta: number, coinDelta: number) => {
    setState(prev => {
      if (!prev.catAlive) return prev;
      const newHealth = clamp(prev.catHealth + healthDelta, 0, 100);
      return {
        ...prev,
        catHealth: newHealth,
        catAlive: newHealth > 0,
        coins: clamp(prev.coins + coinDelta, 0, 9999),
      };
    });
  }, []);

  const buyItem = useCallback((itemId: string): string => {
    const item = MARKET_ITEMS.find(m => m.id === itemId);
    if (!item) return 'Item not found.';

    let result = '';
    setState(prev => {
      if (prev.coins < item.cost) {
        result = `Need ${item.cost}🪙, have ${prev.coins}🪙.`;
        return prev;
      }
      const coins = prev.coins - item.cost;
      let patch: Partial<GameState> = {
        coins,
        catXP: prev.catXP + item.xpReward,
      };

      switch (item.effect) {
        case 'health_small':  patch.catHealth = clamp(prev.catHealth + 10, 0, 100); break;
        case 'health_medium': patch.catHealth = clamp(prev.catHealth + 25, 0, 100); break;
        case 'health_large':  patch.catHealth = clamp(prev.catHealth + 40, 0, 100); break;
        case 'revive':
          if (!prev.catAlive || prev.catHealth < 10) {
            patch.catHealth = 50;
            patch.catAlive  = true;
            patch.tasks     = prev.tasks.filter(t => !t.isRevival);
          } else {
            result = 'Your cat is still alive!';
            return prev;
          }
          break;
        case 'new_cat':
          patch.catHealth      = 65;
          patch.catAlive       = true;
          patch.catXP          = 0;
          patch.tasks          = prev.tasks.filter(t => !t.isRevival);
          patch.catStateOverride = null;
          patch.catColor       = randomCatColor();
          patch.catPersonality = randomPersonality();
          break;
        case 'catnip': {
          const expires = new Date(Date.now() + 2 * 60 * 1000).toISOString();
          patch.catStateOverride = 'cocaine';
          patch.catnipExpiresAt  = expires;
          break;
        }
      }

      result = `${item.emoji} ${item.name} purchased!`;
      return { ...prev, ...patch };
    });

    return result;
  }, []);

  // ── Missed-task health drain ──────────────────────────────────────────────────
  useEffect(() => {
    function checkMissedTasks() {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      setState(prev => {
        if (!prev.catAlive) return prev;

        let healthDelta = 0;
        let missCount = 0;
        const tasks = prev.tasks.map(t => {
          if (t.completed || t.isRevival || !t.scheduledTime || t.latePenaltyApplied) return t;
          const [h, m] = t.scheduledTime.split(':').map(Number);
          if (isNaN(h) || isNaN(m)) return t;
          if (currentMinutes >= h * 60 + m + 10) {
            healthDelta -= 5;
            missCount++;
            return { ...t, latePenaltyApplied: true };
          }
          return t;
        });

        if (healthDelta === 0) return prev;

        // Fire a guilt notification
        sendNotification(
          '😿 Your cat is suffering!',
          `${missCount} overdue task${missCount > 1 ? 's are' : ' is'} hurting ${prev.catName}. Do it now!`,
          'missed-task'
        );

        const newHealth = clamp(prev.catHealth + healthDelta, 0, 100);
        return { ...prev, tasks, catHealth: newHealth, catAlive: newHealth > 0 };
      });
    }

    if (loaded) checkMissedTasks();
    const id = setInterval(checkMissedTasks, 60_000);
    return () => clearInterval(id);
  }, [loaded]);

  // ── Catnip expiry ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!state.catnipExpiresAt || !state.catStateOverride) return;
    const ms = new Date(state.catnipExpiresAt).getTime() - Date.now();
    if (ms <= 0) {
      setState(prev => ({ ...prev, catStateOverride: null, catnipExpiresAt: null }));
      return;
    }
    const t = setTimeout(() => {
      setState(prev => ({ ...prev, catStateOverride: null, catnipExpiresAt: null }));
    }, ms);
    return () => clearTimeout(t);
  }, [state.catnipExpiresAt]);

  // ── Derived ───────────────────────────────────────────────────────────────────
  const regularTasks   = state.tasks.filter(t => !t.isRevival && !t.isSpecial);
  const specialTasks   = state.tasks.filter(t => t.isSpecial && !t.isRevival);
  const revivalTasks   = state.tasks.filter(t => t.isRevival);
  const completedToday = state.tasks.filter(t => !t.isRevival && t.completed).length;
  const totalTasks     = state.tasks.filter(t => !t.isRevival).length;
  const catState       = getCatState(state.catHealth, state.catAlive, state.catStateOverride);
  const hasRevivalTasks = revivalTasks.length > 0;
  const revivalProgress = revivalTasks.filter(t => t.completed).length;
  const catLevel        = getCatLevel(state.catXP);

  return {
    loaded,
    state,
    catState,
    catHealth: state.catHealth,
    coins: state.coins,
    catAlive: state.catAlive,
    catName: state.catName,
    catColor: state.catColor,
    catXP: state.catXP,
    catLevel,
    catPersonality: state.catPersonality,
    setupComplete: state.setupComplete,
    regularTasks,
    specialTasks,
    revivalTasks,
    hasRevivalTasks,
    revivalProgress,
    completedToday,
    totalTasks,
    completeSetup,
    addTask,
    toggleTask,
    deleteTask,
    startRevival,
    buyItem,
    applyRandomEvent,
  };
}
