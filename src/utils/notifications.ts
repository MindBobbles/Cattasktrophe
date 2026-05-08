// Browser Notification API wrapper — web-only, gracefully no-ops on native.

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const p = await Notification.requestPermission();
  return p === 'granted';
}

export function sendNotification(title: string, body: string, tag?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try { new Notification(title, { body, tag, icon: '/favicon.ico' }); }
  catch { /* silently ignore */ }
}

let nightlyTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleNightlyReminder() {
  if (nightlyTimer) clearTimeout(nightlyTimer);
  const now = new Date();
  const target = new Date();
  target.setHours(21, 0, 0, 0);
  if (now >= target) target.setDate(target.getDate() + 1);
  const ms = target.getTime() - now.getTime();
  nightlyTimer = setTimeout(() => {
    sendNotification(
      '🌙 Plan tomorrow with your cat!',
      "Tomorrow's tasks aren't set yet. Don't let your cat starve overnight!",
      'nightly-plan'
    );
    scheduleNightlyReminder();
  }, ms);
}
