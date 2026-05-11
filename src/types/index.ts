export type CatState =
  | 'happy'
  | 'sad'
  | 'depressed'
  | 'cocaine'    // catnip craze / hyper
  | 'hospital'
  | 'deathbed';

export type TaskPriority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  category: string;
  scheduledTime: string;      // 'HH:MM' or '' for flexible
  reward: number;             // coins earned on completion
  completed: boolean;
  completedAt?: string;
  latePenaltyApplied?: boolean;
  isRecurring: boolean;
  isSpecial: boolean;
  isRevival: boolean;
  createdAt: string;
  taskDate: string;           // YYYY-MM-DD — which day this task belongs to
  priority?: TaskPriority;    // auto-assigned; default 'medium'
}

export interface MarketItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  emoji: string;
  effect: 'hunger_small' | 'hunger_medium' | 'health_direct' | 'revive' | 'catnip';
  xpReward: number;
}

export interface QueuedFood {
  id: string;
  itemId: string;
  name: string;
  emoji: string;
  hunger: number;   // hunger restored when fed (0 for medicine)
  health: number;   // health restored directly when fed (0 for food items)
}

export interface GameState {
  setupComplete: boolean;
  catName: string;
  catHealth: number;          // 0–100
  catHunger: number;          // 0–100  (separate hunger stat)
  coins: number;
  catAlive: boolean;
  catStateOverride: CatState | null;
  catnipExpiresAt: string | null;
  tasks: Task[];
  lastResetDate: string;      // YYYY-MM-DD
  catColor: string;
  catXP: number;
  catPersonality: string;
  foodQueue: QueuedFood[];
  sfxEnabled: boolean;
  bgmEnabled: boolean;
}
