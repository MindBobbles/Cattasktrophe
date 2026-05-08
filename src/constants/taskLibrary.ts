export interface PresetTask {
  id: string;
  title: string;
  category: string;
  defaultTime: string;
  reward: number;
  emoji: string;
}

export const ROUTINE_PRESETS: PresetTask[] = [
  { id: 'wake_up',     title: 'Wake up',               category: 'Morning',  defaultTime: '07:00', reward: 1,  emoji: '⏰' },
  { id: 'make_bed',    title: 'Make the bed',           category: 'Morning',  defaultTime: '07:10', reward: 1,  emoji: '🛏️' },
  { id: 'shower',      title: 'Morning shower',         category: 'Morning',  defaultTime: '07:20', reward: 2,  emoji: '🚿' },
  { id: 'breakfast',   title: 'Eat breakfast',          category: 'Morning',  defaultTime: '08:00', reward: 2,  emoji: '🍳' },
  { id: 'exercise',    title: 'Exercise / workout',     category: 'Morning',  defaultTime: '08:30', reward: 5,  emoji: '💪' },
  { id: 'vitamins',    title: 'Take vitamins',          category: 'Morning',  defaultTime: '08:45', reward: 1,  emoji: '💊' },
  { id: 'office',      title: 'Go to office / work',    category: 'Work',     defaultTime: '09:00', reward: 3,  emoji: '🏢' },
  { id: 'emails',      title: 'Clear emails / inbox',   category: 'Work',     defaultTime: '09:30', reward: 2,  emoji: '📧' },
  { id: 'lunch',       title: 'Eat lunch',              category: 'Midday',   defaultTime: '13:00', reward: 2,  emoji: '🥗' },
  { id: 'walk',        title: 'Afternoon walk',         category: 'Midday',   defaultTime: '13:30', reward: 2,  emoji: '🚶' },
  { id: 'cook_dinner', title: 'Cook dinner',            category: 'Evening',  defaultTime: '18:30', reward: 5,  emoji: '🍽️' },
  { id: 'clean',       title: 'Clean up / tidy home',   category: 'Evening',  defaultTime: '19:30', reward: 3,  emoji: '🧹' },
  { id: 'read',        title: 'Read for 20 mins',       category: 'Night',    defaultTime: '21:00', reward: 2,  emoji: '📚' },
  { id: 'no_screens',  title: 'No screens after 10pm',  category: 'Night',    defaultTime: '22:00', reward: 2,  emoji: '📵' },
  { id: 'sleep',       title: 'Lights out / sleep',     category: 'Night',    defaultTime: '22:30', reward: 1,  emoji: '😴' },
];

export const SPECIAL_TASK_PRESETS: PresetTask[] = [
  { id: 'sp_travel',    title: 'Go somewhere new today',          category: 'Special', defaultTime: '', reward: 15, emoji: '✈️' },
  { id: 'sp_social',    title: 'Call someone you miss',           category: 'Special', defaultTime: '', reward: 5,  emoji: '📞' },
  { id: 'sp_learn',     title: 'Learn one new thing',             category: 'Special', defaultTime: '', reward: 7,  emoji: '🎓' },
  { id: 'sp_creative',  title: 'Do something creative',           category: 'Special', defaultTime: '', reward: 7,  emoji: '🎨' },
  { id: 'sp_kind',      title: 'Random act of kindness',          category: 'Special', defaultTime: '', reward: 8,  emoji: '🤝' },
  { id: 'sp_brave',     title: 'Do something that scares you',    category: 'Special', defaultTime: '', reward: 15, emoji: '🦁' },
  { id: 'sp_cook_new',  title: 'Cook a brand new recipe',         category: 'Special', defaultTime: '', reward: 7,  emoji: '👨‍🍳' },
  { id: 'sp_outside',   title: 'Spend 1hr in nature',             category: 'Special', defaultTime: '', reward: 7,  emoji: '🌿' },
  { id: 'sp_declutter', title: 'Declutter one area of your life', category: 'Special', defaultTime: '', reward: 10, emoji: '🗑️' },
  { id: 'sp_journal',   title: 'Write in your journal',           category: 'Special', defaultTime: '', reward: 5,  emoji: '📓' },
];
