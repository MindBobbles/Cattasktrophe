import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, TaskPriority, GameState, CatState, MarketItem, QueuedFood } from '../types';
import {
  randomCatColor, randomPersonality, getCatLevel,
} from '../constants/colors';
import {
  requestNotificationPermission, sendNotification, scheduleNightlyReminder,
} from '../utils/notifications';
import { setSFXEnabled } from '../utils/sound';

const STORAGE_KEY = '@cat_task_trophe_v3';

export const MARKET_ITEMS: MarketItem[] = [
  { id: 'snack',    name: 'Cat Snack',     description: '+30 hunger',             cost: 15,  emoji: '🐟', effect: 'hunger_small',  xpReward: 5  },
  { id: 'meal',     name: 'Premium Meal',  description: '+60 hunger',             cost: 30,  emoji: '🍣', effect: 'hunger_medium', xpReward: 10 },
  { id: 'medicine', name: 'Cat Medicine',  description: '+50 HP (direct)',        cost: 30,  emoji: '💊', effect: 'health_direct',  xpReward: 15 },
  { id: 'catnip',   name: 'Catnip Toy',    description: 'CATNIP CRAZE for 2min', cost: 40,  emoji: '🌿', effect: 'catnip',         xpReward: 3  },
  { id: 'revive',   name: 'Revive Potion', description: 'Bring cat back to life', cost: 50,  emoji: '✨', effect: 'revive',         xpReward: 20 },
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
  catHealth: 80,
  catHunger: 80,
  coins: 0,
  catAlive: true,
  catStateOverride: null,
  catnipExpiresAt: null,
  tasks: [],
  lastResetDate: todayString(),
  catColor: 'classic',
  catXP: 0,
  catPersonality: 'playful',
  foodQueue: [],
  sfxEnabled: true,
  bgmEnabled: true,
};

export function useGameState() {
  const [state, setState] = useState<GameState>(DEFAULT);
  const [loaded, setLoaded] = useState(false);

  // ── Load ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!raw) { setLoaded(true); return; }
      const saved: any = JSON.parse(raw);

      // Back-fill missing fields from older saves
      const filled: GameState = {
        catColor: 'classic',
        catXP: 0,
        catPersonality: 'playful',
        foodQueue: [],
        catHunger: 80,
        sfxEnabled: true,
        bgmEnabled: true,
        ...saved,
      };

      // Migrate food queue items to new schema (hunger + health)
      filled.foodQueue = (filled.foodQueue ?? []).map((f: any) => ({
        id: f.id,
        itemId: f.itemId ?? '',
        name: f.name ?? '',
        emoji: f.emoji ?? '🍽️',
        hunger: typeof f.hunger === 'number' ? f.hunger : 0,
        health: typeof f.health === 'number' && !f.hunger ? f.health : (typeof f.health === 'number' ? f.health : 0),
      }));

      // Filter out isRevival and isSpecial tasks (features removed)
      filled.tasks = filled.tasks.filter((t: Task) => !t.isRevival && !t.isSpecial);

      // Expire catnip
      let override = filled.catStateOverride;
      if (filled.catnipExpiresAt && new Date(filled.catnipExpiresAt) < new Date()) {
        override = null;
      }

      // Apply sound settings from saved state
      setSFXEnabled(filled.sfxEnabled ?? true);
      // BGM applied in CatScreen effect based on prop

      // Daily reset
      let tasks = filled.tasks;
      if (filled.lastResetDate !== todayString()) {
        const completedYesterday = tasks.filter(t => t.completed).length;
        const total = tasks.length;
        const ratio = total === 0 ? 1 : completedYesterday / total;

        let healthDelta = 0;
        let xpBonus = 0;
        if (ratio >= 0.8)       { healthDelta = +15; xpBonus = 20; }
        else if (ratio >= 0.5)  { healthDelta = 0;   xpBonus = 10; }
        else if (ratio >= 0.2)  { healthDelta = -20; xpBonus = 0;  }
        else                    { healthDelta = -35; xpBonus = 0;  }

        const newHealth = clamp(filled.catHealth + healthDelta, 0, 100);
        const alive = newHealth > 0;

        tasks = filled.tasks.map(t => ({
          ...t,
          completed: false,
          completedAt: undefined,
          latePenaltyApplied: false,
        }));

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

  // ── Hunger drain + health recovery ───────────────────────────────────────────
  // -3 hunger/hr = -0.05/min; check every 60s
  // At 0 hunger: -0.2 HP/min = -12 HP/hr
  // At hunger >60: +0.1 HP/min = +6 HP/hr (slow recovery)
  useEffect(() => {
    function tick() {
      setState(prev => {
        if (!prev.catAlive) return prev;

        const newHunger = clamp((prev.catHunger ?? 80) - 0.05, 0, 100);

        let healthDelta = 0;
        if (newHunger <= 0) {
          healthDelta = -0.2; // starving: losing HP
        } else if (newHunger >= 60) {
          healthDelta = 0.1;  // well-fed: slowly recovering
        }

        const newHealth = clamp(prev.catHealth + healthDelta, 0, 100);
        const alive = newHealth > 0;

        if (newHunger === prev.catHunger && healthDelta === 0) return prev;

        return { ...prev, catHunger: newHunger, catHealth: newHealth, catAlive: alive };
      });
    }

    if (loaded) tick();
    const id = setInterval(tick, 60_000); // every minute
    return () => clearInterval(id);
  }, [loaded]);

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

      // Coins only — health changes via hunger/market
      const delta = task.completed ? task.reward : -task.reward;
      return { ...prev, tasks, coins: clamp(prev.coins + delta, 0, 9999) };
    });
  }, []);

  const deleteTask = useCallback((id: string) => {
    setState(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }));
  }, []);

  const disputePriority = useCallback((id: string, priority: TaskPriority) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? { ...t, priority } : t),
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
        case 'hunger_small': {
          const qf: QueuedFood = { id: `food_${Date.now()}`, itemId: 'snack', name: 'Cat Snack', emoji: '🐟', hunger: 30, health: 0 };
          patch.foodQueue = [...(prev.foodQueue ?? []), qf];
          result = '🐟 Cat Snack added to plate!';
          return { ...prev, ...patch };
        }
        case 'hunger_medium': {
          const qf: QueuedFood = { id: `food_${Date.now()}`, itemId: 'meal', name: 'Premium Meal', emoji: '🍣', hunger: 60, health: 0 };
          patch.foodQueue = [...(prev.foodQueue ?? []), qf];
          result = '🍣 Premium Meal added to plate!';
          return { ...prev, ...patch };
        }
        case 'health_direct': {
          const qf: QueuedFood = { id: `food_${Date.now()}`, itemId: 'medicine', name: 'Cat Medicine', emoji: '💊', hunger: 0, health: 50 };
          patch.foodQueue = [...(prev.foodQueue ?? []), qf];
          result = '💊 Medicine added to plate!';
          return { ...prev, ...patch };
        }
        case 'revive':
          if (!prev.catAlive || prev.catHealth <= 10) {
            patch.catHealth = 50;
            patch.catAlive  = true;
            patch.catHunger = 50;
            patch.tasks     = prev.tasks.filter(t => !t.isRevival);
          } else {
            result = 'Your cat is still alive!';
            return prev;
          }
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

  // ── Feed cat (drag-to-feed) ───────────────────────────────────────────────────
  const feedCat = useCallback((foodId: string) => {
    setState(prev => {
      const food = (prev.foodQueue ?? []).find(f => f.id === foodId);
      if (!food) return prev;

      let newHunger = prev.catHunger;
      let newHealth = prev.catHealth;

      if (food.hunger > 0) {
        newHunger = clamp(prev.catHunger + food.hunger, 0, 100);
      }
      if (food.health > 0) {
        newHealth = clamp(prev.catHealth + food.health, 0, 100);
      }

      return {
        ...prev,
        catHunger: newHunger,
        catHealth: newHealth,
        foodQueue: prev.foodQueue.filter(f => f.id !== foodId),
      };
    });
  }, []);

  // ── Audio toggles ─────────────────────────────────────────────────────────────
  const toggleSFX = useCallback(() => {
    setState(prev => {
      const next = !prev.sfxEnabled;
      setSFXEnabled(next);
      return { ...prev, sfxEnabled: next };
    });
  }, []);

  const toggleBGM = useCallback(() => {
    setState(prev => ({ ...prev, bgmEnabled: !prev.bgmEnabled }));
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────────
  const regularTasks   = state.tasks.filter(t => !t.isRevival && !t.isSpecial);
  const completedToday = state.tasks.filter(t => t.completed).length;
  const totalTasks     = state.tasks.length;
  const catState       = getCatState(state.catHealth, state.catAlive, state.catStateOverride);
  const catLevel       = getCatLevel(state.catXP);

  return {
    loaded,
    state,
    catState,
    catHealth: state.catHealth,
    catHunger: state.catHunger ?? 80,
    coins: state.coins,
    catAlive: state.catAlive,
    catName: state.catName,
    catColor: state.catColor,
    catXP: state.catXP,
    catLevel,
    catPersonality: state.catPersonality,
    setupComplete: state.setupComplete,
    sfxEnabled: state.sfxEnabled ?? true,
    bgmEnabled: state.bgmEnabled ?? true,
    regularTasks,
    completedToday,
    totalTasks,
    foodQueue: state.foodQueue ?? [],
    completeSetup,
    addTask,
    toggleTask,
    deleteTask,
    disputePriority,
    buyItem,
    applyRandomEvent,
    feedCat,
    toggleSFX,
    toggleBGM,
  };
}
