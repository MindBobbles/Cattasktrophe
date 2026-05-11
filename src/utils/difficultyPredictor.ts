// Keyword-based priority predictor — 3 tiers only
// HIGH   = 10 coins  (urgent / hard / important tasks)
// MEDIUM = 5  coins  (moderate effort tasks)
// LOW    = 3  coins  (easy / routine tasks)

export type AutoPriority = 'high' | 'medium' | 'low';

export const PRIORITY_COINS: Record<AutoPriority, number> = {
  high:   10,
  medium: 5,
  low:    3,
};

// ── Phrases (checked first — higher specificity) ───────────────────────────
const HIGH_PHRASES = [
  // Study / Academic
  'study for', 'prepare for', 'finish report', 'submit assignment',
  'thesis defense', 'board exam', 'job interview', 'practice presentation',
  'write report', 'write essay', 'write paper', 'deep work',
  // Work deliverables
  'finish office', 'office work', 'work on project', 'work on app',
  'finish project', 'ship feature', 'code review', 'work on app',
  // Creative / production
  'record video', 'edit video', 'produce video', 'finish artwork',
  'finish painting', 'finish drawing', 'record podcast', 'edit podcast',
  'mix track', 'master track', 'finish track', 'finish song',
  // Gym / demanding physical
  'go to gym', 'hit the gym', 'weight training', 'strength training',
  'interval training', 'half marathon', 'iron man',
  // Big cooking
  'bake cake', 'bake bread', 'bake cookies', 'cook biryani', 'cook lasagna',
];

const MEDIUM_PHRASES = [
  'grocery shopping', 'food shopping', 'meal prep', 'team meeting',
  'clear inbox', 'go swimming', 'go cycling', 'go running', 'go boxing',
  'go for a run', 'go for a walk', 'reply to',
];

// ── Single keywords ────────────────────────────────────────────────────────
const HIGH_KEYWORDS = [
  // Urgent / critical
  'exam', 'interview', 'deadline', 'urgent', 'critical', 'emergency',
  // Presentations / submissions
  'presentation', 'assignment', 'thesis', 'dissertation',
  'submit', 'due', 'draft',
  // Medical / legal / financial
  'surgery', 'appointment', 'bill', 'payment', 'tax',
  // Academic / work
  'homework', 'coursework', 'revision', 'implement', 'develop', 'debug', 'deploy',
  'coding', 'programming', 'study',
  // Gym-specific (demanding physical session)
  'gym', 'workout', 'lifting', 'crossfit', 'bootcamp', 'marathon', 'triathlon',
  // Creative production
  'artwork', 'painting', 'illustration', 'produce', 'record', 'filming',
  'compose', 'portfolio',
  // Office
  'office', 'project', 'report',
];

const MEDIUM_KEYWORDS = [
  'meeting', 'call', 'email', 'review', 'grocery', 'groceries', 'shopping',
  // Regular exercise (not gym sessions)
  'run', 'running', 'sprint', 'jog', 'jogging', 'hike', 'hiking',
  'cycling', 'swimming', 'yoga', 'pilates', 'bjj', 'mma', 'training',
  'practice', 'exercise', 'stretch', 'walk',
  // Cooking / home
  'cooking', 'cook', 'bake', 'laundry', 'cleaning', 'clean', 'tidy', 'dishes',
  // Admin / light tasks
  'read', 'meditate', 'journal', 'reply',
  'organise', 'organize', 'plan', 'schedule', 'arrange', 'sort',
  'errand', 'errands', 'chore', 'chores',
  'fix', 'repair', 'water', 'charge', 'backup', 'update', 'install',
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
