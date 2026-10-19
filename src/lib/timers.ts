// Timers are stored as timestamps (startedAt + remainingMs) so they stay accurate across navigation,
// backgrounding and even app restarts. A 1s engine loop detects completion while the app runs;
// on Android a native notification is also scheduled for the end time so it fires if the app is closed.
import { useEffect, useState } from 'react';
import { useStore } from '../store/store';
import type { Ref, TimerState } from '../data/types';
import { cancelScheduled, chime, notifyNow, scheduleAt } from './notify';
import { haptic } from './platform';

export const remaining = (t: TimerState, now = Date.now()) =>
  t.status === 'running' && t.startedAt ? Math.max(0, t.remainingMs - (now - t.startedAt)) : t.remainingMs;

const get = (id: string) => useStore.getState().timers[id];
const put = (t: TimerState) => useStore.getState().upsert('timers', t);

/** Create (or reset) a timer definition without starting it. */
export function ensureTimer(id: string, label: string, minutes: number, ref?: Ref) {
  const t = get(id);
  const durationMs = Math.round(minutes * 60000);
  if (!t || (t.status === 'idle' && t.durationMs !== durationMs)) put({ id, label, ref, durationMs, remainingMs: durationMs, status: 'idle' });
}

export async function startTimer(id: string) {
  const t = get(id);
  if (!t || t.status === 'running') return;
  const base = t.status === 'done' ? t.durationMs : t.remainingMs;
  const startedAt = Date.now();
  const next: TimerState = { ...t, status: 'running', startedAt, remainingMs: base };
  put(next);
  const nativeId = await scheduleAt('timers', 'Timer finished', `${t.label} is complete.`, new Date(startedAt + base), t.ref ? refUrl(t.ref) : undefined);
  attachNative(id, next, nativeId);
}

/** Store the scheduled native notification on the timer — unless it was paused/reset/changed while scheduling. */
function attachNative(id: string, scheduledFor: TimerState, nativeId: number | null) {
  if (nativeId == null) return;
  const cur = get(id);
  if (cur?.status === 'running' && cur.startedAt === scheduledFor.startedAt && cur.remainingMs === scheduledFor.remainingMs && cur.nativeNotificationId == null)
    useStore.getState().patch('timers', id, { nativeNotificationId: nativeId });
  else cancelScheduled([nativeId]);
}

export function pauseTimer(id: string) {
  const t = get(id);
  if (!t || t.status !== 'running') return;
  cancelScheduled([t.nativeNotificationId]);
  put({ ...t, status: 'paused', remainingMs: remaining(t), startedAt: undefined, nativeNotificationId: undefined });
}

export function resetTimer(id: string) {
  const t = get(id);
  if (!t) return;
  cancelScheduled([t.nativeNotificationId]);
  put({ ...t, status: 'idle', remainingMs: t.durationMs, startedAt: undefined, nativeNotificationId: undefined });
}

export function addTime(id: string, minutes: number) {
  const t = get(id);
  if (!t) return;
  const delta = minutes * 60000;
  if (t.status === 'running') {
    cancelScheduled([t.nativeNotificationId]);
    put({ ...t, remainingMs: t.remainingMs + delta, durationMs: t.durationMs + delta, nativeNotificationId: undefined });
    const nt = get(id)!;
    scheduleAt('timers', 'Timer finished', `${t.label} is complete.`, new Date(Date.now() + remaining(nt)), t.ref ? refUrl(t.ref) : undefined).then((nid) => attachNative(id, nt, nid));
  } else put({ ...t, remainingMs: (t.status === 'done' ? 0 : t.remainingMs) + delta, durationMs: t.durationMs + delta, status: t.status === 'done' ? 'paused' : t.status });
}

export function removeTimer(id: string) {
  const t = get(id);
  if (t) cancelScheduled([t.nativeNotificationId]);
  useStore.getState().remove('timers', id);
}

export function refUrl(ref: Ref): string {
  switch (ref.kind) {
    case 'experience': return `/x/${ref.id}`;
    case 'rabbit': return `/rabbit/${ref.id}`;
    case 'rabbitNode': { const [rid, nid] = ref.id.split('/'); return `/rabbit/${rid}?node=${nid}`; }
    case 'skill': return `/skill/${ref.id}`;
    case 'note': return `/note/${ref.id}`;
    case 'entry': return `/entry/${ref.id}`;
    case 'capsule': return `/capsule/${ref.id}`;
    case 'twist': return `/twist?id=${ref.id}`;
    case 'quest': return `/quest/${ref.id}`;
    case 'collection': return `/collection/${ref.id}`;
    case 'perspective': return `/perspective/${ref.id}`;
    case 'topic': return `/topic/${ref.id}`;
    default: return '/discover';
  }
}

/** Engine: call once at app start. Detects completions, including ones that happened while backgrounded. */
export function startTimerEngine() {
  const check = () => {
    const timers = useStore.getState().timers;
    Object.values(timers).forEach((t) => {
      if (t.status === 'running' && remaining(t) <= 0) {
        put({ ...t, status: 'done', remainingMs: 0, startedAt: undefined });
        chime();
        if (useStore.getState().settings.haptics) haptic(200);
        // On Android the scheduled native notification already fired if we were in the background.
        if (t.nativeNotificationId == null) notifyNow('timers', 'Timer finished', `${t.label} is complete.`, { url: t.ref ? refUrl(t.ref) : undefined });
        else if (document.visibilityState === 'visible') notifyNow('timers', 'Timer finished', `${t.label} is complete.`);
      }
    });
  };
  check();
  const iv = setInterval(check, 1000);
  document.addEventListener('visibilitychange', check);
  return () => {
    clearInterval(iv);
    document.removeEventListener('visibilitychange', check);
  };
}

/** Re-render every `ms` while `active`. */
export function useNow(active: boolean, ms = 250) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const iv = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(iv);
  }, [active, ms]);
  return now;
}
