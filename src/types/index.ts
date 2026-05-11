export type CatState =
  | 'happy'
  | 'sad'
  | 'depressed'
  | 'cocaine'    // catnip craze / hyper
  | 'hospital'
  | 'deathbed';

export type TaskPriority = 'high' | 'medium' | 'low';
export type RepeatRule = 'daily' | 'weekdays' | 'weekly' | 'custom';

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
  isTemplate: boolean;        // true = master repeat template (not shown in daily list)
  createdAt: string;
  taskDate: string;           // YYYY-MM-DD — which day this task belongs to (template = creation date)
  priority?: TaskPriority;
  // Repeat fields (templates only)
  repeatRule?: RepeatRule;    // how it repeats
  repeatDays?: number[];      // 0=Sun … 6=Sat  (for 'weekly' and 'custom')
  templateId?: string;        // instance → links back to its template
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
