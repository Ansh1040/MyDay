// Periodic checks while the app is running: timers, capsule availability, return-ticket nudges and (web only) reminders.
// On Android these are ALSO scheduled natively (see notify.ts scheduleAt/scheduleWeekly) so they fire when the app is closed.
import { useEffect } from 'react';
import { useStore } from '../store/store';
import { notifyNow, initNotificationTaps, scheduleWeekly, cancelScheduled } from './notify';
import { refUrl, startTimerEngine } from './timers';
import { isNative } from './platform';
import { todayKey } from './id';
import { navigate } from './router';
import type { Reminder } from '../data/types';

function tick() {
  const s = useStore.getState();
  const now = new Date();

  Object.values(s.capsules).forEach((c) => {
    if (!c.openedAt && !c.notified && new Date(c.opensAt) <= now) {
      s.patch('capsules', c.id, { notified: true });
      if (c.nativeId == null) notifyNow('capsules', 'A capsule is ready to open', `“${c.title}” — sealed ${new Date(c.sealedAt).toLocaleDateString()}.`, { url: `/capsule/${c.id}` });
    }
  });

  Object.values(s.tickets).forEach((t) => {
    if (!t.resolvedAt && t.remindAt && !t.reminded && new Date(t.remindAt) <= now) {
      s.patch('tickets', t.id, { reminded: true });
      if (t.nativeId == null) notifyNow('tickets', 'Pick up where you left off', `${t.title}: ${t.next || t.stoppedAt}`, { url: '/tickets' });
    }
  });

  // Web reminders: only fire while the app is open. Android uses native weekly schedules instead.
  if (!isNative()) {
    const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const day = todayKey(now);
    Object.values(s.reminders).forEach((r) => {
      if (r.enabled && r.days.includes(now.getDay()) && r.lastFiredOn !== day && hm >= r.time) {
        const [h, m] = r.time.split(':').map(Number);
        // Only fire if we're within 30 minutes of the reminder time (avoid firing stale reminders on late app open).
        if (now.getHours() * 60 + now.getMinutes() - (h * 60 + m) <= 30) notifyNow('reminders', 'Reminder', r.label, { url: r.target ? refUrl(r.target) : '/discover' });
        s.patch('reminders', r.id, { lastFiredOn: day });
      }
    });
  }
}

/** (Re)schedule a reminder natively on Android. Safe to call on web (no-op). */
export async function syncReminderNative(r: Reminder) {
  if (!isNative()) return;
  await cancelScheduled(r.nativeIds ?? []);
  if (!r.enabled) {
    useStore.getState().patch('reminders', r.id, { nativeIds: [] });
    return;
  }
  const [h, m] = r.time.split(':').map(Number);
  const ids: number[] = [];
  for (const d of r.days) {
    const id = await scheduleWeekly('reminders', 'Elsewhere', r.label, d, h, m, r.target ? refUrl(r.target) : '/discover');
    if (id != null) ids.push(id);
  }
  useStore.getState().patch('reminders', r.id, { nativeIds: ids });
}

export function useBackgroundChecks() {
  useEffect(() => {
    const stopTimers = startTimerEngine();
    initNotificationTaps((url) => navigate(url));
    tick();
    const iv = setInterval(tick, 20000);
    const onVis = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stopTimers();
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
}
