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
  priority?: TaskPriority;    // default 'medium'
}

export interface MarketItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  emoji: string;
  effect: 'health_small' | 'health_medium' | 'health_large' | 'revive' | 'new_cat' | 'catnip';
  xpReward: number;
}

export interface QueuedFood {
  id: string;
  itemId: string;   // 'snack' | 'meal' | 'medicine'
  name: string;
  emoji: string;
  health: number;
}

export interface GameState {
  setupComplete: boolean;
  catName: string;
  catHealth: number;          // 0–100
  coins: number;
  catAlive: boolean;
  catStateOverride: CatState | null;
  catnipExpiresAt: string | null;
  tasks: Task[];
  lastResetDate: string;      // YYYY-MM-DD
  catColor: string;
  catXP: number;
  catPersonality: string;
  foodQueue: QueuedFood[];    // food waiting to be fed to cat
}
