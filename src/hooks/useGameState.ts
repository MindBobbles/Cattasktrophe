import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, TaskPriority, GameState, CatState, MarketItem, QueuedFood } from '../types';
import {
  randomCatColor, randomPersonality, getCatLevel,
} from '../constants/colors';
import {
  requestNotificationPermission, sendNotification, scheduleNightlyReminder,
} from '../utils/notifications';
import { setSFXEnabled } from '../utils/sound';
import { getCoinsForPriority } from '../utils/difficultyPredictor';

const STORAGE_KEY = '@cat_task_trophe_v3';

export const MARKET_ITEMS: MarketItem[] = [
  { id: 'snack',    name: 'Cat Snack',     description: '+30 hunger',             cost: 15,  emoji: '🐟', effect: 'hunger_small',  xpReward: 5  },
  { id: 'meal',     name: 'Premium Meal',  description: '+60 hunger',             cost: 30,  emoji: '🍣', effect: 'hunger_medium', xpReward: 10 },
  { id: 'medicine', name: 'Cat Medicine',  description: '+50 HP (direct)',        cost: 30,  emoji: '💊', effect: 'health_direct',  xpReward: 15 },
  { id: 'catnip',   name: 'Catnip Toy',    description: 'CATNIP CRAZE for 2min', cost: 40,  emoji: '🌿', effect: 'catnip',         xpReward: 3  },
  { id: 'revive',   name: 'Revive Potion', description: 'Bring cat back to life', cost: 50,  emoji: '✨', effect: 'revive',         xpReward: 20 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// ─── Repeat logic ─────────────────────────────────────────────────────────────

function shouldRepeatOnDate(template: Task, date: Date): boolean {
  const dow = date.getDay(); // 0=Sun … 6=Sat
  switch (template.repeatRule) {
    case 'daily':    return true;
    case 'weekdays': return dow >= 1 && dow <= 5;
    case 'weekly': {
      const created = new Date(template.createdAt);
      return created.getDay() === dow;
    }
    case 'custom':   return (template.repeatDays ?? []).includes(dow);
    default:         return false;
  }
}

/**
 * For each template, for each day in `days`, create an instance if one doesn't exist yet.
 */
function generateTaskInstances(templates: Task[], existing: Task[], days: Date[]): Task[] {
  const newTasks: Task[] = [];
  const now = new Date();

  for (const tmpl of templates) {
    if (!tmpl.repeatRule) continue;
    for (const day of days) {
      const ds = dateStr(day);
      if (!shouldRepeatOnDate(tmpl, day)) continue;
      const alreadyExists =
        existing.some(t => t.templateId === tmpl.id && t.taskDate === ds) ||
        newTasks.some(t => t.templateId === tmpl.id && t.taskDate === ds);
      if (alreadyExists) continue;

      newTasks.push({
        ...tmpl,
        id:                  `${tmpl.id}_${ds}`,
        isTemplate:          false,
        templateId:          tmpl.id,
        taskDate:            ds,
        completed:           false,
        completedAt:         undefined,
        latePenaltyApplied:  false,
        createdAt:           now.toISOString(),
      });
    }
  }
  return newTasks;
}

/** Next 8 days (today + 7) as Date objects */
function next8Days(): Date[] {
  const now = new Date();
  return Array.from({ length: 8 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    return d;
  });
}

// ─── State & defaults ────────────────────────────────────────────────────────

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

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGameState() {
  const [state, setState] = useState<GameState>(DEFAULT);
  const [loaded, setLoaded] = useState(false);

  // ── Load ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!raw) { setLoaded(true); return; }
      const saved: any = JSON.parse(raw);

      // Back-fill missing top-level fields
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

      // Migrate food queue items (hunger + health schema)
      filled.foodQueue = (filled.foodQueue ?? []).map((f: any) => ({
        id:     f.id,
        itemId: f.itemId ?? '',
        name:   f.name   ?? '',
        emoji:  f.emoji  ?? '🍽️',
        hunger: typeof f.hunger === 'number' ? f.hunger : 0,
        health: typeof f.health === 'number' ? f.health : 0,
      }));

      // Filter out isRevival and isSpecial tasks (removed features)
      filled.tasks = filled.tasks.filter((t: any) => !t.isRevival && !t.isSpecial);

      // Backfill isTemplate (defaults false for any old task)
      filled.tasks = filled.tasks.map((t: any): Task => ({
        isTemplate:  false,
        taskDate:    t.createdAt?.slice(0, 10) ?? todayString(),
        repeatDays:  [],
        ...t,
      }));

      // Migrate: old isRecurring non-template tasks → templates
      filled.tasks = filled.tasks.map((t: Task): Task => {
        if (t.isRecurring && !t.isTemplate && !t.templateId) {
          return { ...t, isTemplate: true, repeatRule: t.repeatRule ?? 'daily' };
        }
        return t;
      });

      // Expire catnip
      let override = filled.catStateOverride;
      if (filled.catnipExpiresAt && new Date(filled.catnipExpiresAt) < new Date()) {
        override = null;
      }

      // Apply sound settings
      setSFXEnabled(filled.sfxEnabled ?? true);

      // Generate instances for today + next 7 days
      const templates = filled.tasks.filter((t: Task) => t.isTemplate);
      const instances = generateTaskInstances(templates, filled.tasks, next8Days());
      filled.tasks = [...filled.tasks, ...instances];

      // Daily reset
      const today = new Date();
      const todayStr = todayString();
      if (filled.lastResetDate !== todayStr) {
        // Calculate health based on YESTERDAY's tasks
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const yesterdayStr = dateStr(yesterday);

        const yesterdayTasks = filled.tasks.filter(
          (t: Task) => !t.isTemplate && t.taskDate === yesterdayStr
        );
        const total = yesterdayTasks.length;
        const completedYesterday = yesterdayTasks.filter((t: Task) => t.completed).length;
        const ratio = total === 0 ? 1 : completedYesterday / total;

        let healthDelta = 0;
        let xpBonus     = 0;
        if (ratio >= 0.8)      { healthDelta = +15; xpBonus = 20; }
        else if (ratio >= 0.5) { healthDelta =   0; xpBonus = 10; }
        else if (ratio >= 0.2) { healthDelta = -20; xpBonus =  0; }
        else                   { healthDelta = -35; xpBonus =  0; }

        const newHealth = clamp(filled.catHealth + healthDelta, 0, 100);
        const alive = newHealth > 0;

        // Clean up instances older than 30 days
        const cutoff = new Date(today);
        cutoff.setDate(today.getDate() - 30);
        const cutoffStr = dateStr(cutoff);
        filled.tasks = filled.tasks.filter((t: Task) =>
          t.isTemplate || (t.taskDate ?? '') >= cutoffStr
        );

        setState({
          ...filled,
          catHealth:       newHealth,
          catAlive:        alive,
          catStateOverride: override,
          catnipExpiresAt: override ? filled.catnipExpiresAt : null,
          lastResetDate:   todayStr,
          catXP:           filled.catXP + xpBonus,
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

  // ── Hunger drain + starvation damage ────────────────────────────────────────
  // Tick every 60 s: hunger −0.05/tick (~3/hr)
  // When starving (hunger = 0): health −0.2/tick
  useEffect(() => {
    function tick() {
      setState(prev => {
        if (!prev.catAlive) return prev;
        const newHunger = clamp((prev.catHunger ?? 80) - 0.05, 0, 100);
        const healthDelta = newHunger <= 0 ? -0.2 : 0;
        const newHealth = clamp(prev.catHealth + healthDelta, 0, 100);
        const alive = newHealth > 0;
        if (newHunger === prev.catHunger && healthDelta === 0) return prev;
        return { ...prev, catHunger: newHunger, catHealth: newHealth, catAlive: alive };
      });
    }
    if (loaded) tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [loaded]);

  // ── Passive health recovery when full ────────────────────────────────────────
  // Phase 1 (first 12 ticks): +2 HP every 2 minutes
  // Phase 2 (after 12 ticks): +4 HP every 10 minutes
  // Both phases reset when hunger drops below 60
  const recoveryFastCountRef = useRef(0); // ticks delivered in fast phase
  const recoverySlowCountRef = useRef(0); // 2-min ticks since last slow heal

  useEffect(() => {
    if (!loaded) return;

    const id = setInterval(() => {
      setState(prev => {
        if (!prev.catAlive) return prev;
        const hunger = prev.catHunger ?? 80;

        // Not full — reset counters, no recovery
        if (hunger < 60) {
          recoveryFastCountRef.current = 0;
          recoverySlowCountRef.current = 0;
          return prev;
        }

        // Already at max HP
        if (prev.catHealth >= 100) return prev;

        const inFastPhase = recoveryFastCountRef.current < 12;

        if (inFastPhase) {
          recoveryFastCountRef.current++;
          return { ...prev, catHealth: clamp(prev.catHealth + 2, 0, 100) };
        } else {
          // Slow phase: tick every 2 min, heal every 5th tick = every 10 min
          recoverySlowCountRef.current++;
          if (recoverySlowCountRef.current >= 5) {
            recoverySlowCountRef.current = 0;
            return { ...prev, catHealth: clamp(prev.catHealth + 4, 0, 100) };
          }
          return prev;
        }
      });
    }, 2 * 60_000); // every 2 minutes

    return () => clearInterval(id);
  }, [loaded]);

  // ── Missed-task health drain ──────────────────────────────────────────────────
  useEffect(() => {
    function checkMissedTasks() {
      const now = new Date();
      const todayStr = todayString();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      setState(prev => {
        if (!prev.catAlive) return prev;
        let healthDelta = 0;
        let missCount   = 0;

        const tasks = prev.tasks.map(t => {
          if (t.isTemplate) return t;
          if (t.taskDate !== todayStr) return t;  // only check today's tasks
          if (t.completed || !t.scheduledTime || t.latePenaltyApplied) return t;
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

  const completeSetup = useCallback((catName: string, templates: Task[]) => {
    // Generate today's instances from the onboarding templates
    const instances = generateTaskInstances(templates, templates, next8Days());
    const allTasks  = [...templates, ...instances];
    setState(prev => ({
      ...prev,
      setupComplete: true,
      catName,
      tasks: allTasks,
      catColor:       randomCatColor(),
      catPersonality: randomPersonality(),
    }));
  }, []);

  const addTask = useCallback((task: Omit<Task, 'id' | 'completed' | 'createdAt'>) => {
    const now   = new Date();
    const today = todayString();
    setState(prev => {
      const id      = `task_${Date.now()}`;
      const newTask: Task = {
        ...task,
        id,
        completed:  false,
        createdAt:  now.toISOString(),
        taskDate:   task.taskDate ?? today,
      };

      let tasks = [...prev.tasks, newTask];

      // If it's a template, immediately generate instances for today + next 7 days
      if (newTask.isTemplate && newTask.repeatRule) {
        const instances = generateTaskInstances([newTask], tasks, next8Days());
        tasks = [...tasks, ...instances];
      }

      return { ...prev, tasks };
    });
  }, []);

  const toggleTask = useCallback((id: string) => {
    setState(prev => {
      if (!prev.catAlive) return prev;
      const task = prev.tasks.find(t => t.id === id);
      // Guard: can't un-complete a task (prevents coin farming)
      if (!task || task.completed) return prev;
      const tasks = prev.tasks.map(t =>
        t.id === id
          ? { ...t, completed: true, completedAt: new Date().toISOString() }
          : t
      );
      return { ...prev, tasks, coins: clamp(prev.coins + task.reward, 0, 9999) };
    });
  }, []);

  /** Delete just this task (or instance) */
  const deleteTask = useCallback((id: string) => {
    setState(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }));
  }, []);

  /** Delete this instance AND its template AND all future instances */
  const deleteTaskAndUpcoming = useCallback((id: string) => {
    setState(prev => {
      const task = prev.tasks.find(t => t.id === id);
      if (!task) return prev;

      const todayStr   = todayString();
      const templateId = task.templateId ?? (task.isTemplate ? task.id : null);

      if (!templateId) {
        // Not repeating — just delete this one
        return { ...prev, tasks: prev.tasks.filter(t => t.id !== id) };
      }

      const tasks = prev.tasks.filter(t => {
        if (t.id === templateId) return false;                        // delete template
        if (t.templateId === templateId && (t.taskDate ?? '') >= todayStr) return false; // future instances
        return true;
      });
      return { ...prev, tasks };
    });
  }, []);

  /** Update a single task / instance */
  const updateTask = useCallback((id: string, changes: Partial<Omit<Task, 'id'>>) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? { ...t, ...changes } : t),
    }));
  }, []);

  /**
   * Update this instance + its template + all future instances.
   * Preserve completed/completedAt on individual instances.
   */
  const updateTaskAndUpcoming = useCallback((id: string, changes: Partial<Omit<Task, 'id'>>) => {
    setState(prev => {
      const task = prev.tasks.find(t => t.id === id);
      if (!task) return prev;

      const todayStr   = todayString();
      const templateId = task.templateId ?? (task.isTemplate ? task.id : null);

      if (!templateId) {
        return { ...prev, tasks: prev.tasks.map(t => t.id === id ? { ...t, ...changes } : t) };
      }

      const tasks = prev.tasks.map(t => {
        if (t.id === templateId) {
          return { ...t, ...changes, isTemplate: true };
        }
        if (t.templateId === templateId && (t.taskDate ?? '') >= todayStr) {
          return { ...t, ...changes, isTemplate: false, templateId, completed: t.completed, completedAt: t.completedAt };
        }
        return t;
      });
      return { ...prev, tasks };
    });
  }, []);

  const disputePriority = useCallback((id: string, priority: TaskPriority) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t =>
        t.id === id
          ? { ...t, priority, reward: getCoinsForPriority(priority) }
          : t
      ),
    }));
  }, []);

  const applyRandomEvent = useCallback((healthDelta: number, coinDelta: number) => {
    setState(prev => {
      if (!prev.catAlive) return prev;
      const newHealth = clamp(prev.catHealth + healthDelta, 0, 100);
      return {
        ...prev,
        catHealth: newHealth,
        catAlive:  newHealth > 0,
        coins:     clamp(prev.coins + coinDelta, 0, 9999),
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
      let patch: Partial<GameState> = { coins, catXP: prev.catXP + item.xpReward };

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

  const feedCat = useCallback((foodId: string) => {
    setState(prev => {
      const food = (prev.foodQueue ?? []).find(f => f.id === foodId);
      if (!food) return prev;
      let newHunger = prev.catHunger;
      let newHealth = prev.catHealth;
      if (food.hunger > 0) newHunger = clamp(prev.catHunger + food.hunger, 0, 100);
      if (food.health > 0) newHealth = clamp(prev.catHealth + food.health, 0, 100);
      return {
        ...prev,
        catHunger: newHunger,
        catHealth: newHealth,
        foodQueue: prev.foodQueue.filter(f => f.id !== foodId),
      };
    });
  }, []);

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
  const regularTasks   = state.tasks.filter(t => !t.isRevival && !t.isSpecial && !t.isTemplate);
  const completedToday = state.tasks.filter(t => t.completed && !t.isTemplate).length;
  const totalTasks     = state.tasks.filter(t => !t.isTemplate).length;
  const catState       = getCatState(state.catHealth, state.catAlive, state.catStateOverride);
  const catLevel       = getCatLevel(state.catXP);

  return {
    loaded,
    state,
    catState,
    catHealth:     state.catHealth,
    catHunger:     state.catHunger ?? 80,
    coins:         state.coins,
    catAlive:      state.catAlive,
    catName:       state.catName,
    catColor:      state.catColor,
    catXP:         state.catXP,
    catLevel,
    catPersonality: state.catPersonality,
    setupComplete:  state.setupComplete,
    sfxEnabled:     state.sfxEnabled ?? true,
    bgmEnabled:     state.bgmEnabled ?? true,
    regularTasks,
    completedToday,
    totalTasks,
    foodQueue:      state.foodQueue ?? [],
    completeSetup,
    addTask,
    toggleTask,
    deleteTask,
    deleteTaskAndUpcoming,
    updateTask,
    updateTaskAndUpcoming,
    disputePriority,
    buyItem,
    applyRandomEvent,
    feedCat,
    toggleSFX,
    toggleBGM,
  };
}
