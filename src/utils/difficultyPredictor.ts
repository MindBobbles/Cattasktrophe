// Keyword-based priority predictor — 3 tiers only
// HIGH   = 5 coins  (urgent / hard / important tasks)
// MEDIUM = 3 coins  (moderate effort tasks)
// LOW    = 2 coins  (easy / routine tasks)

export type AutoPriority = 'high' | 'medium' | 'low';

export const PRIORITY_COINS: Record<AutoPriority, number> = {
  high:   5,
  medium: 3,
  low:    2,
};

// ── Phrases (checked first — higher specificity) ───────────────────────────
const HIGH_PHRASES = [
  'study for', 'prepare for', 'work on', 'finish report', 'submit',
  'thesis defense', 'board exam', 'job interview', 'practice presentation',
  'write report', 'write essay', 'write paper', 'deep work', 'iron man',
  'half marathon', 'strength training', 'weight training', 'interval training',
  'bake cake', 'bake bread', 'bake cookies', 'code a', 'work on app',
  'work on project',
];

const MEDIUM_PHRASES = [
  'grocery shopping', 'food shopping', 'meal prep', 'team meeting',
  'clear inbox', 'go swimming', 'go cycling', 'go running', 'go boxing',
  'go to gym', 'go for a run', 'go for a walk', 'reply to',
];

// ── Single keywords ────────────────────────────────────────────────────────
const HIGH_KEYWORDS = [
  'exam', 'interview', 'deadline', 'urgent', 'important', 'critical',
  'presentation', 'assignment', 'project', 'thesis', 'dissertation',
  'surgery', 'doctor', 'appointment', 'bill', 'payment', 'tax', 'report',
  'emergency', 'bake', 'coding', 'programming', 'study', 'exercise',
  'workout', 'gym', 'marathon', 'triathlon', 'biryani', 'lasagna', 'lasagne',
];

const MEDIUM_KEYWORDS = [
  'meeting', 'call', 'email', 'review', 'grocery', 'shopping',
  'swimming', 'cycling', 'yoga', 'pilates', 'bjj', 'mma', 'jog',
  'cooking', 'cook', 'laundry', 'cleaning', 'clean', 'read', 'meditate',
  'journal', 'stretch', 'walk', 'tidy', 'dishes', 'reply',
];

// ── Main predictor ─────────────────────────────────────────────────────────
export function predictPriority(title: string): AutoPriority {
  const text = title.toLowerCase().trim();

  // High phrases first (most specific)
  for (const phrase of HIGH_PHRASES) {
    if (text.includes(phrase)) return 'high';
  }
  // High keywords
  for (const kw of HIGH_KEYWORDS) {
    if (new RegExp(`\\b${kw}`, 'i').test(text)) return 'high';
  }
  // Medium phrases
  for (const phrase of MEDIUM_PHRASES) {
    if (text.includes(phrase)) return 'medium';
  }
  // Medium keywords
  for (const kw of MEDIUM_KEYWORDS) {
    if (new RegExp(`\\b${kw}`, 'i').test(text)) return 'medium';
  }

  return 'low';
}

export function getCoinsForPriority(priority: AutoPriority): number {
  return PRIORITY_COINS[priority];
}

// Legacy compat — maps old coin values to labels
export function priorityLabel(priority: AutoPriority): string {
  return priority === 'high' ? 'HIGH' : priority === 'medium' ? 'MEDIUM' : 'LOW';
}
