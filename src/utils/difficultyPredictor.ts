// Keyword-based difficulty predictor for task coin assignment.
// Tiers: 0=trivial(1🪙) 1=easy(2🪙) 2=routine(3🪙) 3=medium(5🪙) 4=hard(7🪙) 5=extreme(10🪙)

type Tier = 0 | 1 | 2 | 3 | 4 | 5;
const TIER_COINS: number[] = [1, 2, 3, 5, 7, 10];
const TIER_LABELS: string[] = ['Trivial', 'Easy', 'Routine', 'Medium', 'Hard', 'Extreme'];

// Multi-word phrases — checked first (higher specificity wins)
const PHRASES: Array<{ p: string; t: Tier }> = [
  // Extreme
  { p: 'iron man',          t: 5 }, { p: 'triathlon',          t: 5 },
  { p: 'marathon',          t: 5 }, { p: 'ultra run',           t: 5 },
  { p: 'thesis defense',    t: 5 }, { p: 'board exam',          t: 5 },
  { p: 'competitive exam',  t: 5 },
  // Hard
  { p: 'butter chicken',    t: 4 }, { p: 'chocolate cake',      t: 4 },
  { p: 'bake cake',         t: 4 }, { p: 'bake bread',          t: 4 },
  { p: 'bake cookies',      t: 4 }, { p: 'work on project',     t: 4 },
  { p: 'work on app',       t: 4 }, { p: 'code a',              t: 4 },
  { p: 'deep work',         t: 4 }, { p: 'write essay',         t: 4 },
  { p: 'write report',      t: 4 }, { p: 'job interview',       t: 4 },
  { p: 'study for',         t: 4 }, { p: 'half marathon',       t: 4 },
  { p: 'strength training', t: 4 }, { p: 'weight training',     t: 4 },
  { p: 'interval training', t: 4 }, { p: 'long run',            t: 4 },
  { p: 'practice presentation', t: 4 },
  // Medium
  { p: 'dal chawal',        t: 3 }, { p: 'meal prep',           t: 3 },
  { p: 'go cycling',        t: 3 }, { p: 'go swimming',         t: 3 },
  { p: 'go running',        t: 3 }, { p: 'go boxing',           t: 3 },
  { p: 'grocery shopping',  t: 3 }, { p: 'food shopping',       t: 3 },
  { p: 'team meeting',      t: 3 }, { p: 'clear inbox',         t: 3 },
  // Easy
  { p: 'make bed',          t: 1 }, { p: 'short walk',          t: 1 },
  { p: 'reply to',          t: 1 }, { p: 'water plants',        t: 1 },
  // Trivial
  { p: 'wake up',           t: 0 }, { p: 'brush teeth',         t: 0 },
  { p: 'drink water',       t: 0 }, { p: 'take vitamins',       t: 0 },
  { p: 'take pills',        t: 0 }, { p: 'take meds',           t: 0 },
];

// Single keywords — fallback
const KEYWORDS: Array<{ k: string; t: Tier }> = [
  // Extreme
  { k: 'marathon',      t: 5 }, { k: 'triathlon',     t: 5 },
  // Hard
  { k: 'boxing',        t: 4 }, { k: 'bake',           t: 4 },
  { k: 'study',         t: 4 }, { k: 'programming',    t: 4 },
  { k: 'coding',        t: 4 }, { k: 'interview',      t: 4 },
  { k: 'presentation',  t: 4 }, { k: 'thesis',         t: 4 },
  { k: 'exam',          t: 4 }, { k: 'assignment',     t: 4 },
  { k: 'deadline',      t: 4 }, { k: 'project',        t: 4 },
  { k: 'essay',         t: 4 }, { k: 'dissertation',   t: 4 },
  { k: 'biryani',       t: 4 }, { k: 'lasagne',        t: 4 },
  { k: 'lasagna',       t: 4 },
  // Medium
  { k: 'exercise',      t: 3 }, { k: 'gym',            t: 3 },
  { k: 'workout',       t: 3 }, { k: 'cycling',        t: 3 },
  { k: 'swimming',      t: 3 }, { k: 'yoga',           t: 3 },
  { k: 'pilates',       t: 3 }, { k: 'bjj',            t: 3 },
  { k: 'mma',           t: 3 }, { k: 'jog',            t: 3 },
  { k: 'cook',          t: 3 }, { k: 'cooking',        t: 3 },
  { k: 'grocery',       t: 3 }, { k: 'meeting',        t: 3 },
  { k: 'report',        t: 3 }, { k: 'cleaning',       t: 3 },
  // Easy
  { k: 'walk',          t: 1 }, { k: 'meditate',       t: 1 },
  { k: 'read',          t: 1 }, { k: 'laundry',        t: 1 },
  { k: 'dishes',        t: 1 }, { k: 'tidy',           t: 1 },
  { k: 'clean',         t: 1 }, { k: 'call',           t: 1 },
  { k: 'email',         t: 1 }, { k: 'journal',        t: 1 },
  { k: 'stretch',       t: 1 },
  // Trivial
  { k: 'wake',          t: 0 }, { k: 'shower',         t: 0 },
  { k: 'brush',         t: 0 }, { k: 'vitamin',        t: 0 },
  { k: 'pill',          t: 0 }, { k: 'sleep',          t: 0 },
];

export function predictDifficulty(title: string): number {
  const text = title.toLowerCase().trim();
  let tier: number = 2; // default: Routine = 3 coins

  // Phrases first (higher specificity)
  for (const { p, t } of PHRASES) {
    if (text.includes(p)) tier = Math.max(tier, t);
  }

  // Single keywords fallback
  for (const { k, t } of KEYWORDS) {
    const rx = new RegExp(`\\b${k}`, 'i');
    if (rx.test(text)) tier = Math.max(tier, t);
  }

  // Time modifier: "for X hours" boosts tier
  const hourMatch = text.match(/for (\d+(?:\.\d+)?)\s*hours?/i);
  if (hourMatch) {
    const h = parseFloat(hourMatch[1]);
    if (h >= 3) tier = Math.min(5, tier + 2);
    else if (h >= 2) tier = Math.min(5, tier + 1);
  }

  return TIER_COINS[tier];
}

export function difficultyLabel(coins: number): string {
  const idx = TIER_COINS.indexOf(coins);
  return idx >= 0 ? TIER_LABELS[idx] : 'Custom';
}
