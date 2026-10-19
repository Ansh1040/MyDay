// Notifications. Two very different capabilities, kept explicit:
//  • Android app (Capacitor LocalNotifications): can schedule notifications that fire while the app is CLOSED.
//  • Web/PWA: can only show notifications while the app is open or backgrounded in a tab (no push server exists).
import { LocalNotifications } from '@capacitor/local-notifications';
import { isNative } from './platform';
import { useStore } from '../store/store';
import { toast } from '../components/ui';

export type NotifyCategory = 'timers' | 'reminders' | 'capsules' | 'shared' | 'tickets';
export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export async function getPermission(): Promise<PermissionState> {
  if (isNative()) {
    try {
      const p = await LocalNotifications.checkPermissions();
      return p.display === 'granted' ? 'granted' : p.display === 'denied' ? 'denied' : 'prompt';
    } catch {
      return 'unsupported';
    }
  }
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission === 'default' ? 'prompt' : (Notification.permission as PermissionState);
}

/** Call only in response to a user action that needs notifications (contextual permission). */
export async function requestPermission(): Promise<PermissionState> {
  if (isNative()) {
    try {
      const p = await LocalNotifications.requestPermissions();
      return p.display === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'unsupported';
    }
  }
  if (!('Notification' in window)) return 'unsupported';
  const r = await Notification.requestPermission();
  return r === 'default' ? 'prompt' : (r as PermissionState);
}

/** True if background (app-closed) scheduling is available on this platform. */
export const canScheduleWhileClosed = () => isNative();

export function inQuietHours(d = new Date()) {
  const n = useStore.getState().settings.notifications;
  if (!n.quietEnabled) return false;
  const mins = d.getHours() * 60 + d.getMinutes();
  const [sh, sm] = n.quietStart.split(':').map(Number);
  const [eh, em] = n.quietEnd.split(':').map(Number);
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  return s <= e ? mins >= s && mins < e : mins >= s || mins < e;
}

const enabled = (c: NotifyCategory) => useStore.getState().settings.notifications[c];

/** Show a notification now. Falls back to an in-app toast when visible, not permitted, or in quiet hours. */
export async function notifyNow(category: NotifyCategory, title: string, body: string, opts: { url?: string; silentToast?: boolean } = {}) {
  if (!enabled(category)) return;
  const visible = document.visibilityState === 'visible';
  const perm = await getPermission();
  if (!visible && perm === 'granted' && !inQuietHours()) {
    try {
      if (isNative()) {
        await LocalNotifications.schedule({ notifications: [{ id: nid(), title, body, extra: { url: opts.url } }] });
        return;
      }
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) await reg.showNotification(title, { body, icon: './icon-192.png', badge: './icon-192.png', data: { url: opts.url }, tag: category });
      else new Notification(title, { body, icon: './icon-192.png' });
      return;
    } catch (e) {
      console.warn('notification failed', e);
    }
  }
  if (opts.silentToast) return;
  const show = () => toast(`${title} — ${body}`);
  if (document.visibilityState === 'visible') return show();
  // Hidden and no system notification was shown: show the toast when the person comes back, not while nobody sees it.
  const onVis = () => {
    if (document.visibilityState !== 'visible') return;
    document.removeEventListener('visibilitychange', onVis);
    show();
  };
  document.addEventListener('visibilitychange', onVis);
}

let counter = Math.floor(Date.now() / 1000) % 100000;
const nid = () => ++counter;

/** Android only: schedule a notification for a future time (fires even if the app is closed). Returns the id or null. */
export async function scheduleAt(category: NotifyCategory, title: string, body: string, at: Date, url?: string): Promise<number | null> {
  if (!isNative() || !enabled(category)) return null;
  if ((await getPermission()) !== 'granted') return null;
  const id = nid();
  try {
    await LocalNotifications.schedule({ notifications: [{ id, title, body, schedule: { at, allowWhileIdle: true }, extra: { url } }] });
    return id;
  } catch (e) {
    console.warn(e);
    return null;
  }
}

/** Android only: weekly repeating notification (used for reminders). weekday 0=Sun..6=Sat */
export async function scheduleWeekly(category: NotifyCategory, title: string, body: string, weekday: number, hour: number, minute: number, url?: string) {
  if (!isNative() || !enabled(category)) return null;
  if ((await getPermission()) !== 'granted') return null;
  const id = nid();
  try {
    // Capacitor weekday: 1 = Sunday … 7 = Saturday
    await LocalNotifications.schedule({ notifications: [{ id, title, body, schedule: { on: { weekday: weekday + 1, hour, minute }, allowWhileIdle: true }, extra: { url } }] });
    return id;
  } catch (e) {
    console.warn(e);
    return null;
  }
}

export async function cancelScheduled(ids: (number | undefined | null)[]) {
  const list = ids.filter((x): x is number => typeof x === 'number');
  if (!isNative() || !list.length) return;
  try {
    await LocalNotifications.cancel({ notifications: list.map((id) => ({ id })) });
  } catch {
    /* ignore */
  }
}

/** Route taps on notifications into the app. */
export function initNotificationTaps(go: (url: string) => void) {
  if (isNative()) {
    LocalNotifications.addListener('localNotificationActionPerformed', (a) => {
      const url = (a.notification.extra as { url?: string } | undefined)?.url;
      if (url) go(url);
    }).catch(() => {});
  } else {
    navigator.serviceWorker?.addEventListener('message', (e) => {
      if (e.data?.type === 'open' && e.data.url) go(e.data.url);
    });
  }
}

/** Soft chime used on timer completion (respects the sound setting). */
export function chime() {
  if (!useStore.getState().settings.sound) return;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    [660, 880, 990].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.type = 'sine';
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.65);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    /* audio unavailable */
  }
}
